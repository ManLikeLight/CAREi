import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CTP_CATEGORIES, ctp } from "@/lib/closeToHome";
import type { Category, Concern, Flags, Link, ManagerData } from "@/lib/closeToHome";
import "./close-to-home.css";

type Props = { staffToken: string; onBack: () => void };
type Audit = { id: string; action: string; actorType: string; actorId: string; target: string; at: string };
type VisitRow = { id: string; clientId: string; clientName: string; status: string; verified: boolean; synced: boolean; storyVersions: { id: string; version: number; status: string; model: string }[] };
const FLAGS: (keyof Flags)[] = ["can_view", "can_contribute", "can_notify", "client_restricted"];
const lab = (s: string) => s.replace(/_/g, " ");
const when = (s?: string | null) => (s ? new Date(s).toLocaleString() : "none");

export default function Manager({ staffToken, onBack }: Props) {
  const [data, setData] = useState<ManagerData | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await ctp<ManagerData>("/manager", { staffToken })); setErr("");
      try { setVisits((await ctp<{ visits: VisitRow[] }>("/manager/visits", { staffToken })).visits); } catch { setVisits(null); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not load."); }
  }, [staffToken]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setErr(""); setMsg("");
    try { await fn(); setMsg(ok); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Failed."); } finally { setBusy(false); }
  };
  const mut = <T,>(path: string, method: string, body?: unknown) => ctp<T>(path, { method, body, staffToken });

  return (
    <div className="cth"><div className="cth-banner">SAMPLE ONLY — fictional data. No email or message is sent from this screen.</div>
      <div className="cth-wrap cth-wide">
        <div className="cth-row" style={{ justifyContent: "space-between" }}>
          <h1>Close to Home: agency manager</h1>
          <button className="cth-btn" onClick={onBack} data-testid="button-back">Back</button>
        </div>
        {err && <div className="cth-err" role="alert" data-testid="text-error">{err} <button className="cth-btn sm" onClick={() => void load()}>Retry</button></div>}
        {msg && <div className="cth-ok" data-testid="text-message">{msg}</div>}
        {!data && !err && <><div className="cth-skel" /><div className="cth-skel" /></>}
        {data && <>
          {data.overdueReviews > 0 && <div className="cth-danger" data-testid="alert-overdue">{data.overdueReviews} trusted-person review{data.overdueReviews === 1 ? " is" : "s are"} overdue.</div>}
          <div className="cth-card"><h2>Sample data</h2>
            <p className="cth-muted">Creates a fictional fixture of clients, carers and visits.</p>
            <button className="cth-btn primary" disabled={busy} data-testid="button-setup" onClick={() => run(() => mut("/sample/setup", "POST"), "Sample fixture created.")}>Create sample fixture</button></div>
          <Invite data={data} busy={busy} run={run} mut={mut} />
          <h2>Trusted people</h2>
          {data.links.length === 0 && <div className="cth-card"><p>No trusted people yet. Create the sample fixture or invite someone above.</p></div>}
          {data.links.map((l) => <LinkCard key={l.id} link={l} presets={data.presets} busy={busy} run={run} mut={mut} />)}
          <Concerns concerns={data.concerns} busy={busy} run={run} mut={mut} />
          <Settings data={data} busy={busy} run={run} mut={mut} />
          <Visits visits={visits} busy={busy} run={run} mut={mut} staffToken={staffToken} />
          {data.notifications.length > 0 && <div className="cth-card"><h2>Notifications</h2>
            {data.notifications.map((n) => <p key={n.id} style={{ margin: ".3rem 0" }}><span className="cth-pill">{n.status}</span>{lab(n.type)} via {n.channel}: {n.text} <span className="cth-muted">{when(n.createdAt)}</span></p>)}</div>}
        </>}
      </div></div>
  );
}

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<void>;
type Mut = <T>(path: string, method: string, body?: unknown) => Promise<T>;

