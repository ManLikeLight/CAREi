/**
 * AppLockScreen
 * Shown every time the app is opened or resumed from the background.
 * The carer must verify with their 4-digit PIN (or biometric if registered).
 * On success, the encryption key is derived and passed to onUnlock — it is
 * never written to disk.
 */

import { useState, useRef, useEffect } from "react";
import {
  deriveKey,
  getOrCreateSalt,
  loadEncrypted,
  saveEncrypted,
} from "../lib/careStore";
import {
  isPlatformAuthenticatorAvailable,
  isBiometricRegistered,
  registerBiometric,
  verifyBiometric,
  clearBiometricRegistration,
} from "../lib/webAuthn";
import { getMemoryKey } from "../lib/keyStore";

const COLORS = {
  navy: "#1B2A49",
  darkNavy: "#0F1D34",
  teal: "#4FD1C5",
  teal2: "#38B2AC",
  red: "#FF5A5F",
  green: "#22C55E",
  amber: "#F6B73C",
  g0: "#F8FAFC",
  g1: "#E2E8F0",
  g2: "#94A3B8",
  g3: "#475569",
};

// Sentinel key used to verify that a derived key is correct (can decrypt stored data)
const SENTINEL_KEY = "__carei_sentinel__";
const SENTINEL_VALUE = { valid: true, marker: "CAREi-lock-sentinel-v1" };

interface Props {
  /** Called when the carer has successfully authenticated */
  onUnlock: (key: CryptoKey, email: string) => void;
  /** Called when the carer chooses to sign out entirely */
  onSignOut: () => void;
}

