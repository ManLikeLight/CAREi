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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CAREiApp from "./pages/CAREiApp";
import CloseToHomePortal from "./components/CloseToHomePortal";
import AppLockScreen from "./components/AppLockScreen";
import { purgeExpiredData, wipeAllData } from "./lib/careStore";
import { clearBiometricRegistration } from "./lib/webAuthn";
import { getDeviceId } from "./lib/deviceIdentity";
import { getLockTimeoutMinutes } from "./lib/appSecurity";
import {
  getMemoryKey,
  setMemoryKey,
  getMemoryEmail,
  setMemoryEmail,
  clearMemory,
} from "./lib/keyStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
    const { email, sessionToken } = JSON.parse(raw) as {
      email?: string;
      sessionToken?: string;
    };
    if (!email || !sessionToken) return false;
    const deviceId = getDeviceId();

    const res = await fetch(`/api/auth/status?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) {
      // A signed token that is rejected while online means the cached
      // session is no longer trusted. API outages and offline mode remain
      // fail-open so carers can continue their offline workflow.
      if (navigator.onLine && [401, 403, 404].includes(res.status)) {
        await wipeAllData(email);
        clearMemory();
        clearBiometricRegistration();
        sessionStorage.removeItem("carei_account");
        sessionStorage.removeItem("carei_screen");
        return true;
      }
      return false;
    }
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ deviceId }),
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
  const familyPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/family`;
  // Trusted people must never mount the staff lock, device wipe, or offline care store.
  const portalPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/close-to-home`;
  if ([familyPath, portalPath].includes(window.location.pathname.replace(/\/$/, ""))) return <CloseToHomePortal />;
  return <StaffApp />;
}

function StaffApp() {
  const [memoryKey, setKeyState] = useState<CryptoKey | null>(() => getMemoryKey());
  const [memoryEmail, setEmailState] = useState<string>(() => getMemoryEmail());
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

  // Lock after configurable inactivity, while still allowing offline use.
  useEffect(() => {
    if (locked || !hasAccount()) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLocked(true), getLockTimeoutMinutes() * 60_000);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [locked]);

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

    void purgeExpiredData().catch(() => {});
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
          setKeyState(key); setEmailState(email);
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
    <QueryClientProvider client={queryClient}>
      <CAREiApp
        cryptoKey={memoryKey}
        carerEmailForStore={memoryEmail}
        onSessionKey={(key, email) => { setMemoryKey(key); setMemoryEmail(email); setKeyState(key); setEmailState(email); }}
        onLock={() => setLocked(true)}
      />
    </QueryClientProvider>
  );
}
