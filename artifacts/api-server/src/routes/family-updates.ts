import { Router, type IRouter, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, familyUpdateConsents, familyUpdateDeliveries } from "@workspace/db";
import { verifyAssistantSession } from "../assistant-session";
import { GetFamilyUpdateConsentQueryParams, UpdateFamilyUpdateConsentBody } from "@workspace/api-zod";
import { isSupportedFamilyMember, SUPPORTED_FAMILY_MAPPING } from "../family-mapping";

const router: IRouter = Router();

function authorize(req: Request) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const session = verifyAssistantSession(token);
  return session?.role === "carer" || session?.role === "manager" ? session : null;
}
function validMember(clientId: string, memberId: string, name: string) {
  return isSupportedFamilyMember(clientId, memberId, name);
}

router.get("/family-updates/consent", async (req, res) => {
  if (!authorize(req)) { res.status(401).json({ error: "A valid carer bearer token is required." }); return; }
  const query = GetFamilyUpdateConsentQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const { clientId, familyMemberId } = query.data;
  if (!validMember(clientId, familyMemberId, SUPPORTED_FAMILY_MAPPING.familyMemberName)) { res.status(403).json({ error: "Family member is not mapped to this CAREi client." }); return; }
  const row = (await db.select().from(familyUpdateConsents).where(and(eq(familyUpdateConsents.clientId, clientId), eq(familyUpdateConsents.familyMemberId, familyMemberId))).limit(1))[0];
  res.json(row ?? { clientId, familyMemberId, familyMemberName: SUPPORTED_FAMILY_MAPPING.familyMemberName, optedIn: false, consentedAt: null, withdrawnAt: null });
});

router.put("/family-updates/consent", async (req, res) => {
  if (!authorize(req)) { res.status(401).json({ error: "A valid carer bearer token is required." }); return; }
  const parsed = UpdateFamilyUpdateConsentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const input = parsed.data;
  if (!validMember(input.clientId, input.familyMemberId, input.familyMemberName)) { res.status(403).json({ error: "Family member is not mapped to this CAREi client." }); return; }
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7).trim() : "";
  const session = verifyAssistantSession(token);
  if (!session) { res.status(401).json({ error: "A valid bearer token is required." }); return; }
  const now = new Date();
  const [row] = await db.insert(familyUpdateConsents).values({
    ...input, recordedByName: session.name, recordedByEmail: session.email,
    consentedAt: input.optedIn ? now : null, withdrawnAt: input.optedIn ? null : now,
  }).onConflictDoUpdate({
    target: [familyUpdateConsents.clientId, familyUpdateConsents.familyMemberId],
    set: { familyMemberName: input.familyMemberName, recordedByName: session.name, recordedByEmail: session.email, optedIn: input.optedIn, consentedAt: input.optedIn ? now : undefined, withdrawnAt: input.optedIn ? null : now, updatedAt: now },
  }).returning();
  res.json(row);
});

router.get("/family-updates", async (req, res) => {
  if (!authorize(req)) { res.status(401).json({ error: "A valid carer bearer token is required." }); return; }
  const query = GetFamilyUpdateConsentQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const { clientId, familyMemberId } = query.data;
  if (!validMember(clientId, familyMemberId, SUPPORTED_FAMILY_MAPPING.familyMemberName)) { res.status(403).json({ error: "Family member is not mapped to this CAREi client." }); return; }
  const rows = await db.select().from(familyUpdateDeliveries).where(and(eq(familyUpdateDeliveries.clientId, clientId), eq(familyUpdateDeliveries.familyMemberId, familyMemberId), eq(familyUpdateDeliveries.status, "sent"))).orderBy(desc(familyUpdateDeliveries.sentAt));
  res.json(rows.map(({ error: _error, attempts: _attempts, updatedAt: _updatedAt, nextAttemptAt: _nextAttemptAt, ...safe }) => safe));
});

export default router;