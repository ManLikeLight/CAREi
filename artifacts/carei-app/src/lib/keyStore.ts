/**
 * Module-level in-memory key store.
 * Intentionally NOT persisted to disk or sessionStorage.
 * Cleared automatically on hard refresh / tab close (VM reset).
 */

let _key: CryptoKey | null = null;
let _email: string = "";

export function getMemoryKey(): CryptoKey | null { return _key; }
export function setMemoryKey(k: CryptoKey | null): void { _key = k; }

export function getMemoryEmail(): string { return _email; }
export function setMemoryEmail(e: string): void { _email = e; }

export function clearMemory(): void {
  _key = null;
  _email = "";
}
