const DEVICE_ID_KEY = "carei_device_id";

function isValidDeviceId(value: string | null): value is string {
  return !!value && /^[a-f0-9-]{20,80}$/i.test(value);
}

/**
 * Device id is an opaque random identifier, not a user or device fingerprint.
 * It is used only to target a CAREi container for remote wipe.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (isValidDeviceId(existing)) return existing;
  } catch {}

  const generated =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
  try {
    localStorage.setItem(DEVICE_ID_KEY, generated);
  } catch {}
  return generated;
}