function Invite({ data, busy, run, mut }: { data: ManagerData; busy: boolean; run: Run; mut: Mut }) {
  const [f, setF] = useState({ clientId: "", name: "", email: "", phone: "", relationship: "", authorityType: "", authorityEvidenceRef: "", presetId: "", expiresAt: "" });
  const [res, setRes] = useState<{ link: unknown; inviteUrl: string; delivery: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { clientId, presetId, expiresAt, ...rest } = f;
    void run(async () => {
      setRes(await mut(`/clients/${encodeURIComponent(clientId)}/trusted-people`, "POST", { ...rest, ...(presetId ? { presetId } : {}), ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}) }));
      setCopied(false);
    }, "Trusted person created.");
  };
  return (
    <form className="cth-card" onSubmit={submit}><h2>Invite a trusted person</h2>
      <div className="cth-two">
        <div><label>Client</label><select required value={f.clientId} onChange={set("clientId")} data-testid="select-invite-client"><option value="">Choose</option>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label>Starting preset</label><select value={f.presetId} onChange={set("presetId")} data-testid="select-invite-preset"><option value="">None</option>{data.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label>Name</label><input required value={f.name} onChange={set("name")} data-testid="input-invite-name" /></div>
        <div><label>Fictional email (.test or example.com)</label><input required type="email" value={f.email} onChange={set("email")} data-testid="input-invite-email" /></div>
        <div><label>Phone</label><input required value={f.phone} onChange={set("phone")} data-testid="input-invite-phone" /></div>
        <div><label>Relationship</label><input required value={f.relationship} onChange={set("relationship")} data-testid="input-invite-relationship" /></div>
        <div><label>Authority type</label><select required value={f.authorityType} onChange={set("authorityType")} data-testid="input-invite-authority"><option value="">Choose</option>{["none","lpa_health_welfare","deputy","client_self","other"].map(a=><option key={a} value={a}>{lab(a)}</option>)}</select></div>
        <div><label>Authority evidence reference</label><input required value={f.authorityEvidenceRef} onChange={set("authorityEvidenceRef")} data-testid="input-invite-evidence" /></div>
        <div><label>Access expires (optional)</label><input type="date" value={f.expiresAt} onChange={set("expiresAt")} /></div>
      </div>
      <button className="cth-btn primary" disabled={busy} data-testid="button-invite">Create sample link</button>
      {res && <div style={{ marginTop: "1rem" }} data-testid="invite-result">
        <p className="cth-err">Delivery: {lab(res.delivery)}. No email was sent. Share this sample link yourself.</p>
        <div className="cth-link" data-testid="text-invite-url">{new URL(res.inviteUrl, window.location.origin).href}</div>
        <button type="button" className="cth-btn sm" style={{ marginTop: ".5rem" }} data-testid="button-copy" onClick={() => { void navigator.clipboard?.writeText(new URL(res.inviteUrl, window.location.origin).href).then(() => setCopied(true), () => setCopied(false)); }}>{copied ? "Copied" : "Copy link"}</button>
      </div>}
    </form>
  );
}

