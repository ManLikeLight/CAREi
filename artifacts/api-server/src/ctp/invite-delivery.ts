import { timingSafeEqual } from "node:crypto";
import { rows, transaction, id, token, digest, audit, type Executor } from "./store";
import type { Identity } from "./auth";

export const INVITE_HOURS = 24;
export const RESEND_SECONDS = 300;
const VERIFICATION_MS = 30 * 86400_000;
type VerifiedDestination = { agencyId: string; personId: string; email: string; verifiedAt: string };
export type InviteResult = "sent" | "cooldown" | "unavailable";
export interface PrivateInviteDelivery {
  configured(): boolean;
  operatorApproved(person: Identity, key?: string): boolean;
  send(agency: string, personId: string, actor: string): Promise<InviteResult>;
  recover(agency: string, email: string): Promise<void>;
}
const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
const emailValid = (s: unknown): s is string =>
  typeof s === "string" && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// This registry is maintained by a trusted deployment administrator after
// independent identity/relationship/email verification. Staff HTTP inputs cannot edit it.
export function verifiedDestinations(env = process.env): VerifiedDestination[] {
  try {
    const entries: unknown = JSON.parse(env.CTP_VERIFIED_INVITE_RECIPIENTS ?? "[]");
    if (!Array.isArray(entries) || entries.length > 1000) return [];
    const seen = new Set<string>();
    const destinations: VerifiedDestination[] = [];
    for (const item of entries) {
      if (!item || typeof item.agencyId !== "string" || !item.agencyId ||
          typeof item.personId !== "string" || !item.personId || !emailValid(item.email) ||
          typeof item.verifiedAt !== "string") return [];
      const key = JSON.stringify([item.agencyId, item.personId]);
      const mailKey = JSON.stringify([item.agencyId, item.email.trim().toLowerCase()]);
      if (seen.has(key) || seen.has(mailKey)) return []; // Never guess an ambiguous identity.
      seen.add(key); seen.add(mailKey);
      const date = Date.parse(item.verifiedAt);
      if (!Number.isFinite(date) || date > Date.now() || Date.now() - date >= VERIFICATION_MS) continue;
      destinations.push({ agencyId: item.agencyId, personId: item.personId,
        email: item.email.trim().toLowerCase(), verifiedAt: item.verifiedAt });
    }
    return destinations;
  } catch { return []; }
}

export function providerConfigured(env = process.env): boolean {
  return env.CTP_INVITE_DELIVERY_APPROVED === "true" && !!env.RESEND_API_KEY &&
    !!env.CTP_INVITE_EMAIL_FROM &&
    /^[^\r\n]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$|^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.CTP_INVITE_EMAIL_FROM);
}

export async function sendPrivateEmail(
  destination: VerifiedDestination, code: string, requestId: string,
  env = process.env, transport: typeof fetch = fetch,
): Promise<void> {
  if (!providerConfigured(env) || !verifiedDestinations(env).some(d =>
    d.agencyId === destination.agencyId && d.personId === destination.personId &&
    d.email === destination.email && d.verifiedAt === destination.verifiedAt)) {
    throw new Error("Private invitation delivery unavailable.");
  }
  try {
    const response = await transport("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json", "Idempotency-Key": requestId },
      body: JSON.stringify({
        from: env.CTP_INVITE_EMAIL_FROM, to: [destination.email],
        subject: "Your Close to Home sign-in code",
        text: `Your one-time Close to Home code is:\n\n${code}\n\nOpen your care organisation's Close to Home portal, choose “Use a private code” and enter this code to set or reset your password. Your agency reference is: ${destination.agencyId}. Use this email address for later sign-ins and recovery. The code expires in ${INVITE_HOURS} hours and can be used once. Do not share it with staff or anyone else. If you did not request this, contact your organisation.`,
      }),
    });
    if (!response.ok) throw new Error("Private invitation delivery unavailable.");
    // Never parse or log an upstream error body: it can echo codes and addresses.
  } catch { throw new Error("Private invitation delivery unavailable."); }
}

