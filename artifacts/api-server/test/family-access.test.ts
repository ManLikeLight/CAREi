import assert from "node:assert/strict";
import test, { after } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { eq } from "drizzle-orm";
import { db, pool, familyAccess, type FamilyUpdateConsent } from "@workspace/db";
import { createFamilyUpdatesRouter, type FamilyUpdateStore } from "../src/routes/family-updates";
import {
  FAMILY_COOKIE, familySessionStore, hashCredential, newCredential,
  redeemFamilyInvite, type FamilySessionStore,
} from "../src/family-session";
import { SUPPORTED_FAMILY_MAPPING } from "../src/family-mapping";
import { issueAssistantSession } from "../src/assistant-session";

after(() => pool.end());
const identity = {
  clientId: SUPPORTED_FAMILY_MAPPING.clientId,
  familyMemberId: SUPPORTED_FAMILY_MAPPING.familyMemberId,
  familyMemberName: SUPPORTED_FAMILY_MAPPING.familyMemberName,
};

test("real database consumes invites exactly once and rejects expired or revoked access", async () => {
  const code = newCredential();
  const expired = newCredential();
  const rows = [
    { ...identity, inviteHash: hashCredential(code), inviteExpiresAt: new Date(Date.now() + 60_000) },
    { ...identity, inviteHash: hashCredential(expired), inviteExpiresAt: new Date(Date.now() - 60_000) },
  ];
  await db.insert(familyAccess).values(rows);
  try {
    const attempts = await Promise.all([redeemFamilyInvite(code), redeemFamilyInvite(code)]);
    assert.equal(attempts.filter(Boolean).length, 1);
    const session = attempts.find(Boolean)!;
    assert.deepEqual(session.identity, identity);
    assert.ok(await familySessionStore.find(hashCredential(session.token)));
    assert.equal(await redeemFamilyInvite(code), undefined);
    assert.equal(await redeemFamilyInvite(expired), undefined);
    assert.equal(await redeemFamilyInvite("not-an-invite"), undefined);
    assert.equal(await redeemFamilyInvite(newCredential()), undefined);
    await db.update(familyAccess).set({ sessionExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(familyAccess.inviteHash, hashCredential(code)));
    assert.equal(await familySessionStore.find(hashCredential(session.token)), undefined);
    await familySessionStore.revoke(hashCredential(session.token));
    const [row] = await db.select().from(familyAccess).where(eq(familyAccess.inviteHash, hashCredential(code)));
    assert.equal(row.sessionHash, null);
    assert.equal(row.sessionExpiresAt, null);
  } finally {
    for (const row of rows) await db.delete(familyAccess).where(eq(familyAccess.inviteHash, row.inviteHash));
  }
});

test("recipient endpoints reject staff tokens, forged cookies, other pairs and consent impersonation", async () => {
  const sessionToken = newCredential();
  const otherMemberToken = newCredential();
  const sessions: FamilySessionStore = {
    async find(hash) {
      if (hash === hashCredential(sessionToken)) return identity;
      if (hash === hashCredential(otherMemberToken)) return { ...identity, familyMemberId: "another-member" };
      return undefined;
    },
    async redeem() { return undefined; },
    async revoke() {},
  };
  const now = new Date();
  let consent: FamilyUpdateConsent = {
    ...identity, id: 1, optedIn: false, consentedAt: null, withdrawnAt: null,
    recordedByName: "INTERNAL STAFF", recordedByEmail: "internal@example.test", createdAt: now, updatedAt: now,
  };
  let saves = 0;
  let reads = 0;
  const updates: FamilyUpdateStore = {
    async consent(received) { assert.deepEqual(received, identity); reads++; return consent; },
    async saveConsent(received, optedIn) {
      assert.deepEqual(received, identity); saves++;
      consent = { ...consent, optedIn };
      return consent;
    },
    async deliveries(received) {
      assert.deepEqual(received, identity); reads++;
      return [{
        ...identity, id: 1, visitKey: "visit-test", channel: "in_app", status: "sent",
        summary: "Mary had a comfortable visit.", attempts: 2, error: "INTERNAL ERROR",
        createdAt: now, sentAt: now, updatedAt: now, nextAttemptAt: now,
      }];
    },
  };
  const app = express();
  app.use(cookieParser()); app.use(express.json());
  app.use("/api", createFamilyUpdatesRouter(sessions, updates));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/family-updates`;
  const query = "?clientId=mary&familyMemberId=james-obrien";
  const familyHeaders = { Cookie: `${FAMILY_COOKIE}=${sessionToken}`, "Content-Type": "application/json", "X-CAREi-Family": "1" };
  try {
    for (const role of ["carer", "manager", "admin"] as const) {
      const token = issueAssistantSession({ role, name: "Staff", email: "staff@example.test", agency: "Test" });
      for (const path of [query, `/consent${query}`, "/session"]) {
        assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
      }
      for (const optedIn of [true, false]) {
        assert.equal((await fetch(`${base}/consent`, {
          method: "PUT", headers: { ...familyHeaders, Cookie: "", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...identity, optedIn }),
        })).status, 401);
      }
      assert.equal((await fetch(`${base}/session`, { headers: { Cookie: `${FAMILY_COOKIE}=${token}` } })).status, 401);
    }
    for (const token of [newCredential(), otherMemberToken]) {
      assert.equal((await fetch(`${base}${query}`, { headers: { Cookie: `${FAMILY_COOKIE}=${token}` } })).status, 401);
    }
    for (const pair of ["?clientId=mary&familyMemberId=other", "?clientId=other&familyMemberId=james-obrien"]) {
      for (const path of [pair, `/consent${pair}`]) {
        assert.equal((await fetch(`${base}${path}`, { headers: familyHeaders })).status, 403);
      }
    }
    for (const optedIn of [true, false]) {
      for (const changed of [{ clientId: "other" }, { familyMemberId: "other" }, { familyMemberName: "Other Recipient" }]) {
        assert.equal((await fetch(`${base}/consent`, {
          method: "PUT", headers: familyHeaders, body: JSON.stringify({ ...identity, ...changed, optedIn }),
        })).status, 403);
      }
    }
    assert.equal(reads, 0); assert.equal(saves, 0);
    const delivered = await fetch(`${base}${query}`, { headers: familyHeaders });
    assert.equal(delivered.status, 200); assert.equal(delivered.headers.get("cache-control"), "no-store");
    const data = await delivered.json();
    assert.equal(data[0].summary, "Mary had a comfortable visit.");
    assert.equal("error" in data[0], false); assert.equal("attempts" in data[0], false);
    const record = await (await fetch(`${base}/consent${query}`, { headers: familyHeaders })).json();
    assert.equal(record.optedIn, false); assert.equal("recordedByEmail" in record, false);
    for (const optedIn of [true, false]) {
      const response = await fetch(`${base}/consent`, { method: "PUT", headers: familyHeaders, body: JSON.stringify({ ...identity, optedIn }) });
      assert.equal(response.status, 200); assert.equal((await response.json()).optedIn, optedIn);
    }
    assert.equal(saves, 2);
    assert.equal((await fetch(`${base}/consent`, {
      method: "PUT", headers: { Cookie: familyHeaders.Cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ ...identity, optedIn: true }),
    })).status, 403);
    for (const site of ["cross-site", "same-site"]) {
      assert.equal((await fetch(`${base}/consent`, {
        method: "PUT", headers: { ...familyHeaders, "Sec-Fetch-Site": site },
        body: JSON.stringify({ ...identity, optedIn: true }),
      })).status, 403);
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});

test("invite exchange creates an HttpOnly cookie, reload works and sign-out revokes it", async () => {
  const code = newCredential();
  let hash: string | null = null;
  let used = false;
  const store: FamilySessionStore = {
    async redeem(invite, session) {
      if (used || invite !== hashCredential(code)) return undefined;
      used = true; hash = session;
      return identity;
    },
    async find(session) { return session === hash ? identity : undefined; },
    async revoke(session) { if (session === hash) hash = null; },
  };
  const app = express(); app.use(cookieParser()); app.use(express.json());
  app.use("/api", createFamilyUpdatesRouter(store));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/family-updates/session`;
  const headers = { "Content-Type": "application/json", "X-CAREi-Family": "1" };
  try {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({ code }) });
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), identity);
    const rawCookie = response.headers.get("set-cookie")!;
    assert.match(rawCookie, /HttpOnly/); assert.match(rawCookie, /SameSite=Strict/);
    assert.match(rawCookie, /Path=\/api\/family-updates/);
    const cookie = rawCookie.split(";")[0];
    assert.equal((await fetch(url, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(url, { method: "POST", headers, body: JSON.stringify({ code }) })).status, 401);
    assert.equal((await fetch(url, { method: "DELETE", headers: { "X-CAREi-Family": "1", Cookie: cookie } })).status, 204);
    assert.equal((await fetch(url, { headers: { Cookie: cookie } })).status, 401);
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