function LinkCard({ link, presets, busy, run, mut }: { link: Link; presets: ManagerData["presets"]; busy: boolean; run: Run; mut: Mut }) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState<Record<Category, Flags>>(link.permissions);
  const [why, setWhy] = useState(""); const [preset, setPreset] = useState("");
  const [status, setStatus] = useState(""); const [reason, setReason] = useState(""); const [confirm, setConfirm] = useState(false);
  const [audit, setAudit] = useState<Audit[] | null>(null); const [aerr, setAerr] = useState("");
  useEffect(() => { setPerms(link.permissions); }, [link.permissions]);

  const changed = CTP_CATEGORIES.filter((c) => FLAGS.some((k) => perms[c]?.[k] !== link.permissions[c]?.[k]));
  const lifting = changed.some((c) => link.permissions[c]?.client_restricted && !perms[c].client_restricted);
  const toggle = (c: Category, k: keyof Flags) => setPerms({ ...perms, [c]: { ...perms[c], [k]: !perms[c][k] } });
  const savePerms = () => run(() => mut(`/links/${link.id}/permissions`, "PATCH", { permissions: Object.fromEntries(changed.map((c) => [c, perms[c]])), ...(lifting ? { changedWishesReason: why.trim() } : {}) }), "Permissions saved.");
  const loadAudit = async () => { setAerr(""); try { setAudit((await mut<{ audit: Audit[] }>(`/links/${link.id}/audit`, "GET")).audit); } catch (e) { setAerr(e instanceof Error ? e.message : "Failed"); } };
  const harsh = status === "suspended" || status === "revoked";
  const effect = status === "revoked" ? "Revoking immediately ends this person's access. Existing sessions cannot be restored." : "Suspending immediately blocks this person. They will see only 'Access unavailable' until reactivated.";

  return (
    <div className="cth-card" data-testid={`card-link-${link.id}`}>
      <div className="cth-row" style={{ justifyContent: "space-between" }}>
        <div><h3 style={{ margin: 0 }}>{link.personName} <span className="cth-pill">{link.status}</span></h3>
          <div className="cth-muted">{link.relationship} of {link.clientName} · {link.authorityType} · {link.email}</div>
          <div className="cth-muted">Review due {when(link.reviewDueAt)} · Expires {when(link.expiresAt)}</div></div>
        <button className="cth-btn sm" onClick={() => { setOpen(!open); if (!open && !audit) void loadAudit(); }} data-testid={`button-manage-${link.id}`}>{open ? "Close" : "Manage"}</button>
      </div>
      {open && <div style={{ marginTop: "1rem" }}>
        <h3>Permissions</h3>
        <div className="cth-grid">
          <div /> {FLAGS.map((k) => <div key={k}><b>{lab(k)}</b></div>)}
          {CTP_CATEGORIES.map((c) => [<div key={c}>{lab(c)}</div>, ...FLAGS.map((k) => (
            <div key={c + k}><input type="checkbox" aria-label={`${c} ${k}`} checked={!!perms[c]?.[k]} onChange={() => toggle(c, k)} data-testid={`check-${link.id}-${c}-${k}`} /></div>))])}
        </div>
        {lifting && <><label style={{ display: "block", marginTop: ".6rem" }}>Reason for changing the client's wishes (required to lift a restriction)</label>
          <textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} data-testid={`input-wishes-${link.id}`} /></>}
        <button className="cth-btn primary" disabled={busy || changed.length === 0 || (lifting && !why.trim())} onClick={() => void savePerms()} data-testid={`button-save-perms-${link.id}`}>Save permissions</button>

        <h3 style={{ marginTop: "1.2rem" }}>Preset</h3>
        <div className="cth-row"><select style={{ width: "auto" }} value={preset} onChange={(e) => setPreset(e.target.value)} data-testid={`select-preset-${link.id}`}><option value="">Choose preset</option>{presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="cth-btn sm" disabled={busy || !preset} onClick={() => void run(() => mut(`/links/${link.id}/preset`, "POST", { presetId: preset }), "Preset applied.")} data-testid={`button-preset-${link.id}`}>Apply</button></div>

        <h3>Status</h3>
        <div className="cth-two"><div><label>New status</label><select value={status} onChange={(e) => { setStatus(e.target.value); setConfirm(false); }} data-testid={`select-status-${link.id}`}>
          <option value="">Choose</option><option value="active">Active (reactivate)</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select></div>
          <div><label>Reason (required)</label><input value={reason} onChange={(e) => setReason(e.target.value)} data-testid={`input-status-reason-${link.id}`} /></div></div>
        {harsh && <p className="cth-danger"><label style={{ color: "inherit" }}><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} data-testid={`check-confirm-${link.id}`} />{effect} I understand.</label></p>}
        <button className={`cth-btn primary ${harsh ? "warn" : ""}`} disabled={busy || !status || !reason.trim() || (harsh && !confirm)} onClick={() => void run(async () => { await mut(`/links/${link.id}/status`, "PATCH", { status, reason: reason.trim() }); setReason(""); setStatus(""); setConfirm(false); }, "Status updated.")} data-testid={`button-status-${link.id}`}>Update status</button>

        <h3 style={{ marginTop: "1.2rem" }}>Audit trail <button className="cth-btn sm" onClick={() => void loadAudit()}>Refresh</button></h3>
        {aerr && <div className="cth-err">{aerr}</div>}
        {audit && audit.length === 0 && <p className="cth-muted">No audit entries.</p>}
        {audit?.map((a) => <div key={a.id} className="cth-muted" style={{ fontFamily: "ui-monospace,monospace", fontSize: ".8rem" }}>{when(a.at)} · {a.action} · {a.actorType}:{a.actorId} · {a.target}</div>)}
      </div>}
    </div>
  );
}

