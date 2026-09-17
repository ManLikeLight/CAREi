export const LOCK_TIMEOUT_OPTIONS = [5, 15, 30, 60] as const;
export const DEFAULT_LOCK_TIMEOUT_MINUTES = 15;
const LOCK_TIMEOUT_KEY = "carei_lock_timeout_minutes";

export function getLockTimeoutMinutes(): number {
  try {
    const value = Number(localStorage.getItem(LOCK_TIMEOUT_KEY));
    return LOCK_TIMEOUT_OPTIONS.includes(value as (typeof LOCK_TIMEOUT_OPTIONS)[number])
      ? value
      : DEFAULT_LOCK_TIMEOUT_MINUTES;
  } catch {
    return DEFAULT_LOCK_TIMEOUT_MINUTES;
  }
}

export function setLockTimeoutMinutes(value: number): void {
  if (!LOCK_TIMEOUT_OPTIONS.includes(value as (typeof LOCK_TIMEOUT_OPTIONS)[number])) return;
  try {
    localStorage.setItem(LOCK_TIMEOUT_KEY, String(value));
  } catch {}
}