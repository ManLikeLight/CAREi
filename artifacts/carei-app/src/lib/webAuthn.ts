/**
 * WebAuthn biometric helpers for CAREi app lock.
 *
 * Biometric can only unlock an already-authenticated session (where the
 * CryptoKey is already in memory). A fresh tab or hard refresh always
 * requires the PIN — biometric never provides the encryption key itself.
 *
 * Falls back silently to PIN when:
 *  - The browser doesn't support PublicKeyCredential
 *  - No platform authenticator is available (no Face ID / Touch ID / Windows Hello)
 *  - The user cancels or the assertion fails
 */

const RP_NAME = "CAREi";

function getRpId(): string {
  return window.location.hostname || "localhost";
}

/** True if the browser exposes the WebAuthn API at all */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/** True if the device has a platform authenticator (Touch ID, Face ID, Windows Hello) */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!isWebAuthnSupported()) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Whether a credential has been registered for this session */
export function isBiometricRegistered(): boolean {
  try {
    return localStorage.getItem("carei_biometric_reg") === "1";
  } catch {
    return false;
  }
}

function markBiometricRegistered(): void {
  try { localStorage.setItem("carei_biometric_reg", "1"); } catch {}
}

export function clearBiometricRegistration(): void {
  try { localStorage.removeItem("carei_biometric_reg"); } catch {}
}

/**
 * Register a platform credential for this user.
 * Call once after the first successful PIN unlock.
 * The credential is stored on-device by the browser/OS.
 */
export async function registerBiometric(
  email: string,
  displayName: string,
): Promise<boolean> {
  try {
    if (!(await isPlatformAuthenticatorAvailable())) return false;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    // userId must be 1–64 bytes
    const userId = new TextEncoder().encode(email.slice(0, 64).padEnd(1, "x"));

    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: getRpId(), name: RP_NAME },
        user: { id: userId, name: email, displayName },
        pubKeyCredParams: [
          { alg: -7,   type: "public-key" as const },  // ES256
          { alg: -257, type: "public-key" as const },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform" as const,
          userVerification: "required" as const,
          residentKey: "preferred" as const,
        },
        timeout: 60_000,
        attestation: "none" as const,
      },
    });

    markBiometricRegistered();
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify a biometric assertion (Touch ID / Face ID / Windows Hello).
 * Returns true on success, false on failure or cancellation.
 * Does not throw.
 */
export async function verifyBiometric(): Promise<boolean> {
  try {
    if (!(await isPlatformAuthenticatorAvailable())) return false;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const result = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: getRpId(),
        userVerification: "required" as const,
        timeout: 60_000,
      },
    });

    return result !== null;
  } catch {
    return false;
  }
}
