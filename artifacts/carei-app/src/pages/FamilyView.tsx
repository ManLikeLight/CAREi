import { useState } from "react";

type FVScreen = "home" | "story" | "prefs" | "context" | "worried" | "worried-confirm";

type VisitInput = {
  confirmedMeds:    string[];
  skippedMeds:      string[];
  fluidMl:          number;
  mealStatus:       string;
  mood:             string;
  notes:            string;
  medTakenAt:       Record<string, string>;
  visitStartTime:   string;
  visitEndTime:     string;
};

const C = {
  dark:  "#0A1628",
  navy:  "#1B2A49",
  teal:  "#4FD1C5",
  teal2: "#38B2AC",
  mint:  "#A7F3D0",
  amber: "#F6B73C",
  green: "#22C55E",
  red:   "#FF5A5F",
  g0:    "#F8FAFC",
  g1:    "#E2E8F0",
  g2:    "#94A3B8",
  g3:    "#475569",
};

const AGENCY    = "Adjoy Healthcare";
const NEXT_VISIT = "Tomorrow, 09:00";

const MOCK_TODAY_VISIT: VisitInput = {
  confirmedMeds:  ["Aspirin 75mg", "Donepezil 10mg"],
  skippedMeds:    [],
  fluidMl:        750,
  mealStatus:     "Full",
  mood:           "😊",
  notes:          "",
  medTakenAt:     { "Aspirin": "09:42", "Donepezil": "09:44" },
  visitStartTime: "09:00",
  visitEndTime:   "10:05",
};

const YESTERDAY_CONCERNS = "Mary was a little quieter than usual and had about half of her breakfast. No urgent concern — noted for monitoring.";

const INIT_NOTES = [
  { id: "n1", text: "Mum mentioned she didn't sleep well last night. She was up a few times.", when: "Yesterday, 8:14pm" },
  { id: "n2", text: "Mary's favourite niece is visiting this week — she'll be in good spirits!", when: "Mon 22 Jun, 7:30pm" },
];

const WORRIED_PICKS = [
  "She sounded confused",
  "She didn't answer the phone",
  "She seems quieter than usual",
  "I think she's in pain",
  "She mentioned feeling unwell",
];

const PREF_OPTIONS = [
  { key: "missed",  label: "Visit missed",                  desc: "If a scheduled visit doesn't happen" },
  { key: "late",    label: "Visit starts late",             desc: "If arrival is more than 15 minutes late" },
  { key: "med",     label: "Medication could not be given", desc: "If a dose is refused or skipped" },
  { key: "concern", label: "A concern is recorded",        desc: "If the carer notes anything unusual" },
  { key: "gp",      label: "GP is contacted",               desc: "If the team contacts a doctor" },
  { key: "good",    label: "A particularly good day",       desc: "Positive highlights worth sharing" },
];

// ─── Derivation helpers ────────────────────────────────────────────────────────

const MOOD_MAP: Record<string, string> = {
  "😊": "Great spirits", "🙂": "Good spirits", "😐": "Calm and settled",
  "😕": "Quieter than usual", "😔": "Low in mood",
};

function moodText(raw: string): string {
  if (!raw) return "";
  return MOOD_MAP[raw.trim()] ?? raw;
}

function mealText(status: string): string {
  if (status === "Full")    return "Full meal supported — ate well";
  if (status === "Half")    return "About half a meal — appetite a little lower today";
  if (status === "Refused") return "Declined meal this visit — noted for the care team";
  return "Meal support provided";
}

function deriveToday(v: VisitInput, carerFirst: string, clientFirst: string) {
  const meds = v.confirmedMeds.map(name => {
    const shortName = name.split(" ")[0];
    const time = v.medTakenAt[shortName] ?? v.medTakenAt[name] ?? "";
    return { name, time };
  });
  const hasConcern = v.skippedMeds.length > 0 ||
    v.mealStatus === "Refused" ||
    (v.fluidMl > 0 && v.fluidMl < 300);
  const concerns: string | null = v.skippedMeds.length > 0
    ? `Medication could not be given this visit: ${v.skippedMeds.join(", ")}. The care team has been informed.`
    : v.mealStatus === "Refused"
    ? `${clientFirst} declined her meal this visit. The care team has noted this and will monitor at the next visit.`
    : (v.fluidMl > 0 && v.fluidMl < 300)
    ? `Fluid intake was lower than usual today (${v.fluidMl}ml). ${carerFirst} has noted this for monitoring.`
    : null;
  const story = buildStory(v, carerFirst, clientFirst);
  const time = (v.visitStartTime && v.visitEndTime)
    ? `${v.visitStartTime} – ${v.visitEndTime}`
    : v.visitStartTime ? v.visitStartTime : "This morning";
  return { meds, meal: mealText(v.mealStatus), mood: moodText(v.mood), concerns, story, time, hasConcern };
}

