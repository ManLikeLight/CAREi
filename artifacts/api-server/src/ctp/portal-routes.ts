import { Router } from "express";
import { trusted, ownedLink, unavailable, type Identity } from "./auth";
import { rows, transaction, can, audit, id, notification } from "./store";
import { CATEGORIES, identityLabel, type Category } from "./permissions";

export const portalRoutes=Router();
portalRoutes.use(trusted);
portalRoutes.get("/me/clients",async(_req,res)=>{
  const p=res.locals.ctp as Identity;
  const clients=await rows(`SELECT c.id,c.name FROM ctp_sample_client c JOIN ctp_client_trusted_person l ON l.client_id=c.id AND l.agency_id=c.agency_id
    WHERE l.agency_id=$1 AND l.trusted_person_id=$2 AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>now())`,[p.agency,p.id]);
  res.json({clients});
});
portalRoutes.get("/me/clients/:clientId/today",async(req,res)=>{
  const p=res.locals.ctp as Identity;const link=await ownedLink(p,String(req.params.clientId));
  if(!link){unavailable(res);return;}
  const response=await transaction(async tx=>{
    // Row lock binds the whole response to one access state, including concurrent revocation.
    const [live]=await rows("SELECT * FROM ctp_client_trusted_person WHERE id=$1 FOR SHARE",[link.id],tx);
    if(live.status!=="active"||(live.expires_at&&live.expires_at<=new Date()))return null;
    const view={} as Record<Category,boolean>;
    for(const c of CATEGORIES) view[c]=await can(link.id,c,"view",tx);
    const visits=await rows(`SELECT v.*,p.name,p.show_name,p.show_photo,p.photo,s.carer_identity_enabled,
      (SELECT count(*)::int FROM ctp_sample_visit x WHERE x.agency_id=v.agency_id AND x.client_id=v.client_id AND x.carer_id=v.carer_id AND x.status='completed' AND x.verified AND x.synced AND date_trunc('month',x.started_at)=date_trunc('month',now())) AS continuity
      FROM ctp_sample_visit v LEFT JOIN ctp_carer_privacy p ON p.carer_id=v.carer_id AND p.agency_id=v.agency_id
      LEFT JOIN ctp_agency_settings s ON s.agency_id=v.agency_id
      WHERE v.agency_id=$1 AND v.client_id=$2 AND (v.started_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date ORDER BY v.started_at`,[p.agency,link.client_id],tx);
    const out:Record<string,unknown>={};
    if(["visit_status","visit_times","planned_times","carer_identity"].some(c=>view[c as Category])){
      out.visits=visits.map(v=>({id:v.id,...(view.visit_status?{status:v.status}:{}),
        ...(view.visit_times?{times:{start:v.started_at,end:v.completed_at}}:{}),
        ...(view.planned_times?{plannedTimes:{start:v.planned_at}}:{}),
        ...(view.visit_status?{continuity:identityLabel(false,{name:"",show_name:false,show_photo:false},false,v.continuity).label}:{}),
        ...(view.carer_identity?{carer:identityLabel(v.carer_identity_enabled, {name:v.name??"",show_name:!!v.show_name,show_photo:!!v.show_photo,photo:v.photo},true,v.continuity)}:{})}));
    }
    const facts=await rows(`SELECT f.category,f.value FROM ctp_verified_source f JOIN ctp_sample_visit v ON v.id=f.visit_id AND v.agency_id=f.agency_id
      JOIN ctp_permission p ON p.category=f.category AND p.client_trusted_person_id=$3 AND p.agency_id=f.agency_id
      WHERE f.agency_id=$1 AND v.client_id=$2 AND v.status='completed' AND v.verified AND v.synced AND v.verification_method IN ('geofence','qr')
      AND (v.started_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date AND p.can_view AND NOT p.client_restricted`,[p.agency,link.client_id,link.id],tx);
    for(const c of ["meals","medication","tasks","observations","sensitive_observations"] as Category[]) if(view[c]) out[c]=facts.filter(f=>f.category===c).map(f=>f.value);
    if(view.story) out.story=(await rows(`SELECT x.text FROM ctp_story_sentence x JOIN ctp_story s ON s.id=x.story_id AND s.agency_id=x.agency_id
      JOIN ctp_sample_visit v ON v.id=s.visit_id AND v.agency_id=s.agency_id
      JOIN ctp_permission p ON p.category=x.category AND p.agency_id=x.agency_id AND p.client_trusted_person_id=$3
      WHERE s.agency_id=$1 AND v.client_id=$2 AND s.status='current' AND v.verified AND v.synced AND v.status='completed'
      AND (v.started_at AT TIME ZONE 'Europe/London')::date=(now() AT TIME ZONE 'Europe/London')::date AND p.can_view AND NOT p.client_restricted ORDER BY v.started_at,x.seq`,[p.agency,link.client_id,link.id],tx)).map(x=>x.text);
    if(view.reassurance) out.reassurance=facts.filter(f=>["meals","medication","tasks","visit_status"].includes(f.category)).map(f=>({category:f.category,text:f.value}));
    if(await can(link.id,"concerns","contribute",tx)) out.canRaiseConcern=true;
    await audit(p.agency,"trusted_person",p.id,"today_viewed",link.id,link.client_id,tx);
    return out;
  });
  if(!response){unavailable(res);return;}res.json(response);
});
portalRoutes.get("/me/concerns",async(_req,res)=>{
  const p=res.locals.ctp as Identity;
  const concerns=await rows(`SELECT c.id,c.status,c.created_at AS "createdAt",c.acknowledged_at AS "acknowledgedAt",c.resolved_at AS "resolvedAt"
    FROM ctp_concern c JOIN ctp_client_trusted_person l ON l.id=c.client_trusted_person_id AND l.agency_id=c.agency_id
    JOIN ctp_permission f ON f.client_trusted_person_id=l.id AND f.agency_id=l.agency_id AND f.category='concerns'
    WHERE l.agency_id=$1 AND l.trusted_person_id=$2 AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>now()) AND f.can_view AND NOT f.client_restricted ORDER BY c.created_at DESC`,[p.agency,p.id]);
  res.json({concerns});
});
portalRoutes.post("/me/clients/:clientId/concerns",async(req,res)=>{
  const p=res.locals.ctp as Identity;const link=await ownedLink(p,String(req.params.clientId));
  if(!link){unavailable(res);return;}
  const {reasonCode,detail}=req.body??{};
  if(!["confused","not_answering","quieter_than_usual","missed_or_late_visit","other"].includes(reasonCode)||(detail!==undefined && (typeof detail!=="string"||detail.length>2000))){res.status(400).json({error:"Choose a valid reason; optional details must be at most 2,000 characters."});return;}
  const result=await transaction(async tx=>{
    await rows("SELECT id FROM ctp_client_trusted_person WHERE id=$1 FOR SHARE",[link.id],tx);
    if(!await can(link.id,"concerns","contribute",tx))return null;
    const concernId=id();
    await rows(`INSERT INTO ctp_concern(id,agency_id,client_id,client_trusted_person_id,reason_code,detail,ack_due_at)
      SELECT $1,$2,$3,$4,$5,$6,now()+concern_ack_minutes*interval '1 minute' FROM ctp_agency_settings WHERE agency_id=$2`,[concernId,p.agency,link.client_id,link.id,reasonCode,detail??null],tx);
    await notification(p.agency,"staff_concern","manager",p.agency,concernId,`new:${concernId}`,tx);
    await audit(p.agency,"trusted_person",p.id,"concern_received",concernId,link.client_id,tx);
    return {id:concernId,status:"received"};
  });
  if(!result){res.status(403).json({error:"You do not have permission to raise a concern."});return;}res.status(201).json(result);
});
