import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, familyAccess } from "@workspace/db";
import { isSupportedFamilyMember } from "./family-mapping";

export const FAMILY_COOKIE = "carei_family_session";
export const FAMILY_SESSION_MS = 8 * 60 * 60 * 1000;
export type FamilyIdentity = { clientId: string; familyMemberId: string; familyMemberName: string };
export const hashCredential = (value: string) => createHash("sha256").update(value).digest("hex");
export const newCredential = () => randomBytes(32).toString("base64url");
const validCredential = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

export interface FamilySessionStore {
  redeem(inviteHash: string, sessionHash: string, expiresAt: Date): Promise<FamilyIdentity | undefined>;
  find(sessionHash: string): Promise<FamilyIdentity | undefined>;
  revoke(sessionHash: string): Promise<void>;
}

export const familySessionStore: FamilySessionStore = {
  async redeem(inviteHash, sessionHash, expiresAt) {
    // The conditional UPDATE atomically consumes an invite, including concurrent requests.
    const [row] = await db.update(familyAccess).set({
      redeemedAt: new Date(), sessionHash, sessionExpiresAt: expiresAt,
    }).where(and(
      eq(familyAccess.inviteHash, inviteHash), isNull(familyAccess.redeemedAt),
      gt(familyAccess.inviteExpiresAt, new Date()),
    )).returning({
      clientId: familyAccess.clientId, familyMemberId: familyAccess.familyMemberId,
      familyMemberName: familyAccess.familyMemberName,
    });
    return row;
  },
  async find(sessionHash) {
    const [row] = await db.select({
      clientId: familyAccess.clientId, familyMemberId: familyAccess.familyMemberId,
      familyMemberName: familyAccess.familyMemberName,
    }).from(familyAccess).where(and(
      eq(familyAccess.sessionHash, sessionHash), gt(familyAccess.sessionExpiresAt, new Date()),
    )).limit(1);
    return row;
  },
  async revoke(sessionHash) {
    await db.update(familyAccess).set({ sessionHash: null, sessionExpiresAt: null })
      .where(eq(familyAccess.sessionHash, sessionHash));
  },
};

export function supportedIdentity(identity: FamilyIdentity | undefined): identity is FamilyIdentity {
  return !!identity && isSupportedFamilyMember(identity.clientId, identity.familyMemberId, identity.familyMemberName);
}

export function matchesFamilyPair(identity: FamilyIdentity, clientId: string, memberId: string): boolean {
  return identity.clientId === clientId && identity.familyMemberId === memberId;
}

export async function readFamilySession(req: Request, store = familySessionStore): Promise<FamilyIdentity | undefined> {
  const token: unknown = req.cookies?.[FAMILY_COOKIE];
  if (!validCredential(token)) return undefined;
  const identity = await store.find(hashCredential(token));
  return supportedIdentity(identity) ? identity : undefined;
}

function options() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/family-updates" };
}
export function setFamilyCookie(res: Response, token: string) {
  res.cookie(FAMILY_COOKIE, token, { ...options(), maxAge: FAMILY_SESSION_MS });
}
export function clearFamilyCookie(res: Response) {
  res.clearCookie(FAMILY_COOKIE, options());
}
export function familyMutationAllowed(req: Request): boolean {
  // Preview infrastructure can rewrite SameSite, so CSRF protection must not rely on it.
  // Custom header forces a preflight; the API never permits credentialed cross-origin CORS.
  const site = req.get("Sec-Fetch-Site");
  return req.get("X-CAREi-Family") === "1" && (req.method === "DELETE" || !!req.is("application/json")) &&
    (!site || site === "same-origin");
}

export async function redeemFamilyInvite(code: unknown, store = familySessionStore) {
  if (!validCredential(code)) return undefined;
  const token = newCredential();
  const identity = await store.redeem(hashCredential(code), hashCredential(token), new Date(Date.now() + FAMILY_SESSION_MS));
  if (!supportedIdentity(identity)) {
    if (identity) await store.revoke(hashCredential(token));
    return undefined;
  }
  return { token, identity };
}
