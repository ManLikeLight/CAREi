/**
 * EVVClockIn — Electronic Visit Verification clock-in sheet
 *
 * Shown as a bottom-sheet when a carer taps "Start Visit".
 * Works through three methods in priority order:
 *   1. Geolocation (geofence check against client address)
 *   2. NFC tag scan (Android Chrome only — hidden elsewhere)
 *   3. Graceful offline / unverified capture
 *
 * The handover briefing remains visible behind this sheet (requirement 4).
 * Clock-in is never hard-blocked — outside-range and unverified are flagged for review.
 */

import { useState, useEffect, useRef } from "react";
import {
  type EVVRecord,
  type ClientCoords,
  CLIENT_COORDS,
  haversineMetres,
  isNFCSupported,
  getCurrentPosition,
  buildGeoEVV,
  buildNFCEVV,
  buildOfflineEVV,
} from "../lib/evv";

const COLORS = {
  darkNavy: "#0F1D34",
  navy: "#1B2A49",
  teal: "#4FD1C5",
  teal2: "#38B2AC",
  amber: "#F6B73C",
  red: "#FF5A5F",
  green: "#22C55E",
  g0: "#F8FAFC",
  g1: "#E2E8F0",
  g2: "#94A3B8",
  g3: "#475569",
};

// ── Sub-types ─────────────────────────────────────────────────────────────────

type Phase =
  | "geo-checking"
  | "geo-done"
  | "geo-denied"
  | "nfc-ready"
  | "nfc-scanning"
  | "nfc-done"
  | "offline-confirm"
  | "done";

interface Props {
  clientId:    string;
  clientName:  string;
  /** Pre-computed coordinates; falls back to CLIENT_COORDS if undefined */
  clientCoords?: ClientCoords;
  /** Registered NFC tag UID for this client (undefined = not registered) */
  nfcTagUid?:  string;
  onConfirm:   (evv: EVVRecord) => void;
  onCancel:    () => void;
}