function Concerns({ concerns, busy, run, mut }: { concerns: Concern[]; busy: boolean; run: Run; mut: Mut }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <div className="cth-card"><h2>Concerns</h2>
      {concerns.length === 0 && <p className="cth-muted">No concerns raised.</p>}
      {concerns.map((c) => (
        <div key={c.id} style={{ borderTop: "1px solid hsl(var(--line))", padding: ".7rem 0" }} data-testid={`row-concern-${c.id}`}>
          <span className="cth-pill">{c.status}</span>{c.reasonCode ? lab(c.reasonCode) : "concern"} <span className="cth-muted">raised {when(c.createdAt)}</span>
          {c.detail && <p style={{ margin: ".3rem 0" }}>{c.detail}</p>}
          <div className="cth-muted">Acknowledge by {when(c.ackDueAt)}{c.escalatedAt ? ` · escalated ${when(c.escalatedAt)}` : ""}{c.resolutionNote ? ` · note: ${c.resolutionNote}` : ""}</div>
          {c.status !== "resolved" && <div className="cth-row" style={{ marginTop: ".4rem" }}>
            {c.status !== "reviewing" && <button className="cth-btn sm" disabled={busy} data-testid={`button-ack-${c.id}`} onClick={() => void run(() => mut(`/concerns/${c.id}`, "PATCH", { status: "reviewing" }), "Concern marked as reviewing.")}>Acknowledge</button>}
            <input style={{ flex: 1, margin: 0, minWidth: 180 }} placeholder="Resolution note (required)" value={notes[c.id] ?? ""} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} data-testid={`input-resolution-${c.id}`} />
            <button className="cth-btn sm primary" disabled={busy || c.status !== "reviewing" || !(notes[c.id] ?? "").trim()} data-testid={`button-resolve-${c.id}`} onClick={() => void run(() => mut(`/concerns/${c.id}`, "PATCH", { status: "resolved", resolutionNote: notes[c.id].trim() }), "Concern resolved.")}>Resolve</button>
          </div>}
        </div>))}
    </div>
  );
}

function Settings({ data, busy, run, mut }: { data: ManagerData; busy: boolean; run: Run; mut: Mut }) {
  const s = data.settings;
  const [ack, setAck] = useState(String(s.concernAckMinutes)); const [esc, setEsc] = useState(String(s.concernEscalateMinutes));
  const [contacts, setContacts] = useState(s.escalationContacts.join(", "));
  useEffect(() => { setAck(String(s.concernAckMinutes)); setEsc(String(s.concernEscalateMinutes)); setContacts(s.escalationContacts.join(", ")); }, [s.concernAckMinutes, s.concernEscalateMinutes, s.escalationContacts]);
  return (
    <div className="cth-card"><h2>Agency settings</h2>
      <label><input type="checkbox" checked={s.carerIdentityEnabled} disabled={busy} data-testid="check-carer-identity" onChange={(e) => void run(() => mut("/settings", "PATCH", { carerIdentityEnabled: e.target.checked }), "Settings saved.")} />Allow carer identity to be shown to trusted people</label>
      <div className="cth-two" style={{ marginTop: ".8rem" }}>
        <div><label>Acknowledge concerns within (minutes)</label><input type="number" min={1} value={ack} onChange={(e) => setAck(e.target.value)} data-testid="input-ack" /></div>
        <div><label>Escalate after (minutes)</label><input type="number" min={1} value={esc} onChange={(e) => setEsc(e.target.value)} data-testid="input-escalate" /></div>
      </div>
      <label>Escalation contacts (comma separated)</label><input value={contacts} onChange={(e) => setContacts(e.target.value)} data-testid="input-contacts" />
      <button className="cth-btn primary" disabled={busy} data-testid="button-save-settings" onClick={() => void run(() => mut("/settings", "PATCH", { concernAckMinutes: Number(ack), concernEscalateMinutes: Number(esc), escalationContacts: contacts.split(",").map((x) => x.trim()).filter(Boolean) }), "Settings saved.")}>Save settings</button>
      <h3 style={{ marginTop: "1.2rem" }}>Carer privacy</h3>
      {data.carers.map((c) => (
        <div key={c.id} className="cth-row" data-testid={`row-carer-${c.id}`}><b style={{ minWidth: 140 }}>{c.name}</b>
          <label><input type="checkbox" checked={c.showName} disabled={busy} onChange={(e) => void run(() => mut(`/carers/${c.id}/privacy`, "PATCH", { showName: e.target.checked, showPhoto: c.showPhoto }), "Carer privacy saved.")} />Show name</label>
          <label><input type="checkbox" checked={c.showPhoto} disabled={busy} onChange={(e) => void run(() => mut(`/carers/${c.id}/privacy`, "PATCH", { showName: c.showName, showPhoto: e.target.checked }), "Carer privacy saved.")} />Show photo</label></div>))}
    </div>
  );
}

