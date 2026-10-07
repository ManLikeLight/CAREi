import test from "node:test";
import assert from "node:assert/strict";
import Database from "@replit/database";
import { randomUUID } from "node:crypto";
import app from "../src/app";
import { issueAssistantSession } from "../src/assistant-session";
import { rows, token, digest, id } from "../src/ctp/store";
import { queueStory,settleStoryWorker,escalateConcerns,missedVisitNotifications } from "../src/ctp/jobs";

test("Close to Home acceptance journey: permissions, isolation, invite, story, concern, suspension and revocation",{timeout:120000},async()=>{
  const agency=`ctp-test-${randomUUID()}`,email=`manager-${randomUUID()}@example.test`;
  const database=new Database();
  await database.set(`carer_${email}`,{email,name:"Sample Manager",agency,role:"manager",deactivated:false});
  const bearer=issueAssistantSession({email,name:"Sample Manager",agency,role:"manager"});
  const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No test port");
  const base=`http://127.0.0.1:${address.port}/api/ctp`;
  async function request(path:string,method="GET",body?:unknown,credential?:string,staff=false,csrf=true){
    const r=await fetch(base+path,{method,headers:{...(csrf?{"X-CTP-Request":"1"}:{}),"Content-Type":"application/json",...(staff?{Authorization:`Bearer ${credential??bearer}`} : credential?{Cookie:credential}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:r.status,data:await r.json(),cookie:r.headers.get("set-cookie")?.split(";")[0],cache:r.headers.get("cache-control")};
  }
  async function manager(path:string,method="GET",body?:unknown){return request(path,method,body,bearer,true);}
  async function invite(name:string,presetId?:string){
    const r=await manager(`/clients/${clientId}/trusted-people`,"POST",{name,email:`${name.toLowerCase()}@example.test`,phone:"sample",relationship:"daughter",authorityType:"other",authorityEvidenceRef:"fictional-consent",presetId});
    assert.equal(r.status,201,JSON.stringify(r.data));assert.equal("inviteUrl" in r.data,false);return r.data;
  }
  let clientId="";
  try{
    assert.equal((await request("/manager","GET",undefined,bearer,true,false)).status,403);
    assert.equal((await manager("/jobs/escalate","POST")).status,403);
    assert.equal((await request("/manager","GET",undefined,issueAssistantSession({email,name:"Sample",agency,role:"carer"}),true)).status,403);
    assert.equal((await manager("/sample/setup","POST")).status,200);
    await settleStoryWorker();
    const m=(await manager("/manager")).data;clientId=m.clients[0].id;
    const primary=m.presets.find((p:{name:string})=>p.name==="Primary Trusted Person").id;
    const limited=m.presets.find((p:{name:string})=>p.name==="Limited Trusted Person").id;
    const sarah=await invite("Sarah",primary),john=await invite("John",limited),zero=await invite("Zero");
    const fixtureCodes=new Map<string,string>();
    const activate=async(inv:{link:{id:string}})=>{
      // This acceptance fixture does not send mail. Approved delivery itself is
      // covered by close-to-home-invites.test.ts with the real transaction path.
      const code=token();fixtureCodes.set(inv.link.id,code);
      const [link]=await rows("SELECT l.trusted_person_id,p.email FROM ctp_client_trusted_person l JOIN ctp_trusted_person p ON p.id=l.trusted_person_id AND p.agency_id=l.agency_id WHERE l.id=$1 AND l.agency_id=$2",[inv.link.id,agency]);
      await rows("INSERT INTO ctp_invite(id,agency_id,trusted_person_id,token_hash,expires_at,delivered_at,recipient_email_hash) VALUES($1,$2,$3,$4,now()+interval '24 hours',now(),$5)",[id(),agency,link.trusted_person_id,digest(code),digest(link.email)]);
      const r=await request("/auth/activate","POST",{code,password:"Fictional-password-729!"});
      assert.equal(r.status,200);assert.ok(r.cookie);return r.cookie!;
    };
    let sarahCookie=await activate(sarah),johnCookie=await activate(john),zeroCookie=await activate(zero);
    assert.equal((await request("/auth/activate","POST",{code:fixtureCodes.get(sarah.link.id),password:"Fictional-password-729!"})).status,403);
    const todayPath=`/me/clients/${clientId}/today`;
    let result=await request(todayPath,"GET",undefined,sarahCookie);
    assert.equal(result.status,200);assert.match(result.cache!,/no-store/);assert.ok(result.data.medication.length);assert.ok(result.data.story.some((s:string)=>s.includes("Medication")));
    const johnToday=(await request(todayPath,"GET",undefined,johnCookie)).data;
    assert.equal("medication" in johnToday,false);assert.equal(JSON.stringify(johnToday).includes("scheduled dose"),false);
    assert.deepEqual((await request(todayPath,"GET",undefined,zeroCookie)).data,{});
    assert.equal((await request("/me/clients/not-their-client/today","GET",undefined,sarahCookie)).status,403);
    const settings=m.settings;
    await manager("/settings","PATCH",{carerIdentityEnabled:true});
    await manager(`/carers/${m.carers[0].id}/privacy`,"PATCH",{showName:true,showPhoto:false});
    assert.equal((await request(todayPath,"GET",undefined,sarahCookie)).data.visits[0].carer.label,"Alex (sample carer)");
    const all=(await manager("/manager")).data.links;
    const flags=all.find((l:{id:string})=>l.id===sarah.link.id).permissions.medication;
    assert.equal((await manager(`/links/${sarah.link.id}/permissions`,"PATCH",{permissions:{medication:{...flags,can_view:false,can_notify:true}}})).status,400);
    assert.equal((await manager(`/links/${sarah.link.id}/permissions`,"PATCH",{permissions:{medication:{...flags,client_restricted:true}}})).status,200);
    assert.equal((await request(todayPath,"GET",undefined,sarahCookie)).status,403);
    const login=async(who:string)=>{const r=await request("/auth/login","POST",{email:`${who}@example.test`,password:"Fictional-password-729!",agency});assert.equal(r.status,200);return r.cookie!;};
    sarahCookie=await login("sarah");
    assert.equal("medication" in (await request(todayPath,"GET",undefined,sarahCookie)).data,false);
    assert.equal((await manager(`/links/${sarah.link.id}/preset`,"POST",{presetId:primary})).status,200);
    assert.equal((await manager("/manager")).data.links.find((l:{id:string})=>l.id===sarah.link.id).permissions.medication.client_restricted,true);
    assert.equal((await manager(`/links/${sarah.link.id}/permissions`,"PATCH",{permissions:{medication:{...flags,client_restricted:false}}})).status,400);
    assert.equal((await manager(`/links/${sarah.link.id}/permissions`,"PATCH",{permissions:{medication:{...flags,client_restricted:false}},changedWishesReason:"Fictional revised wishes recorded"})).status,200);
    sarahCookie=await login("sarah");
    const visits=(await manager("/manager/visits")).data.visits;
    const visit=visits[0];
    const before=await rows("SELECT count(*)::int n FROM ctp_story WHERE visit_id=$1",[visit.id]);
    await queueStory(agency,visit.id);await settleStoryWorker();
    assert.equal((await rows("SELECT count(*)::int n FROM ctp_story WHERE visit_id=$1",[visit.id]))[0].n,before[0].n);
    const source=(await manager(`/manager/visits/${visit.id}`)).data.sources.find((s:{category:string})=>s.category==="medication");
    assert.equal((await manager(`/sources/${source.id}`,"PATCH",{value:"scheduled dose recorded as declined"})).status,200);
    await settleStoryWorker();
    const versions=await rows("SELECT status,version FROM ctp_story WHERE visit_id=$1 ORDER BY version",[visit.id]);
    assert.equal(versions.length,2);assert.equal(versions[0].status,"superseded");assert.equal(versions[1].status,"current");
    const after=(await request(todayPath,"GET",undefined,sarahCookie));
    assert.equal(after.status,200,JSON.stringify(after.data));
    assert.ok(after.data.story.includes("Medication record: scheduled dose recorded as declined."));
    const concern=await request(`/me/clients/${clientId}/concerns`,"POST",{reasonCode:"quieter_than_usual",detail:"Fictional concern"},johnCookie);
    assert.equal(concern.status,201);
    const visible=(await request("/me/concerns","GET",undefined,johnCookie)).data.concerns[0];
    assert.deepEqual(Object.keys(visible).sort(),["acknowledgedAt","createdAt","id","resolvedAt","status"]);
    assert.equal((await request(`/me/clients/${clientId}/concerns`,"POST",{reasonCode:"other",detail:"Not allowed"},zeroCookie)).status,403);
    await rows("UPDATE ctp_concern SET ack_due_at=now()-interval '2 hours' WHERE id=$1",[concern.data.id]);
    await escalateConcerns();
    await rows("UPDATE ctp_concern SET escalated_at=now()-interval '2 hours' WHERE id=$1",[concern.data.id]);
    await escalateConcerns();
    const [escalated]=await rows("SELECT escalated_at,second_escalated_at FROM ctp_concern WHERE id=$1",[concern.data.id]);assert.ok(escalated.escalated_at&&escalated.second_escalated_at);
    assert.equal((await manager(`/concerns/${concern.data.id}`,"PATCH",{status:"reviewing"})).status,200);
    assert.equal((await manager(`/concerns/${concern.data.id}`,"PATCH",{status:"resolved",resolutionNote:"Fictional agency response recorded"})).status,200);
    assert.equal((await request("/me/concerns","GET",undefined,johnCookie)).data.concerns[0].status,"resolved");
    await rows("UPDATE ctp_sample_visit SET status='missed' WHERE id=$1",[visit.id]);await missedVisitNotifications();
    const notifications=await rows("SELECT * FROM ctp_notification WHERE agency_id=$1",[agency]);
    assert.ok(notifications.some(n=>n.type==="visit_missed"));assert.ok(notifications.every(n=>n.text==="There is an update in Close to Home."&&n.status==="sample_only"&&n.recipient_type!=="carer"));
    assert.equal((await manager(`/links/${john.link.id}/status`,"PATCH",{status:"suspended",reason:"Fictional confidential reason"})).status,200);
    const denied=await request(todayPath,"GET",undefined,johnCookie);
    assert.equal(denied.status,403);assert.equal(denied.data.error,"Access unavailable, please contact the agency.");assert.equal(JSON.stringify(denied.data).includes("confidential"),false);
    await manager(`/links/${john.link.id}/status`,"PATCH",{status:"active",reason:"Fictional reactivation"});
    assert.equal((await request(todayPath,"GET",undefined,johnCookie)).status,403);
    johnCookie=await login("john");
    await manager(`/links/${john.link.id}/status`,"PATCH",{status:"revoked",reason:"Fictional revocation"});
    assert.equal((await request(todayPath,"GET",undefined,johnCookie)).status,403);
    await rows("UPDATE ctp_client_trusted_person SET expires_at=now()-interval '1 minute' WHERE id=$1",[zero.link.id]);
    assert.equal((await request(todayPath,"GET",undefined,zeroCookie)).status,403);
    await database.set(`carer_${email}`,{email,agency,role:"manager",deactivated:true});
    assert.equal((await manager("/manager")).status,403);
    const audits=await rows("SELECT action FROM ctp_access_audit WHERE agency_id=$1",[agency]);
    for(const action of ["today_viewed","story_regenerated","concern_received","concern_reviewing","concern_resolved"])assert.ok(audits.some(a=>a.action===action),action);
    void settings;
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    await settleStoryWorker();
    // Only this test's isolated fictional tenant, in dependency order.
    for(const table of ["ctp_notification","ctp_story_sentence_source","ctp_story_sentence","ctp_story","ctp_story_job","ctp_verified_source","ctp_concern","ctp_permission","ctp_session","ctp_invite","ctp_client_trusted_person","ctp_sample_visit","ctp_carer_privacy","ctp_access_preset","ctp_sample_client","ctp_trusted_person","ctp_access_audit","ctp_agency_settings"]){
      await rows(`DELETE FROM ${table} WHERE agency_id=$1`,[agency]);
    }
    await database.delete(`carer_${email}`);
  }
});
