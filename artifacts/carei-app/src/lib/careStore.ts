/**
 * CAREi Secure Storage
 * --------------------
 * Encrypts all care data at rest using AES-GCM 256-bit via the Web Crypto API.
 * Keys are derived from the carer's PIN using PBKDF2 (100,000 iterations + per-user random salt).
 * Data is stored in IndexedDB as encrypted blobs — never in plain text.
 * Decryption happens in memory only, after successful PIN authentication.
 */

const DB_NAME = "carei_secure";
const DB_VERSION = 1;
const BLOB_STORE = "blobs";
const META_STORE = "meta";

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbGetAllKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Encoding helpers ─────────────────────────────────────────────────────────

function b64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function b64Decode(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── Salt management ──────────────────────────────────────────────────────────

/**
 * Returns the per-user PBKDF2 salt, creating one if it doesn't exist.
 * The salt is stored in the meta object store alongside the encrypted blobs.
 * It is NOT a secret — it's a random value used to prevent pre-computation attacks.
 */
export async function getOrCreateSalt(email: string): Promise<string> {
  const db = await openDB();
  const metaKey = `salt:${email.toLowerCase().trim()}`;
  const existing = await idbGet<string>(db, META_STORE, metaKey);
  if (existing) return existing;
  const saltBytes = crypto.getRandomValues(new Uint8Array(32));
  const salt = b64Encode(saltBytes);
  await idbPut(db, META_STORE, metaKey, salt);
  return salt;
}

// ── Key derivation ───────────────────────────────────────────────────────────

/**
 * Derives a 256-bit AES-GCM key from the carer's PIN using PBKDF2.
 * 100,000 iterations of SHA-256 with the per-user salt.
 * The derived key is non-exportable and held only in memory.
 */
export async function deriveKey(pin: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const pinKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64Decode(saltB64),
      iterations: 100_000,
      hash: "SHA-256",
    },
    pinKey,
    { name: "AES-GCM", length: 256 },
    false, // non-exportable
    ["encrypt", "decrypt"],
  );
}

// ── Encryption / Decryption ──────────────────────────────────────────────────

interface EncryptedBlob {
  iv: string;  // base64-encoded 96-bit IV
  ct: string;  // base64-encoded ciphertext + GCM auth tag
}

async function encryptValue(key: CryptoKey, data: unknown): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data)),
  );
  return { iv: b64Encode(iv), ct: b64Encode(new Uint8Array(ct)) };
}

async function decryptBlob<T>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64Decode(blob.iv) },
    key,
    b64Decode(blob.ct),
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypt and store a care data value in IndexedDB.
 * The plain-text value is never written to disk.
 */
export async function saveEncrypted(
  cryptoKey: CryptoKey,
  dataKey: string,
  value: unknown,
): Promise<void> {
  const db = await openDB();
  const blob = await encryptValue(cryptoKey, value);
  await idbPut(db, BLOB_STORE, dataKey, blob);
}

/**
 * Load and decrypt a care data value from IndexedDB.
 * Returns undefined if the key doesn't exist or decryption fails (wrong key / tampered data).
 * Never holds the decrypted value in persistent storage.
 */
export async function loadEncrypted<T>(
  cryptoKey: CryptoKey,
  dataKey: string,
): Promise<T | undefined> {
  const db = await openDB();
  const blob = await idbGet<EncryptedBlob>(db, BLOB_STORE, dataKey);
  if (!blob) return undefined;
  try {
    return await decryptBlob<T>(cryptoKey, blob);
  } catch {
    // Wrong key or corrupted ciphertext — return undefined safely
    return undefined;
  }
}

/**
 * Re-encrypt all stored blobs from oldKey to newKey.
 * Call this during PIN change: decrypt with old key, re-encrypt with new key.
 * Runs atomically per blob; if it throws, the partially-migrated blobs
 * remain encrypted (though possibly under mixed keys) — safe to retry.
 */
export async function reencryptAll(
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<void> {
  const db = await openDB();
  const keys = await idbGetAllKeys(db, BLOB_STORE);
  for (const k of keys) {
    const blob = await idbGet<EncryptedBlob>(db, BLOB_STORE, k);
    if (!blob) continue;
    const plaintext = await decryptBlob<unknown>(oldKey, blob);
    const newBlob = await encryptValue(newKey, plaintext);
    await idbPut(db, BLOB_STORE, k, newBlob);
  }
}

/**
 * Wipe all CAREi data from IndexedDB (encrypted blobs + per-user salt).
 * Affects only CAREi's own IndexedDB stores — no other app data is touched.
 * Call this on remote wipe request or when a carer signs out permanently.
 */
export async function wipeAllData(email?: string): Promise<void> {
  const db = await openDB();
  await idbClear(db, BLOB_STORE);
  if (email) {
    // Remove only this user's salt
    await idbDelete(db, META_STORE, `salt:${email.toLowerCase().trim()}`);
  } else {
    await idbClear(db, META_STORE);
  }
}
