import { test, expect, type Page } from "@playwright/test";
import {
  EMAIL, NOTE, prepare, capture, readQueue, rawStore,
  seedAccount, unlock, seedUnrelatedStorage, assertUnrelatedStorage,
} from "./helpers";

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  // Font delivery is unrelated to encrypted storage and must not delay page
  // load or make these otherwise isolated regressions depend on the internet.
  await page.route("https://fonts.googleapis.com/**", route =>
    route.fulfill({status:200,contentType:"text/css",body:""}));
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  // Network contract doubles only; Web Crypto, IndexedDB, app lock, queue,
  // navigator.onLine and the reconnect event all run in the real browser.
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const json = url.pathname === "/api/auth/status"
      ? { wipeRequested: false, deactivated: false }
      : url.pathname === "/api/messages" ? [] : {};
    await route.fulfill({ json });
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page), "No uncaught browser errors").toEqual([]);
});

test("offline capture is encrypted, survives reload and PIN unlock, and auto-syncs on reconnect", async ({ page, context }) => {
  const visits: Record<string, unknown>[] = [];
  const medications: Record<string, unknown>[] = [];
  await page.route("**/api/care-records/**", async (route) => {
    (route.request().url().endsWith("/visits") ? visits : medications).push(route.request().postDataJSON());
    await route.fulfill({ json: { ...route.request().postDataJSON(), id: "synthetic-record" } });
  });
  await prepare(page);
  await seedAccount(page);
  await context.setOffline(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  const result = await capture(page);
  expect(result).toMatchObject({ sent: false, queued: true });
  expect(visits).toHaveLength(0);
  const disk = await rawStore(page);
  const serialized = JSON.stringify(disk);
  for (const secret of [NOTE, "Synthetic Client", "Synthetic medication", EMAIL]) {
    expect(serialized).not.toContain(secret);
  }
  for (const blob of disk as { iv: string; ct: string }[]) {
    expect(Object.keys(blob).sort()).toEqual(["ct", "expiresAt", "iv", "savedAt"]);
    expect(Buffer.from(blob.iv, "base64")).toHaveLength(12);
    expect(Buffer.from(blob.ct, "base64").byteLength).toBeGreaterThan(16);
  }
  const queueBefore = await readQueue(page);
  expect(queueBefore).toHaveLength(1);
  expect(queueBefore?.[0].visit.notes).toBe(NOTE);

  // CAREi has no offline shell/service worker yet. Permit the shell reload,
  // but keep the ingestion API unavailable until after offline PIN unlock.
  await page.route("**/api/care-records/**", (route) => route.abort("internetdisconnected"));
  await context.setOffline(false);
  await page.reload();
  await prepareModulesAfterReload();
  await context.setOffline(true);
  expect(await page.evaluate(() => window.careiTest.key.extractable)).toBe(false);
  expect(await readQueue(page)).toEqual(queueBefore);
  await unlock(page);
  expect(visits).toHaveLength(0);
  await page.unroute("**/api/care-records/**");
  await page.route("**/api/care-records/**", async (route) => {
    (route.request().url().endsWith("/visits") ? visits : medications).push(route.request().postDataJSON());
    await route.fulfill({ json: { ...route.request().postDataJSON(), id: "synthetic-record" } });
  });
  await context.setOffline(false);
  await expect.poll(() => readQueue(page)).toEqual([]);
  expect(visits).toHaveLength(1);
  expect(medications).toHaveLength(1);
  expect(visits[0]).toMatchObject({ visitKey: result.visitKey, notes: NOTE, fluidGlasses: 2 });
  expect(medications[0]).toMatchObject({ visitKey: result.visitKey, status: "given" });
  expect(JSON.stringify(await rawStore(page))).not.toContain(NOTE);

  async function prepareModulesAfterReload() {
    // Do not navigate again: verify the browser's real reload and PIN lock.
    await page.evaluate(async ({ email }) => {
      const storePath = "/src/lib/careStore.ts";
      const recordsPath = "/src/lib/careRecords.ts";
      const store = await import(/* @vite-ignore */ storePath);
      const records = await import(/* @vite-ignore */ recordsPath);
      const key = await store.deriveKey("7392", await store.getOrCreateSalt(email));
      window.careiTest = { store, records, key };
    }, { email: EMAIL });
  }
});

test("a failed medication upload preserves the encrypted job for retry", async ({ page, context }) => {
  await prepare(page);
  await context.setOffline(true);
  await capture(page);
  const queued = await readQueue(page);
  await page.route("**/api/care-records/medications", (route) => route.fulfill({ status: 503, json: { error: "Synthetic outage" } }));
  await context.setOffline(false);
  const drain = () => page.evaluate(async (email) => {
    const { records, key } = window.careiTest;
    return records.drainCareRecordQueue({ userEmail: email, cryptoKey: key, sessionToken: "synthetic-session" });
  }, EMAIL);
  expect(await drain()).toEqual({ sent: 0, remaining: 1 });
  expect(await readQueue(page)).toEqual(queued);
  await page.unroute("**/api/care-records/medications");
  expect(await drain()).toEqual({ sent: 1, remaining: 0 });
  expect(await readQueue(page)).toEqual([]);
});

test("expiry removes expired CAREi blobs, preserving live data, the PIN sentinel and other apps", async ({ page }) => {
  await prepare(page);
  await seedUnrelatedStorage(page);
  await seedAccount(page);
  await page.evaluate(async () => {
    const { store, key } = window.careiTest;
    await store.saveEncrypted(key, "expired-cache", { notes: "Synthetic expired cache" });
    await store.saveEncrypted(key, "live-cache", { notes: "Synthetic live cache" });
    // Deterministically expire just one blob without sleeping for seven days.
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("carei_secure");
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      const store = tx.objectStore("blobs");
      const request = store.get("expired-cache");
      request.onsuccess = () => store.put({ ...request.result, expiresAt: Date.now() - 1 }, "expired-cache");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  expect(await page.evaluate(() => window.careiTest.store.purgeExpiredData())).toBe(1);
  expect(await page.evaluate(async () => {
    const { store, key } = window.careiTest;
    return {
      expired: await store.loadEncrypted(key, "expired-cache"),
      live: await store.loadEncrypted(key, "live-cache"),
      sentinel: await store.loadEncrypted(key, "__carei_sentinel__"),
    };
  })).toEqual({
    expired: undefined, live: { notes: "Synthetic live cache" },
    sentinel: { valid: true, marker: "CAREi-lock-sentinel-v1" },
  });
  expect(await rawStore(page)).toHaveLength(2);
  await assertUnrelatedStorage(page);
});

test("remote wipe on reconnect clears only CAREi-owned storage and acknowledges the device", async ({ page, context }) => {
  await prepare(page);
  await seedUnrelatedStorage(page);
  await seedAccount(page);
  await page.evaluate(() => {
    localStorage.setItem("carei_test_setting", "remove");
    sessionStorage.setItem("carei_test_setting", "remove");
  });
  await context.setOffline(true);
  await capture(page);
  let acknowledgement: { deviceId?: string } | undefined;
  await page.route("**/api/auth/status?*", (route) => route.fulfill({ json: { wipeRequested: true } }));
  await page.route("**/api/auth/wipe-ack", async (route) => {
    acknowledgement = route.request().postDataJSON();
    expect(route.request().headers().authorization).toBe("Bearer synthetic-session");
    await route.fulfill({ json: { ok: true } });
  });
  // Wipe acknowledgement intentionally precedes the app's delayed reload.
  // Wait for that lifecycle transition before inspecting the preserved stores;
  // otherwise their IDB read can race destruction of the old page context.
  const wipedReload = page.waitForEvent("framenavigated", frame => frame === page.mainFrame());
  await context.setOffline(false);
  await wipedReload;
  await page.waitForLoadState("load");
  await expect.poll(() => acknowledgement?.deviceId).toBeTruthy();
  await expect.poll(() => rawStore(page)).toEqual([]);
  expect(await rawStore(page, "meta")).toEqual([]);
  expect(await page.evaluate(() => ({
    account: sessionStorage.getItem("carei_account"),
    local: localStorage.getItem("carei_test_setting"),
    session: sessionStorage.getItem("carei_test_setting"),
  }))).toEqual({ account: null, local: null, session: null });
  await assertUnrelatedStorage(page);
});