function buildStory(v: VisitInput, carerFirst: string, clientFirst: string): string {
  const parts: string[] = [];
  parts.push(`${carerFirst} visited ${clientFirst} this morning.`);
  const mood = MOOD_MAP[v.mood?.trim()] ?? v.mood;
  if (mood) parts.push(`${clientFirst} was ${mood === "Great spirits" || mood === "Good spirits" ? "in " + mood.toLowerCase() : mood.toLowerCase()}.`);
  if (v.mealStatus === "Full")    parts.push("She had a full meal and ate well.");
  else if (v.mealStatus === "Half")    parts.push("She had about half of her meal — her appetite was a little lower than usual today.");
  else if (v.mealStatus === "Refused") parts.push("She declined her meal this visit — this has been noted.");
  if (v.fluidMl >= 500)        parts.push(`${clientFirst} had a good amount to drink — ${v.fluidMl}ml recorded.`);
  else if (v.fluidMl >= 300)   parts.push(`${v.fluidMl}ml of fluids recorded — a little below the usual target.`);
  else if (v.fluidMl > 0)      parts.push(`Fluid intake was lower than usual today at ${v.fluidMl}ml — noted for monitoring.`);
  if (v.confirmedMeds.length > 0 && v.skippedMeds.length === 0) {
    parts.push("All medications were given as prescribed, without any difficulty.");
  } else if (v.confirmedMeds.length > 0 && v.skippedMeds.length > 0) {
    parts.push(`Most medications were given, though ${v.skippedMeds.join(" and ")} could not be administered — this is documented.`);
  } else if (v.skippedMeds.length > 0) {
    parts.push(`Medication could not be given this visit — this has been logged by ${carerFirst}.`);
  }
  if (v.notes?.trim()) {
    const sentence = v.notes.trim().split(/[.!?]/)[0].trim();
    if (sentence && sentence.length < 120) parts.push(sentence + ".");
  }
  const hasConcern = v.skippedMeds.length > 0 || v.mealStatus === "Refused" || (v.fluidMl > 0 && v.fluidMl < 300);
  parts.push(hasConcern
    ? `${carerFirst} has flagged this with the care team — no action is needed from you unless you have additional concerns.`
    : "It was a positive, comfortable visit.");
  return parts.join(" ");
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Row({ icon, title, detail, ok }: { icon: string; title: string; detail: string; ok: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div style={{ color: C.g2, fontSize: 11, marginTop: 3, lineHeight: 1.55 }}>{detail}</div>
      </div>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: ok ? "rgba(167,243,208,0.15)" : "rgba(246,183,60,0.15)", border: `1px solid ${ok ? "rgba(167,243,208,0.4)" : "rgba(246,183,60,0.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11 }}>
        <span style={{ color: ok ? C.mint : C.amber, fontWeight: 700 }}>{ok ? "✓" : "i"}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ color: C.g3, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" as const }}>{children}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FamilyView({
  onBack,
  visitData,
  carerName,
  clientFirstName,
  familyFirstName,
}: {
  onBack:            () => void;
  visitData?:        VisitInput;
  carerName?:        string;
  clientFirstName?:  string;
  familyFirstName?:  string;
}) {
  const [screen,    setScreen]    = useState<FVScreen>("home");
  const [notes,     setNotes]     = useState(INIT_NOTES);
  const [noteText,  setNoteText]  = useState("");
  const [prefs,     setPrefs]     = useState<Record<string, boolean>>({ missed: true, late: true, med: true, concern: true, gp: false, good: true });
  const [worryText, setWorryText] = useState("");
  const [worryPick, setWorryPick] = useState("");
  const [storyDay,  setStoryDay]  = useState<"today" | "yesterday">("today");

  const clientFirst = clientFirstName ?? "Mary";
  const familyFirst = familyFirstName ?? "James";
  const carerFirst  = (carerName ?? "Sarah O'Brien").split(" ")[0];
  const carerFull   = carerName   ?? "Sarah O'Brien";

  const sourceData = visitData ?? MOCK_TODAY_VISIT;
  const visitDone  = !!visitData;
  const today      = deriveToday(sourceData, carerFirst, clientFirst);

  const hideNav = screen === "worried" || screen === "worried-confirm";

  function nav(s: FVScreen) { setScreen(s); }

  function submitNote() {
    const t = noteText.trim();
    if (!t) return;
    setNotes(p => [{ id: `n${Date.now()}`, text: t, when: "Just now" }, ...p]);
    setNoteText("");
  }

  function submitWorry() {
    nav("worried-confirm");
    setWorryText("");
    setWorryPick("");
  }

  const combined = (worryPick + (worryText.trim() ? (worryPick ? " — " + worryText.trim() : worryText.trim()) : "")).trim();

  // ── Screens ────────────────────────────────────────────────────────────────

  function renderHome() {
    return (
      <div className="phone-scroll" style={{ flex: 1, padding: "20px 18px 108px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Greeting */}
        <div>
          <div style={{ color: C.g2, fontSize: 13 }}>Good morning, {familyFirst}</div>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 26, color: "#fff", marginTop: 4, lineHeight: 1.25 }}>
            Here's how<br />{clientFirst} is doing
          </div>
        </div>

        {/* Confidence banner */}
        <div style={{ background: visitDone ? "rgba(167,243,208,0.1)" : "rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px", border: `1px solid ${visitDone ? "rgba(167,243,208,0.25)" : "rgba(255,255,255,0.1)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: visitDone ? "rgba(167,243,208,0.2)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {visitDone ? "✓" : "📅"}
            </div>
            <div>
              <div style={{ color: visitDone ? C.mint : C.g1, fontWeight: 700, fontSize: 15 }}>
                {visitDone ? "Today's visit is complete" : "Visit not yet recorded"}
              </div>
              <div style={{ color: C.g2, fontSize: 12, marginTop: 2 }}>
                {visitDone ? `${carerFull} · ${today.time}` : `${carerFull} · Due this morning`}
              </div>
            </div>
          </div>
          {visitDone && (
            <button
              onClick={() => nav("story")}
              style={{ width: "100%", background: "rgba(167,243,208,0.15)", border: "1px solid rgba(167,243,208,0.35)", borderRadius: 10, padding: "10px 0", color: C.mint, fontFamily: "DM Sans,sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Read today's story →
            </button>
          )}
        </div>

        {/* Evidence */}
        <SectionLabel>Today at a glance</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row
            icon="💊"
            title={today.meds.length > 0 ? "Medication taken" : "No medications recorded yet"}
            detail={today.meds.length > 0 ? today.meds.map(m => m.name + (m.time ? ` at ${m.time}` : "")).join(" · ") : "Check back after the visit"}
            ok={today.meds.length > 0 && sourceData.skippedMeds.length === 0}
          />
          <Row
            icon="🍽️"
            title="Meal supported"
            detail={today.meal}
            ok={sourceData.mealStatus === "Full" || (!sourceData.mealStatus && visitDone)}
          />
          {sourceData.fluidMl > 0 && (
            <Row
              icon="💧"
              title="Fluid intake"
              detail={`${sourceData.fluidMl}ml recorded · ${sourceData.fluidMl >= 500 ? "Good hydration" : "A little lower than usual — being monitored"}`}
              ok={sourceData.fluidMl >= 500}
            />
          )}
          <Row
            icon="❤️"
            title={today.concerns ? "A note from the team" : "No concerns"}
            detail={today.concerns ?? "Everything was fine today"}
            ok={!today.concerns}
          />
        </div>

        {/* Yesterday note */}
        {YESTERDAY_CONCERNS && (
          <div style={{ background: "rgba(246,183,60,0.07)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(246,183,60,0.2)" }}>
            <div style={{ color: C.amber, fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Yesterday · Noted by the care team</div>
            <div style={{ color: C.g2, fontSize: 12, lineHeight: 1.55 }}>{YESTERDAY_CONCERNS}</div>
          </div>
        )}

        {/* Next visit */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <div>
            <div style={{ color: C.g3, fontSize: 11 }}>Next visit</div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginTop: 2 }}>{NEXT_VISIT} · {carerFull}</div>
          </div>
        </div>

        {/* I'm Worried */}
        <button
          onClick={() => nav("worried")}
          style={{ width: "100%", background: "rgba(255,90,95,0.1)", border: "1px solid rgba(255,90,95,0.3)", borderRadius: 14, padding: "14px 0", color: "#FF5A5F", fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          I'm worried about {clientFirst}
        </button>

        <div style={{ textAlign: "center", color: C.g3, fontSize: 10 }}>🔒 Information shared only with {AGENCY}</div>
      </div>
    );
  }

  function renderStory() {
    const isToday = storyDay === "today";
    const storyText = isToday
      ? today.story
      : `${carerFull.split(" ")[0]} visited ${clientFirst} yesterday morning. ${clientFirst} was calm and cooperative throughout, though she was a little quieter than usual and had about half of her breakfast. Both medications were given as prescribed. ${carerFull.split(" ")[0]} noted ${clientFirst}'s reduced appetite as something to keep an eye on — no urgent concern, but it has been flagged for the next visit.`;

    const facts = isToday
      ? [
          { icon: "💊", label: "Medication", value: today.meds.length > 0 ? today.meds.map(m => m.name + (m.time ? ` at ${m.time}` : "")).join(" · ") : "None recorded", amber: false },
          { icon: "🍽️", label: "Meal",       value: today.meal, amber: false },
          { icon: "😊", label: "Mood",        value: today.mood || "Not recorded", amber: false },
          ...(sourceData.fluidMl > 0 ? [{ icon: "💧", label: "Fluids", value: `${sourceData.fluidMl}ml`, amber: sourceData.fluidMl < 400 }] : []),
          { icon: "📝", label: "Concerns",   value: today.concerns ?? "None recorded", amber: !!today.concerns },
        ]
      : [
          { icon: "💊", label: "Medication", value: "Aspirin 75mg at 09:38 · Donepezil 10mg at 09:40", amber: false },
          { icon: "🍽️", label: "Meal",       value: "About half a meal — appetite slightly reduced",    amber: false },
          { icon: "😊", label: "Mood",        value: "Calm but quieter than usual",                     amber: false },
          { icon: "📝", label: "Concerns",   value: YESTERDAY_CONCERNS,                                 amber: true  },
        ];

    return (
      <div className="phone-scroll" style={{ flex: 1, padding: "20px 18px 108px", display: "flex", flexDirection: "column", gap: 14 }}>

        <div>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff", marginBottom: 12 }}>Daily Story</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["today", "yesterday"] as const).map(d => (
              <button
                key={d}
                onClick={() => setStoryDay(d)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${storyDay === d ? C.teal : "rgba(255,255,255,0.1)"}`, background: storyDay === d ? "rgba(79,209,197,0.15)" : "transparent", color: storyDay === d ? C.teal : C.g2, fontFamily: "DM Sans,sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" as const }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Story banner */}
        <div style={{ background: "rgba(167,243,208,0.08)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(167,243,208,0.2)" }}>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 20, color: "#fff", marginBottom: 4 }}>
            {clientFirst}'s {isToday ? "Morning" : "Yesterday"}
          </div>
          <div style={{ color: C.g2, fontSize: 12 }}>
            {isToday ? `Today · ${carerFull} · ${today.time}` : `Yesterday · ${carerFull} · 09:00 – 10:00`}
          </div>
        </div>

        {/* Narrative */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px" }}>
          <div style={{ color: C.g1, fontSize: 14, lineHeight: 1.75, fontStyle: "italic" as const }}>"{storyText}"</div>
        </div>

        {/* Quick facts */}
        <SectionLabel>What was recorded</SectionLabel>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden" }}>
          {facts.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderBottom: i < facts.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.g3, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 3 }}>{item.label}</div>
                <div style={{ color: item.amber ? C.amber : C.g1, fontSize: 12, lineHeight: 1.5 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {(isToday ? today.concerns : YESTERDAY_CONCERNS) && (
          <div style={{ background: "rgba(246,183,60,0.07)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(246,183,60,0.2)" }}>
            <div style={{ color: C.amber, fontSize: 12, lineHeight: 1.55 }}>The care team is aware of this and will monitor it at the next visit. No action is needed from you unless you have additional concerns.</div>
          </div>
        )}
      </div>
    );
  }

  function renderContext() {
    return (
      <div className="phone-scroll" style={{ flex: 1, padding: "20px 18px 108px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Leave a note</div>
          <div style={{ color: C.g2, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
            Your message will be shared with {carerFull} before the next visit on {NEXT_VISIT}.
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px" }}>
          <textarea
            rows={4}
            value={noteText}
            onChange={(e: any) => setNoteText(e.target.value)}
            placeholder={`e.g. "Mum didn't sleep well last night" or "Dad is anxious this week"`}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(79,209,197,0.2)", borderRadius: 10, color: "#fff", fontFamily: "DM Sans,sans-serif", fontSize: 13, lineHeight: 1.6, padding: "10px 12px", resize: "none" as const, outline: "none", boxSizing: "border-box" as const }}
          />
          <button
            onClick={submitNote}
            disabled={!noteText.trim()}
            style={{ marginTop: 10, width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: noteText.trim() ? `linear-gradient(90deg,${C.teal},${C.teal2})` : "rgba(255,255,255,0.08)", color: noteText.trim() ? "#0F1D34" : C.g3, fontFamily: "DM Sans,sans-serif", fontSize: 13, fontWeight: 700, cursor: noteText.trim() ? "pointer" : "default" }}
          >
            Send to care team
          </button>
        </div>

        <SectionLabel>Your notes</SectionLabel>
        {notes.map(note => (
          <div key={note.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(79,209,197,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>💬</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.g1, fontSize: 13, lineHeight: 1.55 }}>{note.text}</div>
              <div style={{ color: C.g3, fontSize: 10, marginTop: 5 }}>{note.when}</div>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div style={{ textAlign: "center", color: C.g3, fontSize: 13, padding: "24px 0" }}>No notes yet. Add one above.</div>
        )}
      </div>
    );
  }

  function renderPrefs() {
    return (
      <div className="phone-scroll" style={{ flex: 1, padding: "20px 18px 108px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Would you like to know?</div>
          <div style={{ color: C.g2, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>Choose which updates you'd like to be notified about.</div>
        </div>

        <div style={{ borderRadius: 16, overflow: "hidden" }}>
          {PREF_OPTIONS.map((opt, i) => (
            <div
              key={opt.key}
              onClick={() => setPrefs(p => ({ ...p, [opt.key]: !p[opt.key] }))}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.05)", borderBottom: i < PREF_OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                <div style={{ color: C.g3, fontSize: 11, marginTop: 3 }}>{opt.desc}</div>
              </div>
              <div style={{ width: 46, height: 26, borderRadius: 13, background: prefs[opt.key] ? `linear-gradient(90deg,${C.teal},${C.teal2})` : "rgba(255,255,255,0.12)", position: "relative" as const, flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ position: "absolute" as const, top: 3, left: prefs[opt.key] ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(79,209,197,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(79,209,197,0.15)" }}>
          <div style={{ color: C.g2, fontSize: 12, lineHeight: 1.6 }}>
            Notifications are sent by {AGENCY} through the CAREi platform. Your preferences are saved and can be changed at any time.
          </div>
        </div>
      </div>
    );
  }

  function renderWorried() {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 18px 14px", flexShrink: 0 }}>
          <button onClick={() => nav("home")} style={{ background: "none", border: "none", color: C.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>I'm worried about {clientFirst}</div>
          <div style={{ color: C.g2, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
            Tell us what's on your mind. This goes straight to the care manager at {AGENCY} — not to an individual carer.
          </div>
        </div>

        <div className="phone-scroll" style={{ flex: 1, padding: "0 18px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Quick picks — tap to add</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {WORRIED_PICKS.map(pick => (
              <button
                key={pick}
                onClick={() => setWorryPick(pick === worryPick ? "" : pick)}
                style={{ padding: "8px 14px", borderRadius: 99, border: `1px solid ${worryPick === pick ? "rgba(255,90,95,0.5)" : "rgba(255,255,255,0.12)"}`, background: worryPick === pick ? "rgba(255,90,95,0.15)" : "rgba(255,255,255,0.05)", color: worryPick === pick ? "#FF5A5F" : C.g2, fontFamily: "DM Sans,sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                {pick}
              </button>
            ))}
          </div>

          <div>
            <SectionLabel>Your message</SectionLabel>
            <textarea
              rows={5}
              value={worryText}
              onChange={(e: any) => setWorryText(e.target.value)}
              placeholder="Describe what you've noticed or what's worrying you..."
              style={{ marginTop: 8, width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,90,95,0.25)", borderRadius: 12, color: "#fff", fontFamily: "DM Sans,sans-serif", fontSize: 13, lineHeight: 1.6, padding: "12px 14px", resize: "none" as const, outline: "none", boxSizing: "border-box" as const }}
            />
          </div>

          <button
            onClick={submitWorry}
            disabled={!combined}
            style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: combined ? "linear-gradient(90deg,#FF5A5F,#E53E3E)" : "rgba(255,255,255,0.08)", color: combined ? "#fff" : C.g3, fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 700, cursor: combined ? "pointer" : "default" }}
          >
            Send to care manager
          </button>

          <div style={{ color: C.g3, fontSize: 11, textAlign: "center" as const, lineHeight: 1.5 }}>
            For medical emergencies, always call 999 first.
          </div>
        </div>
      </div>
    );
  }

  function renderConfirm() {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 24, textAlign: "center" as const }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(167,243,208,0.15)", border: "2px solid rgba(167,243,208,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✓</div>
        <div>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff", marginBottom: 12 }}>Message sent</div>
          <div style={{ color: C.g2, fontSize: 14, lineHeight: 1.7 }}>
            The care manager at {AGENCY} has been notified and will follow up with you shortly. Your concern has been logged.
          </div>
        </div>
        <div style={{ background: "rgba(79,209,197,0.07)", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(79,209,197,0.15)", width: "100%", textAlign: "left" as const }}>
          <div style={{ color: C.teal, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>What happens next</div>
          <div style={{ color: C.g2, fontSize: 12, lineHeight: 1.65 }}>
            A member of the {AGENCY} team will review your concern and contact you. This usually happens within 2 hours during working hours.
          </div>
        </div>
        <button
          onClick={() => nav("home")}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg,${C.teal},${C.teal2})`, color: "#0F1D34", fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Back to {clientFirst}'s updates
        </button>
      </div>
    );
  }

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${C.dark} 0%, ${C.navy} 100%)`, display: "flex", flexDirection: "column", position: "relative" as const }}>

      {/* Top bar */}
      {!hideNav && (
        <div style={{ padding: "14px 18px 12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.g2, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{clientFirst}'s Updates</div>
            <div style={{ color: C.g3, fontSize: 10, marginTop: 1 }}>{AGENCY} · Family Portal</div>
          </div>
          <div style={{ width: 28 }} />
        </div>
      )}

      {/* Screen content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {screen === "home"           && renderHome()}
        {screen === "story"          && renderStory()}
        {screen === "context"        && renderContext()}
        {screen === "prefs"          && renderPrefs()}
        {screen === "worried"        && renderWorried()}
        {screen === "worried-confirm" && renderConfirm()}
      </div>

      {/* Bottom nav */}
      {!hideNav && (
        <div style={{ position: "absolute" as const, bottom: 0, left: 0, right: 0, background: "rgba(10,22,40,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", padding: "8px 0 20px" }}>
          {[
            { id: "home",    icon: "🏠", label: "Home"    },
            { id: "story",   icon: "📖", label: "Story"   },
            { id: "context", icon: "💬", label: "Notes"   },
            { id: "prefs",   icon: "🔔", label: "Alerts"  },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => nav(tab.id as FVScreen)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span style={{ color: screen === tab.id ? C.teal : C.g3, fontSize: 10, fontWeight: screen === tab.id ? 700 : 400, fontFamily: "DM Sans,sans-serif" }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