export default function EVVClockIn({
  clientId,
  clientName,
  clientCoords,
  nfcTagUid,
  onConfirm,
  onCancel,
}: Props) {
  const coords  = clientCoords ?? CLIENT_COORDS[clientId];
  const nfcSupported = isNFCSupported();

  const [phase,  setPhase]  = useState<Phase>("geo-checking");
  const [evv,    setEvv]    = useState<EVVRecord | null>(null);
  const [geoErr, setGeoErr] = useState("");
  const [nfcErr, setNfcErr] = useState("");
  const nfcAbortRef = useRef<AbortController | null>(null);

  // ── Auto-start geolocation on mount ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getCurrentPosition();
      if (cancelled) return;

      if (result.ok && result.coords) {
        const dist = coords
          ? haversineMetres(result.coords.lat, result.coords.lng, coords.lat, coords.lng)
          : Infinity;
        const geofence = coords?.geofenceMetres ?? 100;
        const record   = buildGeoEVV(result.coords, dist, geofence);
        setEvv(record);
        setPhase("geo-done");
      } else {
        setGeoErr(result.error ?? "Location unavailable.");
        setPhase(result.denied ? "geo-denied" : "geo-denied");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── NFC scan ─────────────────────────────────────────────────────────────
  async function startNFCScan() {
    if (!nfcSupported) return;
    setPhase("nfc-scanning");
    setNfcErr("");
    try {
      const abort = new AbortController();
      nfcAbortRef.current = abort;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).NDEFReader();
      await reader.scan({ signal: abort.signal });
      reader.addEventListener(
        "reading",
        ({ serialNumber }: { serialNumber: string }) => {
          abort.abort();
          const record = buildNFCEVV(serialNumber, nfcTagUid);
          setEvv(record);
          setPhase("nfc-done");
        },
        { once: true },
      );
      reader.addEventListener("error", () => {
        setNfcErr("NFC scan failed. Try again or use offline clock-in.");
        setPhase("nfc-ready");
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AbortError") || msg.includes("abort")) return;
      setNfcErr("NFC unavailable: " + msg);
      setPhase("nfc-ready");
    }
  }

  function cancelNFC() {
    nfcAbortRef.current?.abort();
    setPhase("nfc-ready");
  }

  function useOffline() {
    setEvv(buildOfflineEVV());
    setPhase("done");
  }

  function confirm() {
    if (evv) onConfirm(evv);
  }

  // ── Status badge helper ───────────────────────────────────────────────────
  function StatusBadge({ record }: { record: EVVRecord }) {
    const cfg: Record<string, { icon: string; label: string; color: string; bg: string }> = {
      "verified":      { icon: "✓", label: "Location verified",      color: COLORS.green, bg: "rgba(34,197,94,0.12)" },
      "outside-range": { icon: "⚠", label: "Outside range — flagged", color: COLORS.amber, bg: "rgba(246,183,60,0.12)" },
      "nfc-verified":  { icon: "✓", label: "NFC tag verified",        color: COLORS.green, bg: "rgba(34,197,94,0.12)" },
      "nfc-mismatch":  { icon: "⚠", label: "Tag mismatch — flagged",  color: COLORS.amber, bg: "rgba(246,183,60,0.12)" },
      "unverified":    { icon: "!", label: "Unverified — pending review", color: COLORS.g2, bg: "rgba(255,255,255,0.07)" },
    };
    const c = cfg[record.status] ?? cfg["unverified"];
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 12, padding: "12px 14px" }}>
        <span style={{ fontSize: 20, lineHeight: 1, color: c.color, flexShrink: 0 }}>{c.icon}</span>
        <div>
          <div style={{ color: c.color, fontWeight: 700, fontSize: 13 }}>{c.label}</div>
          {record.distanceMetres !== undefined && (
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>
              {Math.round(record.distanceMetres)} m from {clientName.split(" ")[0]}'s address
              {record.coords?.accuracy !== undefined && ` · ±${Math.round(record.coords.accuracy)} m accuracy`}
            </div>
          )}
          {record.method === "nfc" && record.nfcUid && (
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>Tag UID: {record.nfcUid}</div>
          )}
          {record.flagged && record.flagReason && (
            <div style={{ color: COLORS.g3, fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{record.flagReason}</div>
          )}
          <div style={{ color: COLORS.g3, fontSize: 10, marginTop: 4 }}>
            {new Date(record.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        zIndex: 50,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: COLORS.navy,
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px 32px",
          maxHeight: "88vh",
          overflowY: "auto",
          animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 18px" }} />

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(79,209,197,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            📍
          </div>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff" }}>Verify Your Presence</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 1 }}>{clientName} · Electronic Visit Verification</div>
          </div>
        </div>

        {/* ── Phase: geo checking ── */}
        {phase === "geo-checking" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 14px", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0,1,2].map(d => (
                  <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.teal, animation: `pulse-dot 1.2s ease-in-out ${d*0.4}s infinite` }} />
                ))}
              </div>
              <div>
                <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Checking your location…</div>
                <div style={{ color: COLORS.g3, fontSize: 11, marginTop: 2 }}>Allow location access if prompted</div>
              </div>
            </div>
            <div style={{ background: "rgba(79,209,197,0.06)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8 }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <span style={{ color: COLORS.g2, fontSize: 11, lineHeight: 1.5 }}>Your location is used only to verify you're at {clientName.split(" ")[0]}'s address. It is not tracked continuously.</span>
            </div>
          </div>
        )}

        {/* ── Phase: geo done (success — within or outside range) ── */}
        {phase === "geo-done" && evv && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StatusBadge record={evv} />
            {evv.status === "outside-range" && (
              <div style={{ background: "rgba(246,183,60,0.07)", border: "1px solid rgba(246,183,60,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: COLORS.amber, fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Flagged for review</div>
                <div style={{ color: COLORS.g2, fontSize: 11, lineHeight: 1.5 }}>You can still clock in. Your supervisor will be notified and may follow up after the visit.</div>
              </div>
            )}
          </div>
        )}

        {/* ── Phase: geo denied / failed ── */}
        {(phase === "geo-denied" || phase === "nfc-ready") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📍 Location unavailable</div>
              <div style={{ color: COLORS.g3, fontSize: 11, lineHeight: 1.5 }}>{geoErr}</div>
            </div>

            {/* NFC option — only shown on Android Chrome */}
            {nfcSupported && (
              <div style={{ background: "rgba(79,209,197,0.06)", border: "1px solid rgba(79,209,197,0.2)", borderRadius: 12, padding: "14px" }}>
                <div style={{ color: COLORS.teal, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📱 NFC tag scan available</div>
                <div style={{ color: COLORS.g2, fontSize: 11, lineHeight: 1.5, marginBottom: 10 }}>
                  {nfcTagUid
                    ? "Tap your phone to the NFC tag at the client's property to verify your presence."
                    : "No NFC tag is registered for this client. Scanning will record the tag UID for admin review."}
                </div>
                {nfcErr && <div style={{ color: COLORS.amber, fontSize: 11, marginBottom: 8 }}>{nfcErr}</div>}
                <button onClick={() => { setPhase("nfc-ready"); startNFCScan(); }} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${COLORS.teal},${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Scan NFC Tag
                </button>
              </div>
            )}

            {/* Offline fallback */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ color: COLORS.g2, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Clock in without verification</div>
              <div style={{ color: COLORS.g3, fontSize: 11, lineHeight: 1.5, marginBottom: 10 }}>
                Records a timestamp and flags this visit as unverified for supervisor review. Use only if location and NFC are both unavailable.
              </div>
              <button onClick={useOffline} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontFamily: "DM Sans,sans-serif", fontSize: 13, cursor: "pointer" }}>
                Continue without verification →
              </button>
            </div>
          </div>
        )}

        {/* ── Phase: NFC scanning ── */}
        {phase === "nfc-scanning" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(79,209,197,0.08)", border: "1px solid rgba(79,209,197,0.25)", borderRadius: 12, padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 40 }}>📱</div>
              <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 14 }}>Hold your phone near the NFC tag</div>
              <div style={{ color: COLORS.g2, fontSize: 12 }}>Keep it close until the phone vibrates or beeps</div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.teal, animation: `pulse-dot 1.2s ease-in-out ${d*0.4}s infinite` }} />)}
              </div>
            </div>
            <button onClick={cancelNFC} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontFamily: "DM Sans,sans-serif", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}

        {/* ── Phase: NFC done ── */}
        {phase === "nfc-done" && evv && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StatusBadge record={evv} />
            {evv.status === "nfc-mismatch" && (
              <div style={{ background: "rgba(246,183,60,0.07)", border: "1px solid rgba(246,183,60,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: COLORS.amber, fontSize: 11, lineHeight: 1.5 }}>
                  The scanned tag does not match the registered tag. You can still clock in — this will be flagged for your supervisor.
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={startNFCScan} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(79,209,197,0.3)", background: "transparent", color: COLORS.teal, fontFamily: "DM Sans,sans-serif", fontSize: 12, cursor: "pointer" }}>
                Scan again
              </button>
            </div>
          </div>
        )}

        {/* ── Phase: offline confirm ── */}
        {phase === "offline-confirm" && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px" }}>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Clock in without verification?</div>
            <div style={{ color: COLORS.g2, fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
              This visit will be marked as unverified and flagged for your supervisor to review. Please note the time manually if possible.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPhase("geo-denied")} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontFamily: "DM Sans,sans-serif", fontSize: 13, cursor: "pointer" }}>Back</button>
              <button onClick={useOffline} style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: COLORS.amber, color: COLORS.darkNavy, fontFamily: "DM Sans,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Confirm Unverified</button>
            </div>
          </div>
        )}

        {/* ── Phase: done (offline path) ── */}
        {phase === "done" && evv && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StatusBadge record={evv} />
          </div>
        )}

        {/* ── Confirm / Cancel buttons (shown when a result is ready) ── */}
        {(phase === "geo-done" || phase === "nfc-done" || phase === "done") && evv && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontFamily: "DM Sans,sans-serif", fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={confirm} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg,${COLORS.teal},${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans,sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {evv.flagged ? "Clock In (flagged) →" : "Clock In →"}
            </button>
          </div>
        )}

        {/* Cancel for early phases */}
        {(phase === "geo-checking") && (
          <button onClick={onCancel} style={{ marginTop: 16, width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: COLORS.g3, fontFamily: "DM Sans,sans-serif", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.75); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
