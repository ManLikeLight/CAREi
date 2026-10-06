import { Router } from "express";
import bcrypt from "bcryptjs";
import { rows, transaction, id, token, digest, audit } from "./store";
import { COOKIE, setCookie, clearCookie, trustedIdentity, unavailable } from "./auth";

export const authRoutes = Router();
const attempts = new Map<string,{count:number;until:number}>();
authRoutes.use((req,res,next) => {
  if (req.method !== "POST") {next();return;}
  const key = String(req.ip);
  const now=Date.now(); const entry=attempts.get(key);
  if (entry && entry.until>now && entry.count>=30) {res.status(429).json({error:"Too many attempts. Try again in 15 minutes."});return;}
  if (attempts.size>10000) attempts.clear();
  attempts.set(key,{count:entry && entry.until>now ? entry.count+1 : 1,until:entry && entry.until>now ? entry.until : now+900000});next();
});
async function session(person:{id:string;agency_id:string},res:import("express").Response) {
  const raw=token();
  await rows("INSERT INTO ctp_session(id,agency_id,trusted_person_id,token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 minutes')",[id(),person.agency_id,person.id,digest(raw)]);
  setCookie(res,raw);res.json({ok:true});
}
authRoutes.get("/session",async(req,res)=>{
  const person=await trustedIdentity(req);
  if (!person) {if(req.cookies?.[COOKIE]) unavailable(res); else res.status(401).json({error:"Sign in to Close to Home."});return;}
  res.json({person:{id:person.id,name:person.name},sampleOnly:true});
});
authRoutes.post("/activate",async(req,res)=>{
  const {code:invite,password}=req.body??{};
  if(typeof invite!=="string" || typeof password!=="string" || password.length<8 || password.length>128) {res.status(400).json({error:"A valid invitation and password of 8–128 characters are required."});return;}
  const hash=await bcrypt.hash(password,12);
  const person=await transaction(async tx=>{
    const [inv]=await rows(`SELECT * FROM ctp_invite WHERE token_hash=$1 AND redeemed_at IS NULL AND expires_at>now() FOR UPDATE`,[digest(invite)],tx);
    if(!inv) return null;
    const [active]=await rows("SELECT id FROM ctp_client_trusted_person WHERE trusted_person_id=$1 AND agency_id=$2 AND status='active' AND (expires_at IS NULL OR expires_at>now())",[inv.trusted_person_id,inv.agency_id],tx);
    if(!active) return null;
    await rows("UPDATE ctp_trusted_person SET password_hash=$1,login_status='active',updated_at=now() WHERE id=$2 AND agency_id=$3",[hash,inv.trusted_person_id,inv.agency_id],tx);
    await rows("UPDATE ctp_invite SET redeemed_at=now() WHERE trusted_person_id=$1 AND agency_id=$2 AND redeemed_at IS NULL",[inv.trusted_person_id,inv.agency_id],tx);
    await rows("UPDATE ctp_session SET revoked_at=now() WHERE trusted_person_id=$1 AND agency_id=$2",[inv.trusted_person_id,inv.agency_id],tx);
    await audit(inv.agency_id,"trusted_person",inv.trusted_person_id,"invitation_redeemed",active.id,undefined,tx);
    return {id:inv.trusted_person_id as string,agency_id:inv.agency_id as string};
  });
  if(!person){unavailable(res);return;} await session(person,res);
});
authRoutes.post("/login",async(req,res)=>{
  const {email,password,agency}=req.body??{};
  if(typeof email!=="string" || typeof password!=="string" || password.length>128){res.status(400).json({error:"Email and password are required."});return;}
  const people=await rows("SELECT id,agency_id,password_hash FROM ctp_trusted_person WHERE email=$1 AND login_status='active' AND ($2::text IS NULL OR agency_id=$2)",[email.trim().toLowerCase(),typeof agency==="string"?agency:null]);
  const matches=[];
  for(const p of people)if(p.password_hash&&await bcrypt.compare(password,p.password_hash))matches.push(p);
  if(matches.length>1){res.status(400).json({error:"Use your agency's Close to Home sign-in link for this email."});return;}
  for(const p of matches){
    const [active]=await rows("SELECT id FROM ctp_client_trusted_person WHERE trusted_person_id=$1 AND agency_id=$2 AND status='active' AND (expires_at IS NULL OR expires_at>now())",[p.id,p.agency_id]);
    if(!active){unavailable(res);return;} await session(p as {id:string;agency_id:string},res);return;
  }
  res.status(401).json({error:"Email or password not recognised."});
});
authRoutes.post("/logout",async(req,res)=>{
  if(req.cookies?.[COOKIE]) await rows("UPDATE ctp_session SET revoked_at=now() WHERE token_hash=$1",[digest(req.cookies[COOKIE])]);
  clearCookie(res);res.json({ok:true});
});
