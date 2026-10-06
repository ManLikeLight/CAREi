import { rows, transaction, id, audit } from "./store";
import { CATEGORIES, presetPermissions } from "./permissions";
import { queueStory, kickStoryWorker } from "./jobs";
import type { Identity } from "./auth";

export async function setupSample(staff: Identity) {
  const visitId = await transaction(async tx => {
    await rows("INSERT INTO ctp_agency_settings(agency_id,escalation_contacts) VALUES($1,$2) ON CONFLICT DO NOTHING", [staff.agency, JSON.stringify([staff.id])], tx);
    for (const [kind, name] of [["primary","Primary Trusted Person"],["trusted","Trusted Person"],["limited","Limited Trusted Person"]] as const) {
      await rows("INSERT INTO ctp_access_preset(id,agency_id,name,permissions) VALUES($1,$2,$3,$4) ON CONFLICT(agency_id,name) DO NOTHING", [id(),staff.agency,name,JSON.stringify(presetPermissions(kind))],tx);
    }
    let [client] = await rows("SELECT id FROM ctp_sample_client WHERE agency_id=$1 LIMIT 1", [staff.agency],tx);
    if (!client) { [client] = await rows("INSERT INTO ctp_sample_client(id,agency_id,name) VALUES($1,$2,'Mary (fictional sample)') RETURNING id",[id(),staff.agency],tx); }
    let [carer] = await rows("SELECT * FROM ctp_carer_privacy WHERE agency_id=$1 LIMIT 1",[staff.agency],tx);
    if (!carer) { [carer] = await rows("INSERT INTO ctp_carer_privacy(id,agency_id,carer_id,name) VALUES($1,$2,$3,'Alex (sample carer)') RETURNING *",[id(),staff.agency,id()],tx); }
    const [existing] = await rows("SELECT id FROM ctp_sample_visit WHERE agency_id=$1 AND client_id=$2 AND started_at::date=current_date LIMIT 1",[staff.agency,client.id],tx);
    if (existing) return existing.id as string;
    const visit = id();
    await rows(`INSERT INTO ctp_sample_visit(id,agency_id,client_id,carer_id,status,verification_method,verified,synced,started_at,completed_at,planned_at)
      VALUES($1,$2,$3,$4,'completed','qr',true,true,date_trunc('day',now())+interval '9 hours',date_trunc('day',now())+interval '9 hours 30 minutes',date_trunc('day',now())+interval '9 hours')`,[visit,staff.agency,client.id,carer.carer_id],tx);
    for (const [category,type,value] of [
      ["visit_status","visit","completed"],["visit_times","visit","from 09:00 to 09:30"],
      ["meals","meal","breakfast prepared"],["medication","medication","scheduled dose recorded as taken"],
      ["tasks","task","washing support completed"],["observations","observation","a conversation about the garden was recorded"],
      ["sensitive_observations","observation","personal care support recorded"],
    ]) await rows("INSERT INTO ctp_verified_source(id,agency_id,visit_id,category,source_type,value) VALUES($1,$2,$3,$4,$5,$6)",[id(),staff.agency,visit,category,type,value],tx);
    await audit(staff.agency,"staff",staff.id,"sample_fixture_created",client.id,client.id,tx);
    return visit;
  });
  await queueStory(staff.agency,visitId);
  kickStoryWorker();
  return {sampleOnly:true,visitId,categories:CATEGORIES};
}
