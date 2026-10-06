import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { flushSync } from "react-dom";
import { AccessUnavailable, ctp } from "@/lib/closeToHome";
import type { Concern, Today } from "@/lib/closeToHome";
import "./close-to-home.css";

type Phase = "loading" | "signedout" | "ready" | "unavailable" | "offline";
type Tab = "today" | "who" | "story" | "worried";
type Session = { person: { id: string; name: string }; sampleOnly: boolean };
const REASONS: [string, string][] = [
  ["confused", "They seem confused"], ["not_answering", "They are not answering"],
  ["quieter_than_usual", "They are quieter than usual"], ["missed_or_late_visit", "A visit was missed or late"], ["other", "Something else"],
];
const fmt = (s?: string) => { if (!s) return ""; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };
const label = (s?: string) => (s ?? "").replace(/_/g, " ");

export default function Portal() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [person, setPerson] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const [invite, setInvite] = useState<string | null>(() => new URLSearchParams(window.location.search).get("invite"));
  const clientRef = useRef<string | null>(null);
  const gen = useRef(0);
  const phaseRef = useRef<Phase>("loading");
  phaseRef.current = phase;

  const clearAll = useCallback(() => {
    gen.current++;
    setPerson(null); setClients([]); setClientId(null); clientRef.current = null; setToday(null); setConcerns([]);
  }, []);

  const refresh = useCallback(async () => {
    const my = ++gen.current;
    try {
      const s = await ctp<Session>("/auth/session");
      if (my !== gen.current) return;
      const c = await ctp<{ clients: { id: string; name: string }[] }>("/me/clients");
      if (my !== gen.current) return;
      const cur = c.clients.find((x) => x.id === clientRef.current)?.id ?? c.clients[0]?.id ?? null;
      let t: Today | null = null;
      if (cur) t = await ctp<Today>(`/me/clients/${encodeURIComponent(cur)}/today`);
      const k = await ctp<{ concerns: Concern[] }>("/me/concerns");
      if (my !== gen.current) return;
      clientRef.current = cur;
      setPerson(s.person.name); setClients(c.clients); setClientId(cur); setToday(t); setConcerns(k.concerns); setPhase("ready");
    } catch (e) {
      if (my !== gen.current) return;
      clearAll();
      if (e instanceof AccessUnavailable) setPhase("unavailable");
      else if (e instanceof Error && /sign|auth|session/i.test(e.message) && phaseRef.current !== "ready") setPhase("signedout");
      else setPhase("offline");
    }
  }, [clearAll]);

  useEffect(() => {
    if (invite) { setPhase("signedout"); return; }
    void refresh();
  }, [invite, refresh]);

  useEffect(() => {
    const hide = () => { flushSync(()=>{ clearAll(); setPhase("loading"); }); };
    const back = () => { clearAll(); setPhase("loading"); setInvite(new URLSearchParams(window.location.search).get("invite")); void refresh(); };
    const focus = () => { if (!invite && ["ready","offline","loading"].includes(phaseRef.current)) void refresh(); };
    const visible = () => { if(document.visibilityState==="visible")focus(); };
    const show = (e:PageTransitionEvent) => {if(e.persisted){hide();focus();}};
    const offline = () => {clearAll();setPhase("offline");};
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    window.addEventListener("popstate", back);
    window.addEventListener("focus", focus);
    window.addEventListener("offline",offline);
    document.addEventListener("visibilitychange",visible);
    const iv = window.setInterval(() => { if (!invite && phaseRef.current === "ready") void refresh(); }, 5000);
    return () => { window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow",show); window.removeEventListener("popstate", back); window.removeEventListener("focus", focus); window.removeEventListener("offline",offline);document.removeEventListener("visibilitychange",visible);window.clearInterval(iv); };
  }, [clearAll, refresh, invite]);

  const logout = async () => {
    clearAll();
    try { await ctp("/auth/logout", { method: "POST" }); } catch { /* fail closed regardless */ }
    setPhase("signedout");
  };
  const pick = (id: string) => { clientRef.current = id; setClientId(id); setToday(null); void refresh(); };
  const pickTab = (next:Tab) => {
    const selected=clientRef.current;
    clearAll();clientRef.current=selected;setTab(next);setPhase("loading");
    void refresh();
  };

  const banner = <div className="cth-banner" data-testid="banner-sample">SAMPLE ONLY — fictional people and fictional care records</div>;

  if (phase === "unavailable") return (
    <div className="cth">{banner}<div className="cth-center"><h1 data-testid="text-unavailable">Access unavailable, please contact the agency.</h1></div></div>
  );
  if (phase === "loading") return <div className="cth">{banner}<div className="cth-wrap"><div className="cth-skel" /><div className="cth-skel" /><div className="cth-skel" /></div></div>;
  if (phase === "offline") return (
    <div className="cth">{banner}<div className="cth-center"><div>
      <h1>We can't reach Close to Home right now.</h1>
      <p className="cth-muted">For your privacy nothing is shown while we are offline.</p>
      <button className="cth-btn primary" data-testid="button-retry" onClick={() => { setPhase("loading"); void refresh(); }}>Try again</button>
    </div></div></div>
  );
  if (phase === "signedout") return (
    <div className="cth">{banner}<AuthForm invite={invite} onDone={() => {
      if (invite) {
        const url=new URL(window.location.href);url.searchParams.delete("invite");
        window.history.replaceState(null,"",url.pathname+url.search);setInvite(null);
      }
      setPhase("loading"); void refresh();
    }} /></div>
  );

  const client = clients.find((c) => c.id === clientId);
  const tabs: [Tab, string][] = [["today", "Today's Care"], ["who", "Who Was There"], ["story", "Daily Story"], ["worried", "I'm Worried"]];
  return (
    <div className="cth">{banner}
      <div className="cth-wrap">
        <div className="cth-row" style={{ justifyContent: "space-between" }}>
          <div><div className="cth-muted">Close to Home</div><h1 data-testid="text-client">{client ? client.name : "Close to Home"}</h1></div>
          <div className="cth-row"><span className="cth-muted" data-testid="text-person">{person}</span>
            <button className="cth-btn sm" data-testid="button-logout" onClick={logout}>Sign out</button></div>
        </div>
        {clients.length > 1 && (
          <select aria-label="Person" data-testid="select-client" value={clientId ?? ""} onChange={(e) => pick(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <div className="cth-tabs" role="tablist">
          {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="cth-tab" data-testid={`tab-${k}`} onClick={() => pickTab(k)}>{l}</button>)}
        </div>
        {!client && <div className="cth-card"><p>No one is shared with you at the moment.</p></div>}
        {client && !today && <><div className="cth-skel" /><div className="cth-skel" /></>}
        {client && today && tab === "today" && <TodayView t={today} />}
        {client && today && tab === "who" && <Who t={today} />}
        {client && today && tab === "story" && <Story t={today} />}
        {client && today && tab === "worried" && <Worried t={today} clientId={client.id} concerns={concerns} onSaved={refresh} />}
      </div>
    </div>
  );
}

function AuthForm({ invite, onDone }: { invite: string | null; onDone: () => void }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      if (invite) await ctp("/auth/activate", { method: "POST", body: { code: invite, password: pw } });
      else await ctp("/auth/login", { method: "POST", body: { email, password: pw, agency:new URLSearchParams(window.location.search).get("agency") } });
      setPw(""); onDone();
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not sign in."); } finally { setBusy(false); }
  };
  return (
    <div className="cth-wrap"><form className="cth-card" onSubmit={submit} style={{ marginTop: "8dvh" }}>
      <h1>{invite ? "Set your password" : "Welcome back"}</h1>
      <p className="cth-muted">{invite ? "Choose a password to open your invitation." : "Sign in to see how today has gone."}</p>
      {!invite && <><label htmlFor="e">Email</label><input id="e" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" /></>}
      <label htmlFor="p">Password</label>
      <input id="p" type="password" autoComplete={invite ? "new-password" : "current-password"} required minLength={invite ? 8 : 1} value={pw} onChange={(e) => setPw(e.target.value)} data-testid="input-password" />
      {err && <div className="cth-err" role="alert" data-testid="text-error">{err}</div>}
      <button className="cth-btn primary" disabled={busy} data-testid="button-submit">{busy ? "One moment..." : invite ? "Activate" : "Sign in"}</button>
    </form></div>
  );
}

function List({ title, items, id }: { title: string; items?: string[]; id: string }) {
  if (!items || items.length === 0) return null;
  return <div className="cth-card" data-testid={`card-${id}`}><h3>{title}</h3><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>;
}

function TodayView({ t }: { t: Today }) {
  const empty = !t.visits?.length && !t.reassurance?.length && !t.meals?.length && !t.medication?.length && !t.tasks?.length && !t.observations?.length && !t.sensitive_observations?.length;
  return (<>
    {t.reassurance && t.reassurance.length > 0 && (
      <div className="cth-card" style={{ background: "hsl(var(--sagebg))" }} data-testid="card-reassurance">
        {t.reassurance.map((r, i) => <p key={i} style={{ margin: "0 0 .4rem", fontSize: "1.15rem" }}>{r.text}</p>)}
      </div>
    )}
    {t.visits && t.visits.length > 0 && (
      <div className="cth-card" data-testid="card-visits"><h3>Visits</h3>
        {t.visits.map((v) => (
          <p key={v.id} data-testid={`text-visit-${v.id}`} style={{ margin: ".3rem 0" }}>
            {v.status && <span className="cth-pill">{label(v.status)}</span>}
            {v.times ? `${fmt(v.times.start)} to ${fmt(v.times.end)}` : v.plannedTimes ? `Planned for ${fmt(v.plannedTimes.start)}` : ""}
          </p>
        ))}
      </div>
    )}
    <List id="meals" title="Meals" items={t.meals} />
    <List id="medication" title="Medication" items={t.medication} />
    <List id="tasks" title="Tasks" items={t.tasks} />
    <List id="observations" title="Observations" items={t.observations} />
    <List id="sensitive" title="Sensitive observations" items={t.sensitive_observations} />
    {empty && <div className="cth-card"><p>Nothing has been shared for today yet.</p></div>}
  </>);
}

function Who({ t }: { t: Today }) {
  const vs = (t.visits ?? []).filter((v) => v.carer || v.continuity);
  if (!vs.length) return <div className="cth-card"><p>No carer details are shared for today.</p></div>;
  return <>{vs.map((v) => (
    <div className="cth-card cth-row" key={v.id} data-testid={`card-carer-${v.id}`}>
      {v.carer?.photo && <img src={v.carer.photo} alt="" width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} />}
      <div><h3 style={{ margin: 0 }}>{v.carer?.label ?? v.continuity}</h3>
        {v.times && <div className="cth-muted">{fmt(v.times.start)} to {fmt(v.times.end)}</div>}</div>
    </div>))}</>;
}

function Story({ t }: { t: Today }) {
  if (!t.story?.length) return <div className="cth-card"><p>Today's story has not been shared yet.</p></div>;
  return <div className="cth-card" data-testid="card-story">{t.story.map((p, i) => <p key={i}>{p}</p>)}</div>;
}

function Worried({ t, clientId, concerns, onSaved }: { t: Today; clientId: string; concerns: Concern[]; onSaved: () => Promise<void> }) {
  const [reason, setReason] = useState("confused"); const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [ok, setOk] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(""); setOk(false);
    try {
      await ctp(`/me/clients/${encodeURIComponent(clientId)}/concerns`, { method: "POST", body: { reasonCode: reason, detail } });
      setDetail(""); setOk(true); await onSaved();
    } catch (x) { if (x instanceof AccessUnavailable) { await onSaved(); return; } setErr(x instanceof Error ? x.message : "Could not send."); } finally { setBusy(false); }
  };
  return (<>
    {t.canRaiseConcern === true ? (
      <form className="cth-card" onSubmit={submit}>
        <div className="cth-danger" data-testid="text-emergency">If someone is in immediate danger, call 999.</div>
        <h2>Tell the agency what worries you</h2>
        <label htmlFor="r">What is worrying you?</label>
        <select id="r" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="select-reason">
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label htmlFor="d">Details (optional)</label>
        <textarea id="d" rows={4} maxLength={2000} value={detail} onChange={(e) => setDetail(e.target.value)} data-testid="input-detail" />
        {err && <div className="cth-err" role="alert">{err}</div>}
        {ok && <div className="cth-ok" data-testid="text-sent">Sent to the agency.</div>}
        <button className="cth-btn primary" disabled={busy} data-testid="button-send-concern">{busy ? "Sending..." : "Send to the agency"}</button>
      </form>
    ) : <div className="cth-card"><p>Raising a concern is not available on your account.</p></div>}
    {concerns.length > 0 && <div className="cth-card" data-testid="list-concerns"><h3>Your concerns</h3>
      {concerns.map((c) => (
        <p key={c.id} data-testid={`row-concern-${c.id}`} style={{ margin: ".4rem 0" }}>
          <span className="cth-pill">{label(c.status)}</span><span className="cth-muted">Received {fmt(c.createdAt)}</span>
          {c.acknowledgedAt && <><br />Reviewing since {fmt(c.acknowledgedAt)}</>}
          {c.resolvedAt && <><br />Resolved {fmt(c.resolvedAt)}</>}
        </p>))}
    </div>}
  </>);
}
