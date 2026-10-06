import { useEffect, useRef, useState } from "react";
import {
  endFamilySession, fetchFamilySession, fetchFamilyUpdateConsent, fetchSentFamilyUpdates,
  FamilyRequestError, redeemFamilyInvite, saveFamilyUpdateConsent,
  type FamilyRecipient, type FamilyUpdateConsentStatus, type SentFamilyUpdate,
} from "../lib/familyUpdates";

// This portal never accepts a carer token, local visit data, or staff-provided identity.
export default function FamilyView({ onBack }: { onBack?: () => void }) {
  const [identity, setIdentity] = useState<FamilyRecipient | null>(null);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState<FamilyUpdateConsentStatus | null>(null);
  const [updates, setUpdates] = useState<SentFamilyUpdate[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);

  function clearRecipient() {
    generation.current++;
    setIdentity(null); setConsent(null); setUpdates([]); setConfirmed(false);
  }
  useEffect(() => {
    let active = true;
    fetchFamilySession().then(value => { if (active) setIdentity(value); })
      .catch(e => { if (active && !(e instanceof FamilyRequestError && e.status === 401)) setError(e.message); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; generation.current++; };
  }, []);

  useEffect(() => {
    if (!identity) return;
    let active = true;
    setConsent(null); setUpdates([]); setConfirmed(false);
    async function refresh() {
      const current = generation.current;
      try {
        const [record, sent] = await Promise.all([fetchFamilyUpdateConsent(identity!), fetchSentFamilyUpdates(identity!)]);
        if (active && current === generation.current) {
          setConsent(record); setUpdates(sent); setError("");
        }
      } catch (e) {
        if (!active || current !== generation.current) return;
        // Do not leave private summaries visible when authentication can no longer be verified.
        setConsent(null); setUpdates([]);
        if (e instanceof FamilyRequestError && e.status === 401) clearRecipient();
        setError(e instanceof Error ? e.message : "Could not load updates.");
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false; window.clearInterval(timer);
      window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh);
    };
  }, [identity]);

  async function signIn() {
    setBusy(true); setError("");
    try {
      const recipient = await redeemFamilyInvite(code.trim());
      clearRecipient(); setIdentity(recipient); setCode("");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  async function changeConsent(optedIn: boolean) {
    if (!identity || !consent || (optedIn && !confirmed)) return;
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const saved = await saveFamilyUpdateConsent(identity, optedIn);
      if (current === generation.current) { setConsent(saved); setConfirmed(false); }
    } catch (e) {
      if (current !== generation.current) return;
      if (e instanceof FamilyRequestError && e.status === 401) clearRecipient();
      setError(e instanceof Error ? e.message : "Consent could not be saved.");
    } finally { setBusy(false); }
  }
  async function signOut() {
    generation.current++;
    setBusy(true); setError("");
    try { await endFamilySession(); clearRecipient(); }
    catch (e) {
      clearRecipient();
      setError(e instanceof Error ? e.message : "Sign-out could not be confirmed.");
    } finally { setBusy(false); }
  }
  const button = { background: "#4FD1C5", color: "#0A1628", border: 0, borderRadius: 10, padding: "12px 18px", fontWeight: 700, cursor: "pointer" };
  const card = { background: "#1B2A49", padding: 20, borderRadius: 16, marginTop: 18 };
  return (
    <main style={{ minHeight: "100vh", background: "#0A1628", color: "#F8FAFC", fontFamily: "DM Sans, sans-serif", padding: "28px 20px", boxSizing: "border-box" }}>
      <style>{".family-portal button:disabled { opacity: 0.45; cursor: not-allowed !important; }"}</style>
      <div className="family-portal" style={{ maxWidth: 560, margin: "0 auto" }}>
        {onBack && <button style={button} onClick={onBack}>Back to staff view</button>}
        <h1 style={{ fontFamily: "DM Serif Display, serif", fontSize: 28, marginBottom: 20 }}>CAREi Family Updates</h1>
        {checking ? <p>Checking your family session…</p> : !identity ? (
          <form style={card} onSubmit={e => { e.preventDefault(); void signIn(); }}>
            <h2>Sign in with your invite</h2>
            <p style={{ color: "#94A3B8", lineHeight: 1.6 }}>Use the one-time code provided privately by your care organisation. Staff sign-ins cannot access family updates.</p>
            <label htmlFor="family-invite">One-time invite code</label>
            <input id="family-invite" type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} required
              style={{ display: "block", width: "100%", boxSizing: "border-box", margin: "10px 0 16px", padding: 12, borderRadius: 8, border: "1px solid #94A3B8", background: "#0A1628", color: "#F8FAFC" }} />
            <button style={button} disabled={busy || !code.trim()}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        ) : (
          <>
            <p>Signed in as {identity.familyMemberName}</p>
            <button style={button} disabled={busy} onClick={() => void signOut()}>Sign out</button>
            <section style={card}>
              <h2>Your consent</h2>
              {!consent ? <p>Loading consent…</p> : consent.optedIn ? (
                <>
                  <p>Automated visit summaries are enabled. You can stop future updates at any time.</p>
                  <button style={button} disabled={busy} onClick={() => void changeConsent(false)}>Withdraw consent</button>
                </>
              ) : (
                <>
                  <p>Opt in to receive approved summaries of completed visits for your linked care recipient.</p>
                  <label style={{ display: "block", marginBottom: 16 }}>
                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                    {" "}I confirm that I want to receive these family updates.
                  </label>
                  <button style={button} disabled={busy || !confirmed} onClick={() => void changeConsent(true)}>Confirm consent</button>
                </>
              )}
            </section>
            <section style={card}>
              <h2>Delivered updates</h2>
              {!updates.length ? <p style={{ color: "#94A3B8" }}>No delivered updates yet. Summaries appear here after consent and a completed, synced visit.</p> :
                updates.map(update => (
                  <article key={update.id} style={{ borderTop: "1px solid #475569", padding: "16px 0" }}>
                    <p style={{ lineHeight: 1.6 }}>{update.summary}</p>
                    <small style={{ color: "#94A3B8" }}>{update.sentAt ? new Date(update.sentAt).toLocaleString("en-GB") : ""}</small>
                  </article>
                ))}
            </section>
          </>
        )}
        {error && <p role="alert" style={{ color: "#FF9A9E", lineHeight: 1.5 }}>{error}</p>}
      </div>
    </main>
  );
}