export async function lockInvitePerson(agency: string, personId: string, tx: Executor): Promise<boolean> {
  const [person] = await rows("SELECT id FROM ctp_trusted_person WHERE agency_id=$1 AND id=$2 FOR UPDATE", [agency, personId], tx);
  if (!person) return false;
  const [link] = await rows(`SELECT l.id FROM ctp_client_trusted_person l
    JOIN ctp_sample_client c ON c.id=l.client_id AND c.agency_id=l.agency_id
    WHERE l.agency_id=$1 AND l.trusted_person_id=$2 AND l.status='active'
    AND (l.expires_at IS NULL OR l.expires_at>now()) AND c.sample_only`, [agency, personId], tx);
  return !!link;
}

export function createPrivateInviteDelivery(env = process.env, transport: typeof fetch = fetch): PrivateInviteDelivery {
  return {
    configured: () => providerConfigured(env),
    operatorApproved(person, key) {
      try {
        const operators: unknown = JSON.parse(env.CTP_INVITE_OPERATORS ?? "[]");
        const approved = Array.isArray(operators) && operators.some(op =>
          op?.agencyId === person.agency && typeof op.email === "string" && equal(op.email.trim().toLowerCase(), person.id.toLowerCase()));
        if (!approved) return false;
        if (key === undefined) return true;
        const secret = env.CTP_INVITE_OPERATOR_KEY;
        return !!secret && secret.length >= 32 && secret.length <= 256 && equal(key, secret);
      } catch { return false; }
    },
    async send(agency, personId, actor) {
      const destination = verifiedDestinations(env).find(d => d.agencyId === agency && d.personId === personId);
      if (!destination || !providerConfigured(env)) return "unavailable";
      try {
        const reserved = await transaction(async tx => {
          if (!await lockInvitePerson(agency, personId, tx)) return "unavailable" as const;
          const [state] = await rows(`SELECT last_attempt_at FROM ctp_invite_delivery_state
            WHERE agency_id=$1 AND trusted_person_id=$2`, [agency, personId], tx);
          if (state && Date.now() - new Date(state.last_attempt_at).getTime() < RESEND_SECONDS * 1000) return "cooldown" as const;
          await rows(`INSERT INTO ctp_invite_delivery_state(id,agency_id,trusted_person_id,last_attempt_at)
            VALUES($1,$2,$3,now()) ON CONFLICT(agency_id,trusted_person_id) DO UPDATE SET last_attempt_at=now()`,
          [id(), agency, personId], tx);
          return true;
        });
        if (reserved !== true) return reserved;
        return await transaction(async tx => {
          if (!await lockInvitePerson(agency, personId, tx)) return "unavailable" as const;
          const code = token(), inviteId = id();
          // Rolled back if upstream fails. Existing passwords/sessions are untouched.
          await rows("UPDATE ctp_invite SET expires_at=now() WHERE agency_id=$1 AND trusted_person_id=$2 AND redeemed_at IS NULL", [agency, personId], tx);
          await rows(`INSERT INTO ctp_invite(id,agency_id,trusted_person_id,token_hash,expires_at,recipient_email_hash)
            VALUES($1,$2,$3,$4,now()+interval '24 hours',$5)`, [inviteId, agency, personId, digest(code),digest(destination.email)], tx);
          await sendPrivateEmail(destination, code, inviteId, env, transport);
          await rows("UPDATE ctp_invite SET delivered_at=now() WHERE id=$1", [inviteId], tx);
          await rows("UPDATE ctp_invite_delivery_state SET last_sent_at=now() WHERE agency_id=$1 AND trusted_person_id=$2", [agency, personId], tx);
          await audit(agency, actor === "recipient-recovery" ? "system" : "staff", actor, "private_invite_sent", personId, undefined, tx);
          return "sent" as const;
        });
      } catch { return "unavailable"; } // Do not leak SQL errors, provider bodies or codes.
    },
    async recover(agency, email) {
      const target = verifiedDestinations(env).find(d => d.agencyId === agency && equal(d.email, email.trim().toLowerCase()));
      if (target) await this.send(agency, target.personId, "recipient-recovery");
    },
  };
}

export const privateInviteDelivery = createPrivateInviteDelivery();
