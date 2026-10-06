import { randomBytes, randomUUID, createHash } from "node:crypto";
import { pool } from "@workspace/db";
import type { PoolClient, QueryResultRow } from "pg";
import { allowed, type Category, type Action, type Flags } from "./permissions";

export const id = () => randomUUID();
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export type Executor = { query: PoolClient["query"] };
export async function rows<R extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = [], executor: Executor = pool): Promise<R[]> {
  return (await executor.query<R>(sql, params)).rows;
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
  catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
export async function audit(agency: string, actorType: string, actor: string, action: string, target: string, clientId?: string, executor: Executor = pool) {
  await rows("INSERT INTO ctp_access_audit (id,agency_id,actor_type,actor_id,action,target,client_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id(), agency, actorType, actor, action, target, clientId ?? null], executor);
}
export async function can(linkId: string, category: Category, action: Action, executor: Executor = pool): Promise<boolean> {
  const [row] = await rows(`SELECT l.status,l.expires_at,p.can_view,p.can_contribute,p.can_notify,p.client_restricted
    FROM ctp_client_trusted_person l LEFT JOIN ctp_permission p ON p.client_trusted_person_id=l.id AND p.agency_id=l.agency_id AND p.category=$2 WHERE l.id=$1`, [linkId, category], executor);
  return row ? allowed(row as {status:string;expires_at:Date|null}, row as Flags, action) : false;
}
export const NOTICE = "There is an update in Close to Home.";
// The only trusted-person notification types. Staff concern alerts are separate recipients.
export async function notification(agency: string, type: "concern_status" | "visit_missed" | "staff_concern" | "staff_escalation", recipientType: "trusted_person" | "manager" | "escalation_contact", recipientId: string, target: string, dedupe: string, executor: Executor = pool) {
  for (const channel of ["in_app", "email"]) {
    await rows(`INSERT INTO ctp_notification (id,agency_id,type,recipient_type,recipient_id,channel,text,target,dedupe_key,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'sample_only') ON CONFLICT(dedupe_key) DO NOTHING`,
    [id(), agency, type, recipientType, recipientId, channel, NOTICE, target, `${dedupe}:${channel}`], executor);
  }
}
