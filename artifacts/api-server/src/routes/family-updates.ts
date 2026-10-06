import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, familyUpdateConsents, familyUpdateDeliveries, type FamilyUpdateConsent, type FamilyUpdateDelivery } from "@workspace/db";
import { GetFamilyUpdateConsentQueryParams, UpdateFamilyUpdateConsentBody, RedeemFamilyInviteBody } from "@workspace/api-zod";
import {
  FAMILY_COOKIE, clearFamilyCookie, familyMutationAllowed, familySessionStore,
  hashCredential, matchesFamilyPair, readFamilySession, redeemFamilyInvite,
  setFamilyCookie, type FamilyIdentity, type FamilySessionStore,
} from "../family-session";

export interface FamilyUpdateStore {
  consent(identity: FamilyIdentity): Promise<FamilyUpdateConsent | undefined>;
  saveConsent(identity: FamilyIdentity, optedIn: boolean): Promise<FamilyUpdateConsent>;
  deliveries(identity: FamilyIdentity): Promise<FamilyUpdateDelivery[]>;
}
const updateStore: FamilyUpdateStore = {
  async consent(identity) {
    return (await db.select().from(familyUpdateConsents).where(and(
      eq(familyUpdateConsents.clientId, identity.clientId),
      eq(familyUpdateConsents.familyMemberId, identity.familyMemberId),
    )).limit(1))[0];
  },
  async saveConsent(identity, optedIn) {
    const now = new Date();
    // A recipient identity is not a staff email; this legacy audit field holds a namespaced ID.
    const recordedByEmail = `family:${identity.familyMemberId}`;
    const [row] = await db.insert(familyUpdateConsents).values({
      ...identity, optedIn, recordedByName: identity.familyMemberName, recordedByEmail,
      consentedAt: optedIn ? now : null, withdrawnAt: optedIn ? null : now,
    }).onConflictDoUpdate({
      target: [familyUpdateConsents.clientId, familyUpdateConsents.familyMemberId],
      set: {
        familyMemberName: identity.familyMemberName, recordedByName: identity.familyMemberName, recordedByEmail,
        optedIn, consentedAt: optedIn ? now : undefined, withdrawnAt: optedIn ? null : now, updatedAt: now,
      },
    }).returning();
    return row;
  },
  async deliveries(identity) {
    return db.select().from(familyUpdateDeliveries).where(and(
      eq(familyUpdateDeliveries.clientId, identity.clientId),
      eq(familyUpdateDeliveries.familyMemberId, identity.familyMemberId),
      eq(familyUpdateDeliveries.status, "sent"),
    )).orderBy(desc(familyUpdateDeliveries.sentAt));
  },
};

function consentResponse(identity: FamilyIdentity, row?: FamilyUpdateConsent) {
  return {
    ...identity, optedIn: row?.optedIn ?? false,
    consentedAt: row?.consentedAt ?? null, withdrawnAt: row?.withdrawnAt ?? null,
  };
}

export function createFamilyUpdatesRouter(sessions: FamilySessionStore = familySessionStore, updates: FamilyUpdateStore = updateStore): IRouter {
  const router = Router();
  router.use("/family-updates", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    // Family endpoints are same-origin only, regardless of general staff API CORS settings.
    res.removeHeader("Access-Control-Allow-Origin");
    res.removeHeader("Access-Control-Allow-Credentials");
    if (req.method !== "GET" && !familyMutationAllowed(req)) {
      res.status(403).json({ error: "A same-origin family request is required." }); return;
    }
    next();
  });
  router.post("/family-updates/session", async (req, res) => {
    const input = RedeemFamilyInviteBody.safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: "Enter a valid invite code." }); return; }
    const session = await redeemFamilyInvite(input.data.code, sessions);
    if (!session) { res.status(401).json({ error: "This invite is invalid, expired, or already used." }); return; }
    const previous: unknown = req.cookies?.[FAMILY_COOKIE];
    if (typeof previous === "string") await sessions.revoke(hashCredential(previous));
    setFamilyCookie(res, session.token);
    res.json(session.identity);
  });
  router.use("/family-updates", async (req, res, next) => {
    const identity = await readFamilySession(req, sessions);
    if (!identity) { res.status(401).json({ error: "Sign in with your family invite to continue." }); return; }
    res.locals.family = identity;
    next();
  });
  router.get("/family-updates/session", (_req, res) => res.json(res.locals.family));
  router.delete("/family-updates/session", async (req, res) => {
    await sessions.revoke(hashCredential(req.cookies[FAMILY_COOKIE]));
    clearFamilyCookie(res);
    res.sendStatus(204);
  });
  router.get("/family-updates/consent", async (req, res) => {
    const identity = res.locals.family as FamilyIdentity;
    const query = GetFamilyUpdateConsentQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
    if (!matchesFamilyPair(identity, query.data.clientId, query.data.familyMemberId)) {
      res.status(403).json({ error: "This recipient cannot access that client/member pair." }); return;
    }
    res.json(consentResponse(identity, await updates.consent(identity)));
  });
  router.put("/family-updates/consent", async (req, res) => {
    const identity = res.locals.family as FamilyIdentity;
    const parsed = UpdateFamilyUpdateConsentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    if (!matchesFamilyPair(identity, parsed.data.clientId, parsed.data.familyMemberId) ||
        parsed.data.familyMemberName !== identity.familyMemberName) {
      res.status(403).json({ error: "You can only change your own consent." }); return;
    }
    res.json(consentResponse(identity, await updates.saveConsent(identity, parsed.data.optedIn)));
  });
  router.get("/family-updates", async (req, res) => {
    const identity = res.locals.family as FamilyIdentity;
    const query = GetFamilyUpdateConsentQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
    if (!matchesFamilyPair(identity, query.data.clientId, query.data.familyMemberId)) {
      res.status(403).json({ error: "This recipient cannot access that client/member pair." }); return;
    }
    const rows = await updates.deliveries(identity);
    // Explicit allowlist: never return audit identity or internal processing fields.
    res.json(rows.map(row => ({
      id: row.id, visitKey: row.visitKey, clientId: row.clientId, familyMemberId: row.familyMemberId,
      familyMemberName: row.familyMemberName, channel: row.channel, status: row.status,
      summary: row.summary, createdAt: row.createdAt, sentAt: row.sentAt,
    })));
  });
  return router;
}

export default createFamilyUpdatesRouter();
