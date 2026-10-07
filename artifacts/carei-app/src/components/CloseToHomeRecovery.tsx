import { useState, type FormEvent } from "react";
import { ctp } from "@/lib/closeToHome";
import type { CtpInviteAcknowledgement } from "@workspace/api-client-react";

export default function RecoveryForm() {
  const [agency, setAgency] = useState(() => new URLSearchParams(window.location.search).get("agency") ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function request(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await ctp<CtpInviteAcknowledgement>("/auth/recover", { method:"POST", body:{agency:agency.trim(),email:email.trim()} });
      setMessage(result.message); setEmail("");
    } catch (e) { setError(e instanceof Error ? e.message : "Recovery could not be requested."); }
    finally { setBusy(false); }
  }
  return <details className="cth-card" style={{marginTop:16}} data-testid="recovery-panel">
    <summary>Need a new private code?</summary>
    <p className="cth-muted">Request a replacement for a lost, expired or used code, or a forgotten password. It can only go to your privately verified address. If that address has changed, contact your organisation for verification. Staff cannot redirect codes.</p>
    <form onSubmit={e=>void request(e)}>
      <label htmlFor="recovery-agency">Agency reference</label>
      <input id="recovery-agency" required maxLength={200} value={agency} onChange={e=>setAgency(e.target.value)} disabled={busy} />
      <label htmlFor="recovery-email">Your verified email address</label>
      <input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} />
      <button className="cth-btn primary" disabled={busy} data-testid="button-recovery">{busy?"Requesting…":"Request a private code"}</button>
      {message && <p role="status" data-testid="recovery-message">{message}</p>}
      {error && <p role="alert" className="cth-err">{error}</p>}
    </form>
  </details>;
}
