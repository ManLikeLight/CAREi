import { Router } from "express";
import { staff, type Identity } from "./auth";
import { rows, transaction, audit, id, token, digest, can, notification } from "./store";
import { CATEGORIES, emptyFlags, type Flags, type Category } from "./permissions";
import { setupSample } from "./sample";
import { queueStory, kickStoryWorker, processStoryJobs, escalateConcerns, missedVisitNotifications } from "./jobs";
import { privateInviteDelivery, type PrivateInviteDelivery, RESEND_SECONDS } from "./invite-delivery";
import { SendVerifiedCtpInviteBody } from "@workspace/api-zod";

export function createManagerRoutes(invites: PrivateInviteDelivery = privateInviteDelivery) {
const managerRoutes=Router();
managerRoutes.use((req,res,next)=>{
  if(req.path.startsWith("/me/")||(/^\/clients\/[^/]+\/(today|concerns)$/.test(req.path))) {next("router");return;}
  void staff(req,res,next).catch(next);
});
const actor=(res:import("express").Response)=>res.locals.ctp as Identity;
const sampleEmail=(s:unknown)=>typeof s==="string" && /^[^@\s]+@(?:[^@\s]+\.(?:test|example)|example\.(?:com|org|net))$/i.test(s);
const nonempty=(s:unknown,max=200):s is string=>typeof s==="string"&&!!s.trim()&&s.length<=max;
async function linkFor(p:Identity,key:string,tx?:import("./store").Executor){return (await rows("SELECT * FROM ctp_client_trusted_person WHERE id=$1 AND agency_id=$2 FOR UPDATE",[key,p.agency],tx))[0];}
async function permissions(linkId:string) {
  const permissions=Object.fromEntries(CATEGORIES.map(c=>[c,emptyFlags()]));
  for(const f of await rows("SELECT * FROM ctp_permission WHERE client_trusted_person_id=$1",[linkId])) permissions[f.category]={can_view:f.can_view,can_contribute:f.can_contribute,can_notify:f.can_notify,client_restricted:f.client_restricted};
  return permissions;
}
const concernSql=`SELECT id,client_id AS "clientId",status,reason_code AS "reasonCode",detail,created_at AS "createdAt",ack_due_at AS "ackDueAt",acknowledged_at AS "acknowledgedAt",escalated_at AS "escalatedAt",resolved_at AS "resolvedAt",resolution_note AS "resolutionNote" FROM ctp_concern WHERE agency_id=$1 ORDER BY created_at DESC`;
managerRoutes.get("/manager",async(_req,res)=>{
  const p=actor(res);
  await rows("INSERT INTO ctp_agency_settings(agency_id) VALUES($1) ON CONFLICT DO NOTHING",[p.agency]);
  const links=await rows(`SELECT l.id,l.trusted_person_id AS "trustedPersonId",l.client_id AS "clientId",c.name AS "clientName",p.name AS "personName",p.email,l.relationship,l.authority_type AS "authorityType",l.status,l.review_due_at AS "reviewDueAt",l.expires_at AS "expiresAt"
    FROM ctp_client_trusted_person l JOIN ctp_trusted_person p ON p.id=l.trusted_person_id AND p.agency_id=l.agency_id JOIN ctp_sample_client c ON c.id=l.client_id AND c.agency_id=l.agency_id WHERE l.agency_id=$1 ORDER BY l.created_at`,[p.agency]);
  const [settings]=await rows(`SELECT carer_identity_enabled AS "carerIdentityEnabled",concern_ack_minutes AS "concernAckMinutes",concern_escalate_minutes AS "concernEscalateMinutes",escalation_contacts AS "escalationContacts" FROM ctp_agency_settings WHERE agency_id=$1`,[p.agency]);
  res.json({sampleOnly:true,agencyId:p.agency,inviteDelivery:{operatorApproved:invites.operatorApproved(p),configured:invites.configured()},clients:await rows("SELECT id,name FROM ctp_sample_client WHERE agency_id=$1",[p.agency]),
    links:await Promise.all(links.map(async l=>({...l,permissions:await permissions(l.id)}))),
    presets:await rows("SELECT id,name FROM ctp_access_preset WHERE agency_id=$1",[p.agency]),
    concerns:await rows(concernSql,[p.agency]),settings,
    overdueReviews:links.filter(l=>new Date(l.reviewDueAt)<new Date()&&l.status==="active").length,
    carers:await rows(`SELECT id,name,show_name AS "showName",show_photo AS "showPhoto" FROM ctp_carer_privacy WHERE agency_id=$1`,[p.agency]),
    notifications:await rows(`SELECT id,type,channel,status,text,created_at AS "createdAt" FROM ctp_notification WHERE agency_id=$1 ORDER BY created_at DESC LIMIT 100`,[p.agency])});
});
managerRoutes.post("/sample/setup",async(_req,res)=>res.json(await setupSample(actor(res))));
managerRoutes.post("/clients/:clientId/trusted-people",async(req,res)=>{
  const p=actor(res);const b=req.body??{};
  if(!nonempty(b.name)||!sampleEmail(b.email)||!nonempty(b.relationship)||!["none","lpa_health_welfare","deputy","client_self","other"].includes(b.authorityType)||!nonempty(b.authorityEvidenceRef)|| (b.expiresAt && (!Number.isFinite(Date.parse(b.expiresAt))||Date.parse(b.expiresAt)<=Date.now()))){
    res.status(400).json({error:"Use fictional details and an email at example.com or a .test domain. Name, relationship, authority and evidence are required; expiry must be in the future."});return;
  }
  const result=await transaction(async tx=>{
    const [client]=await rows("SELECT id FROM ctp_sample_client WHERE id=$1 AND agency_id=$2 AND sample_only",[String(req.params.clientId),p.agency],tx);
    if(!client)return null;
    const preset=b.presetId?(await rows("SELECT permissions FROM ctp_access_preset WHERE id=$1 AND agency_id=$2",[b.presetId,p.agency],tx))[0]:null;
    if(b.presetId&&!preset)throw new Error("Unknown preset");
    const [person]=await rows(`INSERT INTO ctp_trusted_person(id,agency_id,name,email,phone) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(agency_id,email) DO UPDATE SET name=EXCLUDED.name,updated_at=now() RETURNING id`,[id(),p.agency,b.name,b.email.trim().toLowerCase(),typeof b.phone==="string"?b.phone.slice(0,100):null],tx);
    const [existing]=await rows("SELECT id FROM ctp_client_trusted_person WHERE agency_id=$1 AND client_id=$2 AND trusted_person_id=$3",[p.agency,client.id,person.id],tx);
    // Re-invitation must not silently reactivate or overwrite an existing link.
    if(existing)throw new Error("This trusted person already has a link. Manage their existing access instead.");
    const linkId=id();
    await rows(`INSERT INTO ctp_client_trusted_person(id,agency_id,client_id,trusted_person_id,relationship,authority_type,authority_evidence_ref,authorised_by,expires_at,review_due_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+interval '6 months')`,[linkId,p.agency,client.id,person.id,b.relationship,b.authorityType,b.authorityEvidenceRef,p.id,b.expiresAt??null],tx);
    for(const c of CATEGORIES){
      const f=(preset?.permissions[c]??emptyFlags()) as Flags;
      await rows("INSERT INTO ctp_permission(id,agency_id,client_trusted_person_id,category,can_view,can_contribute,can_notify,client_restricted) VALUES($1,$2,$3,$4,$5,$6,$7,false)",[id(),p.agency,linkId,c,f.can_view,f.can_contribute,f.can_view&&f.can_notify],tx);
    }
    await audit(p.agency,"staff",p.id,"access_granted",linkId,client.id,tx);
    return {id:linkId};
  });
  if(!result){res.status(404).json({error:"Sample client not found."});return;}
  res.status(201).json({link:result,delivery:"awaiting_private_verification"});
});
managerRoutes.post("/links/:linkId/invite",async(req,res):Promise<void>=>{
  const p=actor(res);
  const input=SendVerifiedCtpInviteBody.safeParse(req.body);
  if(!input.success||input.data.recipientVerified!==true){res.status(400).json({error:"Confirm out-of-band identity, relationship and address verification."});return;}
  if(!invites.operatorApproved(p,input.data.operatorKey)){res.status(403).json({error:"Separate trusted-operator approval is required; manager sign-in alone cannot issue invites."});return;}
  const [link]=await rows("SELECT trusted_person_id FROM ctp_client_trusted_person WHERE id=$1 AND agency_id=$2 AND status='active' AND (expires_at IS NULL OR expires_at>now())",[String(req.params.linkId),p.agency]);
  if(!link){res.status(404).json({error:"Active link not found."});return;}
  const result=await invites.send(p.agency,link.trusted_person_id,p.id);
  if(result==="cooldown"){res.setHeader("Retry-After",String(RESEND_SECONDS));res.status(429).json({error:"Wait five minutes before requesting another private code."});return;}
  if(result!=="sent"){res.status(503).json({error:"Private delivery is unavailable. Check approved provider setup and recent recipient verification. No new invite was activated."});return;}
  res.status(202).json({message:"The provider accepted a code for private delivery to the verified recipient. No code is shown to staff."});
});
managerRoutes.patch("/links/:linkId/permissions",async(req,res)=>{
  const p=actor(res);const b=req.body??{};
  const changes=b.permissions;
  if(!changes||typeof changes!=="object"||Array.isArray(changes)||Object.keys(changes).some(c=>!CATEGORIES.includes(c as Category))){res.status(400).json({error:"Valid category permissions are required."});return;}
  const result=await transaction(async tx=>{
    const link=await linkFor(p,String(req.params.linkId),tx);if(!link)return false;
    for(const [category,value] of Object.entries(changes)){
      const f=value as Flags;
      if(!f||["can_view","can_contribute","can_notify","client_restricted"].some(k=>typeof (f as unknown as Record<string,unknown>)[k]!=="boolean")||(f.can_notify&&!f.can_view))throw new Error("Notify requires view; all permission flags must be boolean.");
      const [old]=await rows("SELECT * FROM ctp_permission WHERE client_trusted_person_id=$1 AND category=$2",[link.id,category],tx);
      if(old?.client_restricted&&!f.client_restricted&&!nonempty(b.changedWishesReason,1000))throw new Error("A recorded reason for changing the client's wishes is required.");
      await rows("UPDATE ctp_permission SET can_view=$1,can_contribute=$2,can_notify=$3,client_restricted=$4,updated_at=now() WHERE client_trusted_person_id=$5 AND category=$6",[f.can_view,f.can_contribute,f.can_notify,f.client_restricted,link.id,category],tx);
      await audit(p.agency,"staff",p.id,`permission_changed:${category}:${JSON.stringify(f)}`,link.id,link.client_id,tx);
      if(old?.client_restricted&&!f.client_restricted)await audit(p.agency,"staff",p.id,`client_wishes_changed:${b.changedWishesReason}`,link.id,link.client_id,tx);
    }
    await rows("UPDATE ctp_session SET revoked_at=now() WHERE agency_id=$1 AND trusted_person_id=$2 AND revoked_at IS NULL",[p.agency,link.trusted_person_id],tx);
    return true;
  });
  res.status(result?200:404).json(result?{ok:true}:{error:"Link not found."});
});
managerRoutes.post("/links/:linkId/preset",async(req,res)=>{
  const p=actor(res);
  const result=await transaction(async tx=>{
    const link=await linkFor(p,String(req.params.linkId),tx);
    const [preset]=await rows("SELECT * FROM ctp_access_preset WHERE id=$1 AND agency_id=$2",[req.body?.presetId,p.agency],tx);
    if(!link||!preset)return false;
    for(const c of CATEGORIES){const f=preset.permissions[c] as Flags;await rows("UPDATE ctp_permission SET can_view=$1,can_contribute=$2,can_notify=$3,updated_at=now() WHERE client_trusted_person_id=$4 AND category=$5",[f.can_view,f.can_contribute,f.can_view&&f.can_notify,link.id,c],tx);}
    await rows("UPDATE ctp_session SET revoked_at=now() WHERE agency_id=$1 AND trusted_person_id=$2",[p.agency,link.trusted_person_id],tx);
    await audit(p.agency,"staff",p.id,`preset_applied:${preset.name}`,link.id,link.client_id,tx);return true;
  });
  res.status(result?200:404).json(result?{ok:true}:{error:"Link or preset not found."});
});
managerRoutes.patch("/links/:linkId/status",async(req,res)=>{
  const p=actor(res);const {status,reason}=req.body??{};
  if(!["active","suspended","revoked"].includes(status)||!nonempty(reason,1000)){res.status(400).json({error:"A valid status and reason are required."});return;}
  const result=await transaction(async tx=>{
    const link=await linkFor(p,String(req.params.linkId),tx);if(!link)return false;
    await rows("UPDATE ctp_client_trusted_person SET status=$1,status_reason=$2,updated_at=now() WHERE id=$3",[status,reason,link.id],tx);
    await rows("UPDATE ctp_session SET revoked_at=now() WHERE agency_id=$1 AND trusted_person_id=$2",[p.agency,link.trusted_person_id],tx);
    await audit(p.agency,"staff",p.id,`access_${status}:${reason}`,link.id,link.client_id,tx);return true;
  });res.status(result?200:404).json(result?{ok:true}:{error:"Link not found."});
});
managerRoutes.get("/links/:linkId/audit",async(req,res)=>{
  const p=actor(res);const [link]=await rows("SELECT id,client_id FROM ctp_client_trusted_person WHERE id=$1 AND agency_id=$2",[String(req.params.linkId),p.agency]);
  if(!link){res.status(404).json({error:"Link not found."});return;}
  res.json({audit:await rows(`SELECT id,action,actor_type AS "actorType",actor_id AS "actorId",target,at FROM ctp_access_audit WHERE agency_id=$1 AND (target=$2 OR client_id=$3) ORDER BY at DESC LIMIT 200`,[p.agency,link.id,link.client_id])});
});
managerRoutes.patch("/concerns/:concernId",async(req,res)=>{
  const p=actor(res);const b=req.body??{};
  if(!["reviewing","resolved"].includes(b.status)||(b.status==="resolved"&&!nonempty(b.resolutionNote,2000))){res.status(400).json({error:"A valid status and resolution note are required."});return;}
  const result=await transaction(async tx=>{
    const [c]=await rows("SELECT * FROM ctp_concern WHERE id=$1 AND agency_id=$2 FOR UPDATE",[String(req.params.concernId),p.agency],tx);if(!c)return false;
    if(c.status==="resolved")throw new Error("Resolved concerns cannot be changed.");
    if(b.status==="resolved"&&c.status!=="reviewing")throw new Error("Acknowledge this concern before resolving it.");
    if(b.status==="reviewing")await rows("UPDATE ctp_concern SET status='reviewing',acknowledged_by=$1,acknowledged_at=now(),updated_at=now() WHERE id=$2",[p.id,c.id],tx);
    else await rows("UPDATE ctp_concern SET status='resolved',resolved_by=$1,resolved_at=now(),resolution_note=$2,updated_at=now() WHERE id=$3",[p.id,b.resolutionNote,c.id],tx);
    const [link]=await rows("SELECT trusted_person_id FROM ctp_client_trusted_person WHERE id=$1",[c.client_trusted_person_id],tx);
    if(await can(c.client_trusted_person_id,"concerns","notify",tx))await notification(p.agency,"concern_status","trusted_person",link.trusted_person_id,c.id,`status:${c.id}:${b.status}`,tx);
    await audit(p.agency,"staff",p.id,`concern_${b.status}`,c.id,c.client_id,tx);return true;
  });res.status(result?200:404).json(result?{ok:true}:{error:"Concern not found."});
});
managerRoutes.patch("/settings",async(req,res)=>{
  const p=actor(res);const b=req.body??{};
  const [old]=await rows("SELECT * FROM ctp_agency_settings WHERE agency_id=$1",[p.agency]);
  const identity=b.carerIdentityEnabled??old.carer_identity_enabled;
  const ack=b.concernAckMinutes??old.concern_ack_minutes,esc=b.concernEscalateMinutes??old.concern_escalate_minutes,contacts=b.escalationContacts??old.escalation_contacts;
  if(typeof identity!=="boolean"||![ack,esc].every(n=>Number.isInteger(n)&&n>=1&&n<=1440)||!Array.isArray(contacts)||contacts.length>10||contacts.some(c=>!sampleEmail(c))){res.status(400).json({error:"Use 1–1440 minutes and fictional email escalation contacts."});return;}
  await transaction(async tx=>{
    await rows("UPDATE ctp_agency_settings SET carer_identity_enabled=$1,concern_ack_minutes=$2,concern_escalate_minutes=$3,escalation_contacts=$4,updated_at=now() WHERE agency_id=$5",[identity,ack,esc,JSON.stringify(contacts),p.agency],tx);
    await audit(p.agency,"staff",p.id,"settings_changed",p.agency,undefined,tx);
  });res.json({ok:true});
});
managerRoutes.patch("/carers/:carerId/privacy",async(req,res)=>{
  const p=actor(res);const {showName,showPhoto}=req.body??{};
  if(typeof showName!=="boolean"||typeof showPhoto!=="boolean"){res.status(400).json({error:"Privacy choices must be boolean."});return;}
  const result=await transaction(async tx=>{
    const updated=await rows("UPDATE ctp_carer_privacy SET show_name=$1,show_photo=$2,updated_at=now() WHERE id=$3 AND agency_id=$4 RETURNING id",[showName,showPhoto,String(req.params.carerId),p.agency],tx);
    if(updated.length)await audit(p.agency,"staff",p.id,`sample_carer_privacy_changed:${showName}:${showPhoto}`,updated[0].id,undefined,tx);return updated.length;
  });res.status(result?200:404).json(result?{ok:true}:{error:"Sample carer not found."});
});
managerRoutes.get("/manager/visits",async(_req,res)=>{
  const p=actor(res);
  const visits=await rows(`SELECT v.id,v.client_id AS "clientId",c.name AS "clientName",v.status,v.verified,v.synced FROM ctp_sample_visit v JOIN ctp_sample_client c ON c.id=v.client_id AND c.agency_id=v.agency_id WHERE v.agency_id=$1 ORDER BY v.started_at DESC LIMIT 50`,[p.agency]);
  res.json({visits:await Promise.all(visits.map(async v=>({...v,storyVersions:await rows("SELECT id,version,status,model FROM ctp_story WHERE visit_id=$1 AND agency_id=$2 ORDER BY version DESC",[v.id,p.agency])})))});
});
managerRoutes.get("/manager/visits/:visitId",async(req,res)=>{
  res.json({sources:await rows("SELECT id,category,value FROM ctp_verified_source WHERE visit_id=$1 AND agency_id=$2",[String(req.params.visitId),actor(res).agency])});
});
managerRoutes.patch("/sources/:sourceId",async(req,res)=>{
  const p=actor(res);const value=req.body?.value;
  if(!nonempty(value,400)){res.status(400).json({error:"A short factual sample value is required."});return;}
  const visit=await transaction(async tx=>{
    const [source]=await rows("SELECT * FROM ctp_verified_source WHERE id=$1 AND agency_id=$2",[String(req.params.sourceId),p.agency],tx);if(!source)return null;
    await rows("SELECT id FROM ctp_sample_visit WHERE id=$1 AND agency_id=$2 FOR UPDATE",[source.visit_id,p.agency],tx);
    await rows("UPDATE ctp_verified_source SET value=$1,updated_at=now() WHERE id=$2 AND agency_id=$3",[value,source.id,p.agency],tx);
    await rows("UPDATE ctp_story SET status='superseded',updated_at=now() WHERE visit_id=$1 AND agency_id=$2 AND status='current'",[source.visit_id,p.agency],tx);
    await audit(p.agency,"staff",p.id,"verified_source_corrected",source.id,undefined,tx);return source.visit_id as string;
  });
  if(!visit){res.status(404).json({error:"Source not found."});return;}await queueStory(p.agency,visit,true);kickStoryWorker();res.json({ok:true,status:"queued"});
});
managerRoutes.post("/stories/:visitId/regenerate",async(req,res)=>{
  const p=actor(res);const [visit]=await rows("SELECT id FROM ctp_sample_visit WHERE id=$1 AND agency_id=$2",[String(req.params.visitId),p.agency]);
  if(!visit){res.status(404).json({error:"Visit not found."});return;}await queueStory(p.agency,visit.id,true);kickStoryWorker();res.json({ok:true,status:"queued"});
});
managerRoutes.post("/manager/run-jobs",async(_req,res)=>{
  await processStoryJobs();await escalateConcerns();await missedVisitNotifications();res.json({ok:true,sampleOnly:true});
});
return managerRoutes;
}
export const managerRoutes=createManagerRoutes();
