import { expect, type Page } from "@playwright/test";

export const EMAIL = "offline-browser@example.test";
export const PIN = "7392";
export const QUEUE_KEY = `care-records-queue:${EMAIL}`;
export const NOTE = "Synthetic offline care note: drank two glasses of water.";

type Store = typeof import("../../src/lib/careStore");
type Records = typeof import("../../src/lib/careRecords");
declare global {
  interface Window {
    careiTest: { store: Store; records: Records; key: CryptoKey };
  }
}

/** Import real production modules before disabling the browser's network. */
export async function prepare(page: Page) {
  await page.goto("/");
  await page.evaluate(async ({ email, pin }) => {
    const storePath = "/src/lib/careStore.ts";
    const recordsPath = "/src/lib/careRecords.ts";
    const store: Store = await import(/* @vite-ignore */ storePath);
    const records: Records = await import(/* @vite-ignore */ recordsPath);
    const key = await store.deriveKey(pin, await store.getOrCreateSalt(email));
    window.careiTest = { store, records, key };
  }, { email: EMAIL, pin: PIN });
}

export async function capture(page: Page) {
  return page.evaluate(async ({ email, note }) => {
    const { records, key } = window.careiTest;
    return records.recordCompletedVisit({
      identity: { carerName: "Synthetic Carer", carerEmail: email, agency: "Browser Test Agency" },
      client: {
        id: "synthetic-client", name: "Synthetic Client",
        meds: [{ name: "Synthetic medication", dose: "5mg", dueTime: "09:00" }],
      },
      visitData: {
        notes: note, confirmedMeds: ["Synthetic medication"], skippedMeds: [],
        visitStartTime: "2026-10-06T09:00:00Z", visitEndTime: "2026-10-06T09:30:00Z",
        medTakenAt: { "Synthetic medication": "09:15" }, medRefusalReason: {},
        mood: "Good", mealStatus: "Full", fluidGlasses: 2,
        completedActivities: ["Record mood"],
      },
      cryptoKey: key,
      sessionToken: "synthetic-session",
      // Deliberately omit isOnline: production must read navigator.onLine.
    });
  }, { email: EMAIL, note: NOTE });
}

export async function readQueue(page: Page) {
  return page.evaluate(async (key) => {
    const test = window.careiTest;
    return test.store.loadEncrypted<import("../../src/lib/careRecords").CareRecordJob[]>(test.key, key);
  }, QUEUE_KEY);
}

/** Inspect disk bytes directly, not the decryption API under test. */
export async function rawStore(page: Page, storeName = "blobs") {
  return page.evaluate(async (storeName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("carei_secure");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction(storeName).objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }, storeName);
}

export async function seedAccount(page: Page) {
  await page.evaluate(async ({ email }) => {
    const { store, key } = window.careiTest;
    await store.saveEncrypted(key, "__carei_sentinel__", { valid: true, marker: "CAREi-lock-sentinel-v1" });
    sessionStorage.setItem("carei_account", JSON.stringify({
      email, name: "Synthetic Carer", agency: "Browser Test Agency", sessionToken: "synthetic-session",
    }));
    sessionStorage.setItem("carei_screen", "today");
  }, { email: EMAIL });
}

export async function unlock(page: Page) {
  const inputs = page.locator('input[inputmode="numeric"][maxlength="1"]');
  await expect(inputs).toHaveCount(4);
  for (let i = 0; i < PIN.length; i++) await inputs.nth(i).fill(PIN[i]);
  await expect(inputs).toHaveCount(0);
}

export async function seedUnrelatedStorage(page: Page) {
  await page.evaluate(async () => {
    localStorage.setItem("other_app", "keep-local");
    sessionStorage.setItem("other_app", "keep-session");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("other_app_db", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("records");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").put("keep-idb", "record");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
}

export async function assertUnrelatedStorage(page: Page) {
  expect(await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("other_app_db");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const idb = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("records").objectStore("records").get("record");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return { local: localStorage.getItem("other_app"), session: sessionStorage.getItem("other_app"), idb };
  })).toEqual({ local: "keep-local", session: "keep-session", idb: "keep-idb" });
}
