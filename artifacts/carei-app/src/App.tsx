/**
 * App root — security wrapper
 *
 * Responsibilities:
 *  1. Show AppLockScreen before any care data when the app opens or resumes
 *  2. Hold the in-memory CryptoKey (never written to disk)
 *  3. Lock on visibilitychange (app backgrounded)
 *  4. Check for remote wipe on launch and on reconnect
 */

import { useState, useEffect } from "react";
import CAREiApp from "./pages/CAREiApp";
import AppLockScreen from "./components/AppLockScreen";
import { wipeAllData } from "./lib/careStore";
import { clearBiometricRegistration } from "./lib/webAuthn";
import {
  getMemoryKey,
  setMemoryKey,
  getMemoryEmail,
  setMemoryEmail,
  clearMemory,
} from "./lib/keyStore";

function hasAccount(): boolean {
  try {
    return !!sessionStorage.getItem("carei_account");
  } catch {
    return false;
  }
}

async function performRemoteWipeCheck(): Promise<boolean> {
  try {
    const raw = sessionStorage.getItem("carei_account");
    if (!raw) return false;
    const { email } = JSON.parse(raw) as { email?: string };
    if (!email) return false;

    const res = await fetch(`/api/auth/status?email=${encodeURIComponent(email)}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { wipeRequested?: boolean; deactivated?: boolean };

    if (data.wipeRequested || data.deactivated) {
      // Wipe all local CAREi data
      await wipeAllData(email);
      clearMemory();
      clearBiometricRegistration();
      sessionStorage.clear();

      // Acknowledge the wipe so the server clears the flag
      await fetch("/api/auth/wipe-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});

      return true; // wipe was performed
    }
    return false;
  } catch {
    // Network is offline or server unavailable — fail open (don't wipe offline)
    return false;
  }
}

export default function App() {
  // locked=true → show AppLockScreen before any care data
  const [locked, setLocked] = useState<boolean>(() => {
    // If there's a saved account and no in-memory key, require PIN
    return hasAccount() && !getMemoryKey();
  });

  // After wipe: reload to splash
  const [wiped, setWiped] = useState(false);

  // Lock when app goes to background
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        // Lock the UI — the CryptoKey stays in memory so biometric
        // unlock works within the same session
        setLocked(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Remote wipe check on launch and on reconnect
  useEffect(() => {
    async function check() {
      const wiped = await performRemoteWipeCheck();
      if (wiped) {
        setWiped(true);
        // Small delay so the wipe-ack can complete
        setTimeout(() => window.location.reload(), 300);
      }
    }

    check();
    window.addEventListener("online", check);
    return () => window.removeEventListener("online", check);
  }, []);

  if (wiped) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1D34",
          fontFamily: "DM Sans, sans-serif",
          color: "#94A3B8",
          gap: 12,
          fontSize: 14,
        }}
      >
        <span style={{ fontSize: 32 }}>🔒</span>
        <span>Device data cleared by your organisation.</span>
      </div>
    );
  }

  if (locked) {
    return (
      <AppLockScreen
        onUnlock={(key, email) => {
          setMemoryKey(key);
          setMemoryEmail(email);
          setLocked(false);
        }}
        onSignOut={() => {
          clearMemory();
          clearBiometricRegistration();
          setLocked(false);  // Let CAREiApp show splash
        }}
      />
    );
  }

  return (
    <CAREiApp
      cryptoKey={getMemoryKey()}
      carerEmailForStore={getMemoryEmail()}
      onLock={() => setLocked(true)}
    />
  );
}