function Visits({ visits, busy, run, mut, staffToken }: { visits: VisitRow[] | null; busy: boolean; run: Run; mut: Mut; staffToken: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const [src, setSrc] = useState<{ id: string; category: string; value: string }[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({}); const [serr, setSerr] = useState("");
  const open = async (id: string) => {
    setSel(id); setSrc(null); setSerr(""); setEdits({});
    try { setSrc((await ctp<{ sources: { id: string; category: string; value: string }[] }>(`/manager/visits/${id}`, { staffToken })).sources); } catch (e) { setSerr(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div className="cth-card"><h2>Sample visits and stories</h2>
      {visits === null && <p className="cth-muted">Visit list is not available.</p>}
      {visits?.length === 0 && <p className="cth-muted">No visits yet.</p>}
      {visits?.map((v) => (
        <div key={v.id} style={{ borderTop: "1px solid hsl(var(--line))", padding: ".6rem 0" }} data-testid={`row-visit-${v.id}`}>
          <div className="cth-row"><b>{v.clientName}</b><span className="cth-pill">{v.status}</span>
            <span className="cth-muted">{v.verified ? "verified" : "unverified"} · {v.synced ? "synced" : "not synced"} · {v.storyVersions.map((s) => `v${s.version} ${s.status} (${s.model})`).join(", ") || "no story"}</span>
            <button className="cth-btn sm" onClick={() => void open(v.id)} data-testid={`button-sources-${v.id}`}>Sources</button>
            <button className="cth-btn sm" disabled={busy} onClick={() => void run(() => mut(`/stories/${v.id}/regenerate`, "POST"), "Story regeneration queued. Refresh the visits to see the new version.")} data-testid={`button-regen-${v.id}`}>Regenerate story</button></div>
          {sel === v.id && <div style={{ marginTop: ".5rem" }}>
            {serr && <div className="cth-err">{serr}</div>}{!src && !serr && <div className="cth-skel" />}
            {src?.map((s) => (<div key={s.id}><label>{lab(s.category)} (sample correction)</label>
              <div className="cth-row"><input style={{ flex: 1, margin: 0 }} value={edits[s.id] ?? s.value} onChange={(e) => setEdits({ ...edits, [s.id]: e.target.value })} data-testid={`input-source-${s.id}`} />
                <button className="cth-btn sm" disabled={busy || edits[s.id] === undefined || edits[s.id] === s.value} onClick={() => void run(async () => { await mut(`/sources/${s.id}`, "PATCH", { value: edits[s.id] }); await open(v.id); }, "Source corrected.")} data-testid={`button-source-${s.id}`}>Save</button></div></div>))}
          </div>}
        </div>))}
    </div>
  );
}
