import test, { after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import Database from "@replit/database";
import { pool } from "@workspace/db";
import { rows, id, token, digest } from "../src/ctp/store";
import { issueAssistantSession } from "../src/assistant-session";
import { createCloseToHomeRouter } from "../src/routes/close-to-home";
import { createPrivateInviteDelivery, providerConfigured, verifiedDestinations, sendPrivateEmail } from "../src/ctp/invite-delivery";

after(()=>pool.end());
const fixture=(agency="test",personId="person")=>({
  CTP_INVITE_DELIVERY_APPROVED:"true",RESEND_API_KEY:"test-only-not-a-real-key",
  CTP_INVITE_EMAIL_FROM:"CAREi <invite@example.test>",
  CTP_INVITE_OPERATORS:JSON.stringify([{agencyId:agency,email:"operator@example.test"}]),
  CTP_INVITE_OPERATOR_KEY:"test-operator-approval-only-".repeat(3),
  CTP_VERIFIED_INVITE_RECIPIENTS:JSON.stringify([{agencyId:agency,personId,email:"recipient@example.test",verifiedAt:new Date().toISOString()}]),
});

test("private delivery configuration and recent independent verification fail closed",async()=>{
  const env=fixture();
  assert.equal(providerConfigured(env),true);
  assert.equal(verifiedDestinations(env).length,1);
  for(const verifiedAt of ["",new Date(Date.now()+60_000).toISOString(),new Date(Date.now()-31*86400_000).toISOString()]){
    assert.equal(verifiedDestinations({...env,CTP_VERIFIED_INVITE_RECIPIENTS:JSON.stringify([{agencyId:"test",personId:"person",email:"recipient@example.test",verifiedAt}])}).length,0);
  }
  for(const value of ["not-json",'{"email":"attacker@example.test"}',JSON.stringify([{...verifiedDestinations(env)[0]},{...verifiedDestinations(env)[0]}])]){
    assert.deepEqual(verifiedDestinations({...env,CTP_VERIFIED_INVITE_RECIPIENTS:value}),[]);
  }
  assert.equal(providerConfigured({...env,CTP_INVITE_DELIVERY_APPROVED:"false"}),false);
  assert.equal(providerConfigured({...env,RESEND_API_KEY:""}),false);
  assert.equal(providerConfigured({...env,CTP_INVITE_EMAIL_FROM:"injected\r\nsender@example.test"}),false);
  const delivery=createPrivateInviteDelivery(env);
  const operator={id:"operator@example.test",agency:"test",name:"Operator"};
  assert.equal(delivery.operatorApproved(operator),true);
  assert.equal(delivery.operatorApproved(operator,env.CTP_INVITE_OPERATOR_KEY),true);
  assert.equal(delivery.operatorApproved(operator,token()),false);
  assert.equal(delivery.operatorApproved({...operator,agency:"another"},env.CTP_INVITE_OPERATOR_KEY),false);
  assert.equal(delivery.operatorApproved({...operator,id:"ordinary@example.test"},env.CTP_INVITE_OPERATOR_KEY),false);
  const code=token();
  let calls=0;
  await assert.rejects(sendPrivateEmail(verifiedDestinations(env)[0],code,id(),env,async(url,init)=>{
    calls++;assert.equal(url,"https://api.resend.com/emails");
    const body=JSON.parse(String(init?.body));
    assert.deepEqual(body.to,["recipient@example.test"]);
    assert.ok(body.text.includes(code));assert.equal(body.text.includes("http"),false);
    assert.ok(init?.signal);
    return new Response(JSON.stringify({error:code}),{status:403});
  }),error=>error instanceof Error&&error.message==="Private invitation delivery unavailable.");
  assert.equal(calls,1);
});

test("Close to Home private issuance, atomic activation, isolation, safe resend and recovery",{timeout:120000},async()=>{
  const agency=`invite-test-${id()}`,personId=id(),clientId=id(),linkId=id();
  const email=`operator-${id()}@example.test`,ordinaryEmail=`manager-${id()}@example.test`;
  const env=fixture(agency,personId);
  env.CTP_INVITE_OPERATORS=JSON.stringify([{agencyId:agency,email}]);
  const database=new Database();
  for(const value of [email,ordinaryEmail])assert.ok((await database.set(`carer_${value}`,{email:value,agency,role:"manager",deactivated:false})).ok);
  const sent:string[]=[];
  let failed=false;
  const delivery=createPrivateInviteDelivery(env,async(_url,init)=>{
    const body=JSON.parse(String(init?.body));
    assert.deepEqual(body.to,["recipient@example.test"]);
    const code=body.text.match(/\n\n([A-Za-z0-9_-]{43})\n\n/)[1];
    sent.push(code);
    return new Response("",{status:failed?500:200});
  });
  await rows("INSERT INTO ctp_sample_client(id,agency_id,name,sample_only) VALUES($1,$2,'Fictional Client',true)",[clientId,agency]);
  await rows("INSERT INTO ctp_trusted_person(id,agency_id,name,email) VALUES($1,$2,'Fictional Person','profile@example.test')",[personId,agency]);
  await rows(`INSERT INTO ctp_client_trusted_person(id,agency_id,client_id,trusted_person_id,relationship,authority_type,authority_evidence_ref,authorised_by,review_due_at)
    VALUES($1,$2,$3,$4,'friend','other','test-evidence',$5,now()+interval '30 days')`,[linkId,agency,clientId,personId,email]);
  const oldCode=token();
  await rows("INSERT INTO ctp_invite(id,agency_id,trusted_person_id,token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')",[id(),agency,personId,digest(oldCode)]);
  const app=express();app.use(cookieParser());app.use(express.json());app.use("/api",createCloseToHomeRouter(delivery));
  const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  const address=server.address();assert.ok(address&&typeof address!=="string");
  const base=`http://127.0.0.1:${address.port}/api/ctp`;
  const staff=(value:string,agencyOverride=agency,role:"manager"|"carer"="manager")=>issueAssistantSession({email:value,agency:agencyOverride,name:"Fixture",role});
  async function request(path:string,body?:unknown,bearer?:string,cookie?:string,csrf="same-origin"){
    const r=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{
      "Content-Type":"application/json","X-CTP-Request":"1","Sec-Fetch-Site":csrf,
      ...(bearer?{Authorization:`Bearer ${bearer}`} : {}),...(cookie?{Cookie:cookie}:{}),
    },...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:r.status,data:await r.json(),cookie:r.headers.get("set-cookie")?.split(";")[0],retry:r.headers.get("retry-after")};
  }
  const issue=()=>request(`/links/${linkId}/invite`,{recipientVerified:true,operatorKey:env.CTP_INVITE_OPERATOR_KEY,email:"attacker@example.test"},staff(email));
  const activate=(code:string)=>request("/auth/activate",{code,password:"Fictional-password-742!"});
  const clearCooldown=()=>rows("UPDATE ctp_invite_delivery_state SET last_attempt_at=now()-interval '6 minutes' WHERE agency_id=$1",[agency]);
  try{
    assert.equal((await activate(oldCode)).status,403); // Old sample URL credential cannot activate.
    for(const bearer of [undefined,staff(ordinaryEmail),staff(email,agency,"carer"),staff(email,"another")]){
      assert.equal((await request(`/links/${linkId}/invite`,{recipientVerified:true,operatorKey:env.CTP_INVITE_OPERATOR_KEY},bearer)).status,403);
    }
    assert.equal((await request(`/links/${linkId}/invite`,{recipientVerified:true,operatorKey:token()},staff(email))).status,403);
    assert.equal((await request(`/links/${linkId}/invite`,{recipientVerified:false,operatorKey:env.CTP_INVITE_OPERATOR_KEY},staff(email))).status,400);
    assert.equal((await request(`/links/${linkId}/invite`,{recipientVerified:true,operatorKey:env.CTP_INVITE_OPERATOR_KEY},staff(email),undefined,"cross-site")).status,403);
    assert.equal((await request("/links/not-owned/invite",{recipientVerified:true,operatorKey:env.CTP_INVITE_OPERATOR_KEY},staff(email))).status,404);
    assert.equal(sent.length,0);
    const results=await Promise.all([issue(),issue()]);
    assert.deepEqual(results.map(r=>r.status).sort(),[202,429]);
    assert.equal(sent.length,1);
    assert.deepEqual(Object.keys(results.find(r=>r.status===202)!.data),["message"]);
    assert.equal(results.find(r=>r.status===429)!.retry,"300");
    const [stored]=await rows("SELECT * FROM ctp_invite WHERE token_hash=$1",[digest(sent[0])]);
    assert.ok(stored.delivered_at);assert.ok(new Date(stored.expires_at).getTime()-Date.now()>23*3600_000);
    assert.equal(Object.values(stored).includes(sent[0]),false);
    const expired=token();
    await rows(`INSERT INTO ctp_invite(id,agency_id,trusted_person_id,token_hash,expires_at,delivered_at,recipient_email_hash)
      VALUES($1,$2,$3,$4,now()-interval '1 minute',now(),$5)`,[id(),agency,personId,digest(expired),digest("recipient@example.test")]);
    assert.equal((await activate(expired)).status,403);
    // Concurrency against real bcrypt + DB activation: exactly one wins.
    const activated=await Promise.all([activate(sent[0]),activate(sent[0])]);
    assert.deepEqual(activated.map(r=>r.status).sort(),[200,403]);
    const cookie=activated.find(r=>r.status===200)!.cookie!;
    assert.ok(cookie);
    assert.equal((await request("/auth/session",undefined,undefined,cookie)).status,200);
    assert.equal((await request("/auth/login",{agency,email:"recipient@example.test",password:"Fictional-password-742!"})).status,200);
    assert.equal((await request("/auth/login",{agency,email:"profile@example.test",password:"Fictional-password-742!"})).status,401);
    await clearCooldown();
    assert.equal((await issue()).status,202);
    const replacement=sent[1];
    assert.equal((await request("/auth/session",undefined,undefined,cookie)).status,200); // Send does not log out.
    await clearCooldown();
    failed=true;
    assert.equal((await issue()).status,503);
    assert.equal((await rows("SELECT id FROM ctp_invite WHERE token_hash=$1",[digest(sent[2])])).length,0);
    assert.equal((await issue()).status,429); // Failure also consumes cooldown.
    const replaced=await activate(replacement);
    assert.equal(replaced.status,200);
    assert.equal((await request("/auth/session",undefined,undefined,cookie)).status,403); // Redeem revokes old sessions.
    failed=false;
    await clearCooldown();
    const before=sent.length;
    const unknown=await request("/auth/recover",{agency,email:"unknown@example.test"});
    const wrongAgency=await request("/auth/recover",{agency:"another",email:"recipient@example.test"});
    const profileEmail=await request("/auth/recover",{agency,email:"profile@example.test"});
    assert.deepEqual(unknown.data,wrongAgency.data);assert.deepEqual(unknown.data,profileEmail.data);
    assert.equal(sent.length,before);
    const known=await request("/auth/recover",{agency,email:"recipient@example.test"});
    assert.equal(known.status,202);assert.deepEqual(known.data,unknown.data);
    // Recovery responds before background delivery; wait only for its DB work.
    for(let n=0;n<100;n++){if((await rows("SELECT id FROM ctp_invite WHERE agency_id=$1 AND redeemed_at IS NULL AND delivered_at IS NOT NULL AND expires_at>now()",[agency])).length)break;await new Promise(r=>setTimeout(r,20));}
    assert.equal(sent.length,before+1);
    assert.equal((await activate(sent.at(-1)!)).status,200);
    await clearCooldown();
    await rows("UPDATE ctp_client_trusted_person SET status='suspended' WHERE id=$1",[linkId]);
    assert.equal(await delivery.send(agency,personId,email),"unavailable");
    assert.equal(sent.length,before+1);
    await database.set(`carer_${email}`,{email,agency,role:"manager",deactivated:true});
    assert.equal((await issue()).status,403);
    const audits=await rows("SELECT action FROM ctp_access_audit WHERE agency_id=$1",[agency]);
    assert.ok(audits.some(a=>a.action==="private_invite_sent"));
    assert.ok(audits.some(a=>a.action==="invitation_redeemed"));
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    for(const table of ["ctp_session","ctp_invite","ctp_invite_delivery_state","ctp_client_trusted_person","ctp_trusted_person","ctp_sample_client","ctp_access_audit"]){
      await rows(`DELETE FROM ${table} WHERE agency_id=$1`,[agency]);
    }
    await database.delete(`carer_${email}`);await database.delete(`carer_${ordinaryEmail}`);
  }
});