export default function AppLockScreen({ onUnlock, onSignOut }: Props) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [offerBiometric, setOfferBiometric] = useState(false);   // after first PIN success
  const [unlocked, setUnlocked] = useState(false);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Pull account info from sessionStorage (safe — no PHI, just name/email)
  const accountRaw = (() => {
    try { return JSON.parse(sessionStorage.getItem("carei_account") ?? "{}"); } catch { return {}; }
  })();
  const email: string = accountRaw.email ?? "";
  const displayName: string = accountRaw.name ?? "Carer";

  // Check biometric availability on mount
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then((avail) => {
      setBiometricAvailable(avail && isBiometricRegistered());
    });
  }, []);

  function handlePinChange(i: number, val: string) {
    const next = [...pin];
    next[i] = val;
    setPin(next);
    if (val && i < 3) setTimeout(() => pinRefs[i + 1].current?.focus(), 0);
    if (next.every((d) => d)) handleVerifyPin(next.join(""));
  }

  function handlePinKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      const next = [...pin];
      next[i - 1] = "";
      setPin(next);
      setTimeout(() => pinRefs[i - 1].current?.focus(), 0);
    }
  }

  async function handleVerifyPin(code?: string) {
    const p = code ?? pin.join("");
    if (p.length < 4) { setError("Please enter all 4 digits."); return; }
    if (!email) { setError("Session expired. Please sign in again."); return; }
    setError("");
    setLoading(true);
    try {
      const salt = await getOrCreateSalt(email);
      const key = await deriveKey(p, salt);

      // Verify the key is correct by checking the sentinel
      const sentinel = await loadEncrypted<typeof SENTINEL_VALUE>(key, SENTINEL_KEY);
      if (sentinel && sentinel.marker !== SENTINEL_VALUE.marker) {
        // Sentinel exists but content is wrong — corrupted
        throw new Error("Corrupted sentinel");
      }
      if (!sentinel) {
        // No sentinel yet (first lock cycle) — write one so future unlocks can verify
        await saveEncrypted(key, SENTINEL_KEY, SENTINEL_VALUE);
      }

      setUnlocked(true);

      // Offer biometric registration if available but not yet registered
      const bioAvail = await isPlatformAuthenticatorAvailable();
      if (bioAvail && !isBiometricRegistered()) {
        setOfferBiometric(true);
        setTimeout(() => {
          onUnlock(key, email);
          // Offer to register biometric in the background
          registerBiometric(email, displayName).catch(() => {});
        }, 800);
      } else {
        setTimeout(() => onUnlock(key, email), 600);
      }
    } catch {
      setError("Incorrect PIN. Please try again.");
      setPin(["", "", "", ""]);
      setLoading(false);
      setTimeout(() => pinRefs[0].current?.focus(), 50);
    }
  }

  async function handleBiometric() {
    // Biometric can only unlock if we already have the key in memory (same tab session)
    const existingKey = getMemoryKey();
    if (!existingKey) {
      setError("Biometric unlock is only available for this session. Please enter your PIN.");
      return;
    }
    setBiometricLoading(true);
    try {
      const ok = await verifyBiometric();
      if (ok) {
        setUnlocked(true);
        setTimeout(() => onUnlock(existingKey, email), 400);
      } else {
        setError("Biometric check failed. Please enter your PIN.");
      }
    } catch {
      setError("Biometric check failed. Please enter your PIN.");
    } finally {
      setBiometricLoading(false);
    }
  }

  function handleSignOut() {
    clearBiometricRegistration();
    sessionStorage.removeItem("carei_account");
    sessionStorage.removeItem("carei_screen");
    onSignOut();
  }

  const firstName = displayName.split(" ")[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 28px",
        fontFamily: "DM Sans, sans-serif",
        zIndex: 9999,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "DM Serif Display, serif",
          fontSize: 32,
          color: "#fff",
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        CARE<span style={{ color: COLORS.teal }}>i</span>
      </div>

      {/* Greeting */}
      <div style={{ color: COLORS.g2, fontSize: 15, marginBottom: 36, textAlign: "center" }}>
        {unlocked ? `Welcome back, ${firstName}` : `${firstName}, verify it's you`}
      </div>

      {/* Success state */}
      {unlocked && (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32">
            <polyline
              points="6,17 13,24 26,10"
              fill="none"
              stroke={COLORS.darkNavy}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* PIN boxes */}
      {!unlocked && (
        <>
          <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
            {pin.map((v, i) => (
              <input
                key={i}
                ref={pinRefs[i]}
                value={v ? "●" : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace("●", "").replace(/\D/g, "");
                  if (raw.length <= 1) handlePinChange(i, raw);
                }}
                onKeyDown={(e) => handlePinKey(i, e)}
                maxLength={1}
                inputMode="numeric"
                autoFocus={i === 0}
                disabled={loading}
                style={{
                  width: 60,
                  height: 70,
                  borderRadius: 14,
                  border: `2px solid ${error ? "rgba(255,90,95,0.5)" : v ? COLORS.teal : "rgba(255,255,255,0.2)"}`,
                  background: "rgba(255,255,255,0.07)",
                  color: v ? COLORS.teal : "transparent",
                  fontSize: 30,
                  fontWeight: 700,
                  textAlign: "center" as const,
                  outline: "none",
                  caretColor: "transparent",
                  fontFamily: "DM Sans, sans-serif",
                  transition: "border-color 0.15s",
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                color: COLORS.red,
                fontSize: 13,
                textAlign: "center",
                marginBottom: 16,
                maxWidth: 260,
              }}
            >
              {error}
            </div>
          )}

          {/* Loading indicator */}
          {loading && !error && (
            <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: COLORS.teal,
                    animation: `pulse-dot 1.2s ease-in-out ${d * 0.4}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Biometric unlock button */}
          {biometricAvailable && getMemoryKey() && !loading && (
            <button
              onClick={handleBiometric}
              disabled={biometricLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 24px",
                borderRadius: 14,
                border: `1.5px solid rgba(79,209,197,0.35)`,
                background: "rgba(79,209,197,0.08)",
                color: COLORS.teal,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 12,
                width: "100%",
                maxWidth: 300,
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 20 }}>🔒</span>
              {biometricLoading ? "Verifying…" : "Use Face ID / Touch ID"}
            </button>
          )}

          {/* Manual verify (shown when PIN is complete but loading hasn't triggered) */}
          <button
            onClick={() => handleVerifyPin()}
            disabled={loading || pin.some((d) => !d)}
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background:
                !loading && pin.every((d) => d)
                  ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`
                  : "rgba(255,255,255,0.08)",
              color:
                !loading && pin.every((d) => d)
                  ? COLORS.darkNavy
                  : COLORS.g3,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: !loading && pin.every((d) => d) ? "pointer" : "not-allowed",
              marginBottom: 24,
            }}
          >
            {loading ? "Verifying…" : "Unlock"}
          </button>

          {/* Security note */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: COLORS.g3,
              fontSize: 11,
              marginBottom: 32,
            }}
          >
            <span>🔐</span>
            <span>Care data is encrypted on this device</span>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{
              background: "none",
              border: "none",
              color: COLORS.g3,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Sign out
          </button>
        </>
      )}

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
