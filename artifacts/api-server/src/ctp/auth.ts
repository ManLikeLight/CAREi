import type { Request, Response, NextFunction } from "express";
import Database from "@replit/database";
import { verifyAssistantSession } from "../assistant-session";
import { rows, digest } from "./store";

export const COOKIE = "carei_ctp_session";
export function setCookie(res: Response, value: string) {
  res.cookie(COOKIE, value, { httpOnly: true, secure: true, sameSite: "strict", path: "/api/ctp", maxAge: 15 * 60_000 });
}
export function clearCookie(res: Response) { res.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: "strict", path: "/api/ctp" }); }
export type Identity = { id: string; agency: string; name: string };
export async function trustedIdentity(req: Request): Promise<Identity | null> {
  const raw = req.cookies?.[COOKIE];
  if (typeof raw !== "string" || raw.length < 30) return null;
  const [person] = await rows(`SELECT p.id,p.agency_id,p.name FROM ctp_session s JOIN ctp_trusted_person p ON p.id=s.trusted_person_id AND p.agency_id=s.agency_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND p.login_status='active'
    AND EXISTS(SELECT 1 FROM ctp_client_trusted_person l WHERE l.trusted_person_id=p.id AND l.agency_id=p.agency_id AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>now()))`, [digest(raw)]);
  return person ? { id: person.id, agency: person.agency_id, name: person.name } : null;
}
export async function staffIdentity(req: Request): Promise<Identity | null> {
  const raw = req.header("authorization");
  const session = raw?.startsWith("Bearer ") ? verifyAssistantSession(raw.slice(7)) : null;
  if (!session || !["manager", "admin"].includes(session.role)) return null;
  // Re-check stored status/role, never a request body or client-selected view.
  const found = await new Database().get(`carer_${session.email.toLowerCase().trim()}`);
  if (!found.ok || !found.value) return null;
  const record = found.value as { deactivated?: boolean; role?: string; agency?: string };
  if (record.deactivated || !["manager", "admin"].includes(record.role ?? "") || record.agency !== session.agency) return null;
  return { id: session.email, agency: session.agency, name: session.name };
}
export function unavailable(res: Response) {
  clearCookie(res);
  res.status(403).json({ code: "ACCESS_UNAVAILABLE", error: "Access unavailable, please contact the agency." });
}
export async function trusted(req: Request, res: Response, next: NextFunction) {
  const identity = await trustedIdentity(req);
  if (!identity) { unavailable(res); return; }
  res.locals.ctp = identity;
  next();
}
export async function staff(req: Request, res: Response, next: NextFunction) {
  const identity = await staffIdentity(req);
  if (!identity) { res.status(403).json({ error: "An active manager or admin session is required." }); return; }
  res.locals.ctp = identity;
  next();
}
export async function ownedLink(person: Identity, clientId: string) {
  return (await rows(`SELECT * FROM ctp_client_trusted_person WHERE agency_id=$1 AND trusted_person_id=$2 AND client_id=$3 AND status='active' AND (expires_at IS NULL OR expires_at>now())`, [person.agency, person.id, clientId]))[0];
}
