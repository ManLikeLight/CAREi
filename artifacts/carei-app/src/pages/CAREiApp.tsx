import { useState, useEffect, useRef } from "react";
import AdminDashboard from "./AdminDashboard";
// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "otp"
  | "signup"
  | "login"
  | "splash"
  | "today"
  | "client-overview"
  | "active-visit"
  | "medication"
  | "handover"
  | "continucare-summary"
  | "care-plan"
  | "bodymap"
  | "emergency"
  | "visit-history"
  | "incident-report"
  | "rota"
  | "operations"
  | "schedule"
  | "family"
  | "family-summary"
  | "manager-approvals"
  | "copilot"
  | "profile"
  | "admin"
  | "admin-dashboard";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const COLORS = {
  navy: "#1B2A49",
  darkNavy: "#0F1D34",
  teal: "#4FD1C5",
  teal2: "#38B2AC",
  amber: "#F6B73C",
  red: "#FF5A5F",
  green: "#22C55E",
  g0: "#F8FAFC",
  g1: "#E2E8F0",
  g2: "#94A3B8",
  g3: "#475569",
  g4: "#64748B",
};

const CLIENT = {
  name: "Grace Mensah",
  age: 83,
  address: "10 Oak Avenue, Reading RG1 4AT",
  conditions: ["Hypertension", "T2 Diabetes", "Mild Cognitive Impairment"],
  allergy: "Penicillin",
  gp: "Dr Sandra Obi",
  meds: [
    { name: "Amlodipine", dose: "5mg", time: "10AM", route: "Oral", adminNote: "Give with a full glass of water. Monitor for dizziness for 20 mins after." },
    { name: "Metformin", dose: "500mg", time: "10AM", route: "Oral", adminNote: "⚠ Give AFTER meals, never on an empty stomach. Monitor for nausea/vomiting for 30 mins after administration." },
    { name: "Atorvastatin", dose: "20mg", time: "10AM", route: "Oral", adminNote: "Give at same time each day. Monitor for any muscle pain or weakness after administration." },
  ],
};

const TASKS = [
  "Personal care: wash, dress",
  "Breakfast preparation",
  "Morning medication (10AM)",
  "Blood pressure check",
  "Activity & social engagement",
];

const QUICK_CHIPS = [
  "Paracetamol safe?",
  "Fall risk?",
  "What did she eat?",
  "Medications",
];

const OFFLINE_RESPONSES: Record<string, string> = {
  "Paracetamol safe?":
    "Paracetamol is generally safe for Grace at standard doses (500mg–1g up to 4x daily). Always confirm with her GP given her conditions. No known interactions with her current medications.",
  "Fall risk?":
    "Grace has an elevated fall risk due to her age (83), T2 Diabetes (peripheral neuropathy risk), and Mild Cognitive Impairment. Ensure pathways are clear, grab rails are accessible, and footwear is secure.",
  "What did she eat?":
    "No meal data recorded yet for today's visit. Document meals in the visit notes once breakfast has been prepared and served.",
  Medications:
    "Grace's current medications: Amlodipine 5mg (10AM oral) for hypertension, Metformin 500mg (10AM oral, AFTER meals) for T2 Diabetes, Atorvastatin 20mg (10AM oral) for cholesterol. ALLERGY: Penicillin. Always monitor for 20–30 mins after administration.",
};

const SCHEDULE_CLIENTS = [
  {
    id: "mary",
    name: "Mary Johnson",
    age: 82,
    address: "4 Birch Close, Reading RG2 7LN",
    time: "09:00 – 10:00",
    condition: "Dementia",
    tags: ["Dementia", "Medication Required"],
    emoji: "👩🏼",
    gp: "Dr A. Patel · Earley Surgery",
    allergy: "None known",
    supportLevel: "Full physical assistance + 1-to-1 supervision throughout",
    framework: "Person-Centred · PBS · Dementia Care Mapping (DCM)",
    communication: "Use simple words and short sentences. Validate feelings, never argue or correct. Approach from the front, maintain eye contact. Mary may not recognise you, introduce yourself each visit.",
    mobilityNote: "Walking frame required at all times, high fall risk",
    medNote: "Donepezil 10mg after breakfast · Aspirin 75mg with food",
    vitalSignsRequired: false,
    vitalSignsThreshold: "",
    lastHandoverBullets: [
      "Mary was calm and cooperative throughout, no exit-seeking behaviour noted. Personal care completed fully.",
      "No changes since last visit, routine and medication both as planned. Ate a full breakfast.",
      "Watch for: agitation around mealtimes, offer familiar music as a calming distraction before continuing.",
    ],
    contextualCues: [
      { trigger: "Prepare breakfast", content: "Encourage fluid alongside meal, Mary requires 6–8 glasses daily. Offer water or juice first before starting breakfast. Aspirin must be given WITH food." },
      { trigger: "Assist with mobility", content: "Walking frame must remain within reach at all times. Mary is HIGH FALL RISK, never leave her standing unassisted. Remove trip hazards before starting movement." },
      { trigger: "Record mood", content: "Use the PBS framework: Green (calm/engaging), Amber (repetitive questioning/pacing), Red (physical behaviour). Document what helped in the notes." },
    ],
    meds: [
      { name: "Aspirin", dose: "75mg", adminNote: "Give with food. Monitor for stomach discomfort." },
      { name: "Donepezil", dose: "10mg", adminNote: "Give after breakfast. Monitor for nausea or sleep disturbance." },
    ],
  },
  {
    id: "tom",
    name: "Tom Adams",
    age: 75,
    address: "12 Elm Street, Reading RG1 2BT",
    time: "10:30 – 11:00",
    condition: "Post Stroke",
    tags: ["Post Stroke", "Mobility Support"],
    emoji: "👨🏾",
    gp: "Dr M. Clarke · Castle Hill Surgery",
    allergy: "None known",
    supportLevel: "Physical assistance with personal care and transfers. Mobility support throughout.",
    framework: "Person-Centred · Stroke Rehabilitation Approach · PACE",
    communication: "Speak slowly and clearly, Tom may have word-finding difficulties. Allow extra time to respond. Do not finish his sentences. Use gestures where helpful.",
    mobilityNote: "Hoist required for transfers, never attempt manual lift alone",
    medNote: "Aspirin 75mg and Lisinopril 10mg with morning meal",
    vitalSignsRequired: true,
    vitalSignsThreshold: "Report to supervisor if BP above 140/90 mmHg, call office immediately",
    lastHandoverBullets: [
      "Tom completed transfers safely with hoist, cooperated well. BP 138/86, within normal range.",
      "Change since last visit: appetite slightly reduced, ate approximately half of breakfast.",
      "Watch for: any difficulty swallowing, do not rush food or drink; report immediately if observed.",
    ],
    contextualCues: [
      { trigger: "Prepare breakfast", content: "Aspirin and Lisinopril must be given WITH this meal, confirm Tom has eaten before administering. Record BP 20 mins after Lisinopril." },
      { trigger: "Assist with mobility", content: "Hoist required for ALL transfers, never attempt manual lift alone. Support Tom's affected side throughout. Allow him extra time, do not rush." },
      { trigger: "Record mood", content: "Allow extra time for Tom to communicate, post-stroke aphasia means he needs processing time. Do not finish his sentences. Note any visible frustration or withdrawal." },
    ],
    meds: [
      { name: "Aspirin", dose: "75mg", adminNote: "Give with morning meal. Monitor for dizziness." },
      { name: "Lisinopril", dose: "10mg", adminNote: "Give with food. Monitor blood pressure. Report readings above 140/90." },
    ],
  },
  {
    id: "aisha",
    name: "Aisha Khan",
    age: 69,
    address: "8 Maple Drive, Reading RG4 5PQ",
    time: "12:00 – 13:00",
    condition: "Diabetes",
    tags: ["Diabetes", "Nutrition Monitoring"],
    emoji: "👩🏽",
    gp: "Dr F. Hassan · Woodley Health Centre",
    allergy: "Sulfonamides: do not administer",
    supportLevel: "Verbal prompts and encouragement. Assistance with nutrition monitoring and medication.",
    framework: "Person-Centred · Diabetes Care Protocol · Trauma-Informed Care",
    communication: "Aisha speaks English and Urdu. Use simple language and offer choices. She is private, always explain what you are doing before doing it.",
    mobilityNote: "Independent walking, monitor for dizziness (hypoglycaemia risk)",
    medNote: "Metformin 500mg AFTER meals, never on empty stomach",
    vitalSignsRequired: false,
    vitalSignsThreshold: "",
    lastHandoverBullets: [
      "Aisha in good spirits, engaged positively with carer. Blood sugar 7.2 mmol/L before Metformin.",
      "No changes since last visit, foot inspection normal, no redness, wounds or swelling noted.",
      "Watch for: signs of hypoglycaemia before and after meals, sweating, shaking, confusion, pale skin.",
    ],
    contextualCues: [
      { trigger: "Prepare breakfast", content: "Confirm Aisha has eaten BEFORE giving Metformin, never administer on an empty stomach. Monitor for nausea for 30 mins after. Encourage water with meal." },
      { trigger: "Assist with mobility", content: "Monitor for dizziness before and after movement, hypoglycaemia risk. If Aisha appears unsteady or confused, sit her down and check blood sugar immediately." },
      { trigger: "Record mood", content: "Always explain each step before doing it, Aisha values being in control of her care. Note any signs of withdrawal or reduced engagement; these may indicate low blood sugar." },
    ],
    meds: [
      { name: "Metformin", dose: "500mg", adminNote: "⚠ Give AFTER meals only, never on an empty stomach. Monitor for nausea for 30 mins after." },
      { name: "Lisinopril", dose: "10mg", adminNote: "Give with food. Monitor blood pressure and report readings above 140/90." },
    ],
  },
];

// ─── CSS Injected Globally ──────────────────────────────────────────────────────

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
  
  .carei-root * { box-sizing: border-box; }
  
  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.4); }
    50% { transform: scaleY(1); }
  }
  
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes tick-draw {
    to { stroke-dashoffset: 0; }
  }
  
  @keyframes sosFlash {
    0%, 100% { background-color: #FF5A5F; }
    50% { background-color: #cc1a20; }
  }
  
  .wave-bar { animation: waveBar 0.6s ease-in-out infinite; }
  .wave-bar:nth-child(2) { animation-delay: 0.1s; }
  .wave-bar:nth-child(3) { animation-delay: 0.2s; }
  .wave-bar:nth-child(4) { animation-delay: 0.3s; }
  
  .dot-1 { animation: pulse-dot 1.2s ease-in-out infinite; }
  .dot-2 { animation: pulse-dot 1.2s ease-in-out 0.4s infinite; }
  .dot-3 { animation: pulse-dot 1.2s ease-in-out 0.8s infinite; }
  
  .fade-in { animation: fadeIn 0.3s ease-out forwards; }
  
  .sos-flash { animation: sosFlash 1s ease-in-out infinite; }
  
  .phone-scroll {
    overflow-y: auto;
    scrollbar-width: none;
  }
  .phone-scroll::-webkit-scrollbar { display: none; }
  
  .task-check {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid #4FD1C5;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
  }
  .task-check.checked { background: #4FD1C5; }

  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .slide-up { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards; }

  @keyframes sosPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255,90,95,0.7); }
    70% { box-shadow: 0 0 0 14px rgba(255,90,95,0); }
  }
  .sos-pulse { animation: sosPulse 1.4s ease-in-out infinite; }
`;

// ─── Helper Functions ──────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface VisitData {
  notes: string;
  confirmedMeds: string[];
  skippedMeds: string[];
  fluidMl: number;
  completedTasks: string[];
  mealStatus: string;
  mood: string;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Badge({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}

function NavPills({
  current,
  onNav,
}: {
  current: Screen;
  onNav: (s: Screen) => void;
}) {
  const screens: { key: Screen; label: string }[] = [
    { key: "otp", label: "Login" },
    { key: "today", label: "Today's Care" },
    { key: "client-overview", label: "Client Overview" },
    { key: "active-visit", label: "Active Visit" },
    { key: "medication", label: "Medications" },
    { key: "handover", label: "Handover" },
    { key: "continucare-summary", label: "Visit Summary" },
    { key: "care-plan", label: "Care Plan" },
    { key: "bodymap", label: "Body Map" },
    { key: "emergency", label: "Emergency" },
    { key: "visit-history", label: "Visit History" },
    { key: "incident-report", label: "Incident Report" },
    { key: "rota", label: "My Rota" },
    { key: "operations", label: "Operations" },
    { key: "schedule", label: "Schedule" },
    { key: "family", label: "Family Portal" },
    { key: "family-summary", label: "Family Summary" },
    { key: "manager-approvals", label: "Manager Approvals" },
    { key: "copilot", label: "AI Copilot" },
    { key: "profile", label: "Profile" },
    { key: "admin", label: "Admin" },
    { key: "admin-dashboard", label: "Admin Dashboard" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 20,
        padding: "0 12px",
      }}
    >
      {screens.map((s) => (
        <button
          key={s.key}
          onClick={() => onNav(s.key)}
          style={{
            padding: "6px 14px",
            borderRadius: 99,
            border: "none",
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            background: current === s.key ? COLORS.teal : "rgba(255,255,255,0.15)",
            color: current === s.key ? COLORS.darkNavy : "#fff",
            transition: "all 0.2s",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Screens ───────────────────────────────────────────────────────────────────

function SplashScreen({ onSignUp, onLogin }: { onSignUp: () => void; onLogin: () => void }) {
  return (
    <div style={{
      height: "100%",
      background: "linear-gradient(180deg, #070e1d 0%, #0b1628 55%, #0f1e34 100%)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Soft teal glow behind the logo */}
      <div style={{
        position: "absolute",
        top: "28%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320,
        height: 320,
        background: "radial-gradient(circle, rgba(79,209,197,0.11) 0%, rgba(79,209,197,0) 68%)",
        pointerEvents: "none",
      }} />
      {/* Teal warmth rising from the bottom */}
      <div style={{
        position: "absolute",
        bottom: -30,
        left: "50%",
        transform: "translateX(-50%)",
        width: 380,
        height: 200,
        background: "radial-gradient(ellipse at bottom, rgba(79,209,197,0.10) 0%, rgba(79,209,197,0) 72%)",
        pointerEvents: "none",
      }} />

      {/* Centred hero group */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 28px",
        textAlign: "center",
        position: "relative",
        gap: 0,
      }}>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 40, color: "#fff", letterSpacing: 1, lineHeight: 1 }}>
          CARE<span style={{ color: COLORS.teal }}>i</span>
        </div>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "rgba(255,255,255,0.92)", marginTop: 14, lineHeight: 1.4, letterSpacing: 0.1 }}>
          Built for the carer,<br />by a carer
        </div>
        {/* Badges */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, marginTop: 26 }}>
          {["AI Powered", "GDPR Ready", "Built for UK care compliance"].map((b) => (
            <span
              key={b}
              style={{
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 99,
                border: "1px solid rgba(79,209,197,0.32)",
                background: "rgba(79,209,197,0.08)",
                color: COLORS.teal,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
                letterSpacing: 0.2,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* CTA buttons + footer tagline */}
      <div style={{ padding: "0 24px 34px", position: "relative" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onSignUp}
            style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            Sign Up
          </button>
          <button
            onClick={onLogin}
            style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: `2px solid ${COLORS.teal}`, background: "transparent", color: COLORS.teal, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            Log In
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <span style={{ color: COLORS.g3, fontSize: 11, letterSpacing: 0.3 }}>Intelligent Care. Every Visit.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Client Overview Screen ────────────────────────────────────────────────────

function ClientOverviewScreen({
  client,
  onStartVisit,
  onBack,
}: {
  client: typeof SCHEDULE_CLIENTS[0];
  onStartVisit: () => void;
  onBack: () => void;
}) {
  const isAllergyRisk = client.allergy && client.allergy !== "None known";
  const isMetformin = client.meds.some((m) => m.name === "Metformin");
  // Feature 5, Handover read receipt
  const [handoverRead, setHandoverRead] = useState(false);
  const firstName = client.name.split(" ")[0];

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 10 }}>‹</button>
        <div style={{ color: COLORS.teal, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Client Brief, Before You Start</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 24 }}>{client.emoji}</span>
          </div>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", color: "#fff", fontSize: 20 }}>{client.name}</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>{client.age} years · {client.address}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {client.tags.map((t) => (
            <span key={t} style={{ background: "rgba(255,255,255,0.08)", color: COLORS.g1, fontSize: 11, borderRadius: 99, padding: "3px 9px", fontWeight: 600 }}>{t}</span>
          ))}
          <span style={{ background: "rgba(79,209,197,0.12)", color: COLORS.teal, fontSize: 11, borderRadius: 99, padding: "3px 9px", fontWeight: 600 }}>⏰ {client.time}</span>
        </div>
      </div>

      {/* Allergy warning if relevant */}
      {isAllergyRisk && (
        <div style={{ margin: "0 16px 10px", background: "rgba(255,90,95,0.12)", border: "1px solid rgba(255,90,95,0.35)", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start", flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ color: COLORS.red, fontWeight: 700, fontSize: 13 }}>ALLERGY: {client.allergy}</div>
            <div style={{ color: "rgba(255,90,95,0.8)", fontSize: 11, marginTop: 2 }}>Do not administer this medication under any circumstances</div>
          </div>
        </div>
      )}

      {/* Key info card */}
      <div className="phone-scroll" style={{ flex: 1, padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", borderLeft: `3px solid ${COLORS.teal}` }}>
          {[
            { icon: "🩺", label: "GP", value: client.gp },
            { icon: "🤝", label: "Support level", value: client.supportLevel },
            { icon: "🧭", label: "Framework", value: client.framework },
            { icon: "🚶", label: "Mobility", value: client.mobilityNote },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
              <div>
                <span style={{ color: COLORS.g3, fontSize: 11, fontWeight: 600 }}>{row.label}: </span>
                <span style={{ color: COLORS.g1, fontSize: 13 }}>{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Communication Passport */}
        <div style={{ background: "rgba(167,139,250,0.08)", borderRadius: 14, padding: "14px 16px", borderLeft: "3px solid #a78bfa" }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>Communication Passport</div>
          </div>
          <div style={{ color: COLORS.g1, fontSize: 13, lineHeight: 1.6 }}>{client.communication}</div>
        </div>

        {/* Medications */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", borderLeft: `3px solid ${COLORS.amber}` }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>💊</span>
            <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 13 }}>Medications Due</div>
          </div>
          {client.meds.map((m) => (
            <div key={m.name} style={{ marginBottom: 10 }}>
              <div style={{ color: m.name === "Metformin" ? COLORS.amber : "#fff", fontWeight: 700, fontSize: 13 }}>{m.name} {m.dose} {m.name === "Metformin" ? "⚠" : ""}</div>
              {m.adminNote && <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{m.adminNote}</div>}
            </div>
          ))}
          {isMetformin && (
            <div style={{ background: "rgba(246,183,60,0.12)", borderRadius: 8, padding: "7px 10px", marginTop: 4 }}>
              <span style={{ color: COLORS.amber, fontSize: 12, fontWeight: 700 }}>⚠ Metformin must be given AFTER meals, confirm client has eaten first</span>
            </div>
          )}
        </div>
      </div>

      {/* Smart Handover Briefing */}
      <div style={{ padding: "0 16px 10px", flexShrink: 0 }}>
        <div style={{ background: handoverRead ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.05)", borderRadius: 14, padding: "13px 14px", border: `1px solid ${handoverRead ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"}` }}>
          {handoverRead ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13 }}>Briefing confirmed, you're ready to start</div>
                <div style={{ color: COLORS.g3, fontSize: 11, marginTop: 2 }}>Confirmed at {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>📋</span>
                <div style={{ color: COLORS.g1, fontWeight: 700, fontSize: 13 }}>Last Visit, Key Points</div>
                <span style={{ marginLeft: "auto", color: COLORS.g3, fontSize: 10, fontStyle: "italic" }}>~10 sec read</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {(client.lastHandoverBullets as string[]).map((bullet, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: i === 0 ? COLORS.teal : i === 1 ? COLORS.green : COLORS.amber, flexShrink: 0, marginTop: 4 }} />
                    <span style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.5 }}>{bullet}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setHandoverRead(true)} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.08)", color: COLORS.teal, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                ✓ I've seen this, start visit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Start Visit CTA */}
      <div style={{ padding: "6px 16px 20px", flexShrink: 0 }}>
        <button
          onClick={onStartVisit}
          disabled={!handoverRead}
          style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: handoverRead ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.1)", color: handoverRead ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 16, fontWeight: 700, cursor: handoverRead ? "pointer" : "not-allowed", letterSpacing: 0.3 }}
        >
          {handoverRead ? "Start Visit →" : "Confirm handover first"}
        </button>
      </div>
    </div>
  );
}

function PinBoxes({ pin, refs, onChange, onKeyDown }: {
  pin: string[];
  refs: React.RefObject<HTMLInputElement>[];
  onChange: (i: number, val: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
      {pin.map((v, i) => (
        <input
          key={i}
          ref={refs[i]}
          value={v ? "●" : ""}
          onChange={(e) => {
            const raw = e.target.value.replace("●", "").replace(/\D/g, "");
            if (raw.length <= 1) onChange(i, raw);
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          maxLength={1}
          inputMode="numeric"
          style={{
            width: 56,
            height: 64,
            borderRadius: 12,
            border: `2px solid ${v ? COLORS.teal : "rgba(255,255,255,0.2)"}`,
            background: "rgba(255,255,255,0.07)",
            color: v ? COLORS.teal : "transparent",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            outline: "none",
            caretColor: "transparent",
          }}
        />
      ))}
    </div>
  );
}

function AuthSuccess({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 24 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="30" fill={COLORS.teal} />
        <polyline points="18,33 27,42 46,22" fill="none" stroke={COLORS.darkNavy} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>{message}</div>
    </div>
  );
}

function SignUpScreen({ onNext, onLogin }: { onNext: (name: string, agency: string, email: string) => void; onLogin: () => void }) {
  const [step, setStep] = useState<"name" | "pin" | "done">("name");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [email, setEmail] = useState("");
  const [agency, setAgency] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [agencyError, setAgencyError] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handlePinChange(i: number, val: string) {
    const next = [...pin];
    next[i] = val;
    setPin(next);
    if (val && i < 3) setTimeout(() => pinRefs[i + 1].current?.focus(), 0);
  }

  function handlePinKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      const next = [...pin];
      next[i - 1] = "";
      setPin(next);
      setTimeout(() => pinRefs[i - 1].current?.focus(), 0);
    }
  }

  function handleNameNext() {
    let ok = true;
    if (!fullName.trim()) { setNameError("Please enter your full name."); ok = false; } else setNameError("");
    if (!email.trim()) { setEmailError("Please enter your email address."); ok = false; } else setEmailError("");
    if (!agency.trim()) { setAgencyError("Please enter your agency name."); ok = false; } else setAgencyError("");
    if (!ok) return;
    setStep("pin");
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  }

  async function handleCreate() {
    const p = pin.join("");
    if (p.length < 4) { setPinError("Please enter all 4 digits."); return; }
    setPinError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName.trim(), email: email.trim(), agency: agency.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) { setPinError(data.error ?? "Signup failed. Please try again."); setLoading(false); return; }
      try { sessionStorage.setItem("carei_account", JSON.stringify({ name: data.name, email: data.email, agency: data.agency })); } catch {}
      setStep("done");
      setTimeout(() => onNext(data.name, data.agency, email.trim()), 1200);
    } catch {
      setPinError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", marginTop: 8, padding: "13px 16px",
    borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)", color: "#fff",
    fontFamily: "DM Sans, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
    background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
    color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer",
  };

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", overflowY: "auto", padding: "52px 28px 32px", gap: 24 }}>
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 30, color: "#fff", letterSpacing: 0.5 }}>
          CARE<span style={{ color: COLORS.teal }}>i</span>
        </div>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff", marginTop: 16 }}>Create your account</div>
      </div>

      {step === "done" && <AuthSuccess message="Account created! Welcome aboard…" />}

      {step === "name" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
              placeholder="Enter your full name"
              autoFocus
              style={inputStyle}
            />
            {nameError && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 6 }}>{nameError}</div>}
          </div>
          <div>
            <label style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Email address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
              placeholder="Enter your email address"
              type="email"
              inputMode="email"
              style={inputStyle}
            />
            {emailError && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 6 }}>{emailError}</div>}
          </div>
          <div>
            <label style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Agency name</label>
            <input
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
              placeholder="Enter your agency name"
              style={inputStyle}
            />
            {agencyError && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 6 }}>{agencyError}</div>}
          </div>
          <button onClick={handleNameNext} style={{ ...btnStyle, marginTop: 4 }}>Continue →</button>
          <button onClick={onLogin} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
            Already have an account? Log in
          </button>
        </div>
      )}

      {step === "pin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Choose a 4-digit PIN</div>
            <div style={{ color: COLORS.g2, fontSize: 13 }}>You'll use this to log in each time</div>
          </div>
          <PinBoxes pin={pin} refs={pinRefs} onChange={handlePinChange} onKeyDown={handlePinKey} />
          {pinError && <div style={{ color: COLORS.red, fontSize: 13, textAlign: "center" }}>{pinError}</div>}
          <button onClick={handleCreate} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>{loading ? "Creating account…" : "Create Account"}</button>
          <button onClick={() => setStep("name")} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>← Back</button>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onNext, onSignUp }: { onNext: (name: string, agency: string, email: string) => void; onSignUp: () => void }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handlePinChange(i: number, val: string) {
    const next = [...pin];
    next[i] = val;
    setPin(next);
    if (val && i < 3) setTimeout(() => pinRefs[i + 1].current?.focus(), 0);
    if (next.every(d => d) && email.trim()) handleVerify(next.join(""));
  }

  function handlePinKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      const next = [...pin];
      next[i - 1] = "";
      setPin(next);
      setTimeout(() => pinRefs[i - 1].current?.focus(), 0);
    }
  }

  async function handleVerify(code?: string) {
    const p = code ?? pin.join("");
    if (!email.trim()) { setEmailError("Please enter your email address."); return; }
    setEmailError("");
    if (p.length < 4) { setError("Please enter all 4 digits."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        setPin(["", "", "", ""]);
        setTimeout(() => pinRefs[0].current?.focus(), 50);
        setLoading(false);
        return;
      }
      try { sessionStorage.setItem("carei_account", JSON.stringify({ name: data.name, email: data.email, agency: data.agency })); } catch {}
      setDone(true);
      setTimeout(() => onNext(data.name, data.agency, data.email ?? email.trim()), 1200);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setPin(["", "", "", ""]);
      setTimeout(() => pinRefs[0].current?.focus(), 50);
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", marginTop: 8, padding: "13px 16px",
    borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)", color: "#fff",
    fontFamily: "DM Sans, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", padding: "52px 28px 32px", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 30, color: "#fff", letterSpacing: 0.5 }}>
          CARE<span style={{ color: COLORS.teal }}>i</span>
        </div>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff", marginTop: 20 }}>Welcome back</div>
      </div>

      {done && <AuthSuccess message="PIN verified! Signing you in…" />}

      {!done && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Email address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pinRefs[0].current?.focus()}
              placeholder="Enter your email address"
              type="email"
              inputMode="email"
              autoFocus
              style={inputStyle}
            />
            {emailError && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 6 }}>{emailError}</div>}
          </div>
          <div>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>4-digit PIN</div>
            <PinBoxes pin={pin} refs={pinRefs} onChange={handlePinChange} onKeyDown={handlePinKey} />
          </div>
          {error && <div style={{ color: COLORS.red, fontSize: 13, textAlign: "center" }}>{error}</div>}
          <button
            onClick={() => handleVerify()}
            disabled={loading}
            style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in…" : "Log In"}
          </button>
          <button onClick={onSignUp} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
            New here? Sign up instead
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardScreen({
  onVisit,
  onCopilot,
  onSOS,
  onFamily,
  onAdmin,
  onHistory,
  onProfile,
}: {
  onVisit: () => void;
  onCopilot: () => void;
  onSOS: () => void;
  onFamily: () => void;
  onAdmin: () => void;
  onHistory: () => void;
  onProfile: () => void;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const visits = [
    {
      name: "Patricia Williams",
      time: "08:00 – 09:00",
      type: "Companionship",
      status: "Completed",
      statusColor: COLORS.green,
      statusBg: "rgba(34,197,94,0.15)",
    },
    {
      name: "Grace Mensah",
      time: "10:00 – 11:30",
      type: "Personal Care",
      status: "In Progress",
      statusColor: COLORS.teal,
      statusBg: "rgba(79,209,197,0.15)",
    },
    {
      name: "James Okafor",
      time: "13:00 – 14:00",
      type: "Medication",
      status: "Upcoming",
      statusColor: COLORS.amber,
      statusBg: "rgba(246,183,60,0.15)",
    },
  ];

  return (
    <div
      style={{
        height: "100%",
        background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ padding: "24px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: COLORS.g2, fontSize: 13 }}>{greeting},</div>
            <div style={{ color: "#fff", fontFamily: "DM Serif Display, serif", fontSize: 24 }}>
              Sarah
            </div>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.darkNavy,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            SJ
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginTop: 20,
          }}
        >
          {[
            { label: "Visits", value: "3" },
            { label: "Hours", value: "4.5" },
            { label: "Tasks", value: "12" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "12px 10px",
                textAlign: "center",
              }}
            >
              <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 22 }}>
                {s.value}
              </div>
              <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visit cards */}
      <div
        className="phone-scroll"
        style={{ flex: 1, padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Today's Visits
        </div>
        {visits.map((v) => (
          <div
            key={v.name}
            onClick={v.status === "In Progress" ? onVisit : undefined}
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: "14px 16px",
              cursor: v.status === "In Progress" ? "pointer" : "default",
              border: v.status === "In Progress"
                ? `1px solid rgba(79,209,197,0.3)`
                : "1px solid transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>{v.time}</div>
                <div style={{ color: COLORS.g2, fontSize: 12 }}>{v.type}</div>
              </div>
              <Badge color={v.statusColor} bg={v.statusBg}>
                {v.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Quick-action strip */}
      <div style={{ padding: "0 16px 12px", display: "flex", gap: 8 }}>
        <button onClick={onFamily} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: "1px solid rgba(79,209,197,0.25)", background: "rgba(79,209,197,0.08)", color: COLORS.teal, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 18 }}>👨‍👩‍👧</span>Family Portal
        </button>
        <button onClick={onHistory} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: COLORS.g1, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 18 }}>📂</span>Visit History
        </button>
        <button onClick={onAdmin} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: "1px solid rgba(246,183,60,0.25)", background: "rgba(246,183,60,0.08)", color: COLORS.amber, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 18 }}>📊</span>Admin View
        </button>
      </div>

      {/* Ask AI button */}
      <button
        onClick={onCopilot}
        style={{
          position: "absolute",
          bottom: 88,
          right: 20,
          width: 54,
          height: 54,
          borderRadius: "50%",
          border: "none",
          background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
          color: COLORS.darkNavy,
          fontSize: 22,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 20px rgba(79,209,197,0.4)`,
        }}
        title="Ask AI"
      >
        ✦
      </button>

      {/* Bottom nav */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 78,
          background: "rgba(15,29,52,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 8px",
        }}
      >
        {[
          { icon: "🏠", label: "Home", action: undefined as undefined | (() => void) },
          { icon: "📅", label: "Schedule", action: undefined },
          { icon: "📋", label: "Reports", action: undefined },
          { icon: "👤", label: "Profile", action: onProfile },
        ].map((n) => (
          <div
            key={n.label}
            onClick={n.action}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: n.action ? "pointer" : "default",
              gap: 2,
              opacity: n.label === "Home" ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ color: COLORS.g2, fontSize: 10 }}>{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveVisitScreen({
  onBack,
  onCopilot,
  onMeds,
  onSOS,
  onBodyMap,
  onEmergency,
  onCarePlan,
}: {
  onBack: () => void;
  onCopilot: () => void;
  onMeds: () => void;
  onSOS: () => void;
  onBodyMap: () => void;
  onEmergency: () => void;
  onCarePlan: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLone, setIsLone] = useState(false);
  const [loneElapsed, setLoneElapsed] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [tasks, setTasks] = useState(TASKS.map(() => false));
  const [showIncident, setShowIncident] = useState(false);
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [notes, setNotes] = useState("");
  const [interim, setInterim] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigDrawing = useRef(false);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  function sigStart(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    sigDrawing.current = true;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }
  function sigMove(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!sigDrawing.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#4FD1C5";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function sigEnd() { sigDrawing.current = false; }
  function clearSig() {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    visitIntervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (visitIntervalRef.current) clearInterval(visitIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLone) {
      loneIntervalRef.current = setInterval(() => setLoneElapsed((e) => e + 1), 1000);
    } else {
      if (loneIntervalRef.current) clearInterval(loneIntervalRef.current);
      setLoneElapsed(0);
    }
    return () => {
      if (loneIntervalRef.current) clearInterval(loneIntervalRef.current);
    };
  }, [isLone]);

  const loneOverdue = isLone && loneElapsed >= 25 * 60;
  const doneCount = tasks.filter(Boolean).length;

  function toggleTask(i: number) {
    const next = [...tasks];
    next[i] = !next[i];
    setTasks(next);
  }

  function startRecording() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setNotes((n) => (n ? n + "\n" : "") + "[Dictation requires Chrome or Edge, open the app in a full browser tab and allow microphone access, then try again.]");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else inter += e.results[i][0].transcript;
      }
      if (final) setNotes((n) => n + final + " ");
      setInterim(inter);
    };
    rec.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setNotes((n) => (n ? n + "\n" : "") + "[Microphone access denied, please allow microphone permission in your browser and try again.]");
      } else if (e.error === "no-speech") {
        setNotes((n) => (n ? n + "\n" : "") + "[No speech detected, please speak clearly and try again.]");
      }
    };
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(
      () => setRecordingTime((t) => t + 1),
      1000,
    );
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setInterim("");
  }

  function insertChip(chip: string) {
    const inserts: Record<string, string> = {
      Mood: "Mood: appears calm and responsive. ",
      Appetite: "Appetite: ate well, finished breakfast. ",
      Mobility: "Mobility: walking with frame, steady. ",
    };
    setNotes((n) => n + (inserts[chip] || ""));
  }

  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(180deg, rgba(15,29,52,1) 0%, rgba(27,42,73,0.95) 100%)`,
          padding: "16px 16px 12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0 }}
          >
            ‹
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{CLIENT.name}</div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Personal Care Visit</div>
          </div>
          <button
            onClick={onSOS}
            style={{
              background: COLORS.red,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            SOS
          </button>
        </div>

        {/* Control pills */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
          <div
            style={{
              background: "rgba(79,209,197,0.15)",
              borderRadius: 99,
              padding: "5px 12px",
              color: COLORS.teal,
              fontSize: 13,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ⏱ {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setIsPrivate((p) => !p)}
            style={{
              background: isPrivate ? "rgba(246,183,60,0.2)" : "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 99,
              padding: "5px 12px",
              color: isPrivate ? COLORS.amber : COLORS.g2,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isPrivate ? "👁 PRIVATE" : "👁 VISIBLE"}
          </button>
          <button
            onClick={() => setIsLone((l) => !l)}
            style={{
              background: isLone ? "rgba(255,90,95,0.2)" : "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 99,
              padding: "5px 12px",
              color: isLone ? COLORS.red : COLORS.g2,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isLone ? "🔴 LONE" : "LONE"}
          </button>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: "rgba(246,183,60,0.9)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>📵</span>
          <span style={{ color: "#1B2A49", fontWeight: 700, fontSize: 12 }}>Offline, data will sync when reconnected</span>
        </div>
      )}

      {/* Lone worker banner */}
      {isLone && (
        <div
          style={{
            background: loneOverdue ? COLORS.red : "rgba(255,90,95,0.15)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>
              {loneOverdue ? "⚠ Check-in overdue!" : "Lone Worker Active"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
              {formatTime(loneElapsed)} since last check-in
            </div>
          </div>
          <button
            onClick={() => { setLoneElapsed(0); setCheckedIn(true); }}
            style={{
              background: "#fff",
              border: "none",
              borderRadius: 8,
              color: COLORS.red,
              fontWeight: 700,
              fontSize: 12,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Check In
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: COLORS.g2, fontSize: 12 }}>Visit Progress</span>
          <span style={{ color: COLORS.teal, fontSize: 12, fontWeight: 600 }}>
            {doneCount}/{TASKS.length} tasks
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, height: 6 }}>
          <div
            style={{
              height: 6,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
              width: `${(doneCount / TASKS.length) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="phone-scroll" style={{ flex: 1, padding: "12px 14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Client card */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.darkNavy,
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              GM
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{CLIENT.name}</div>
              <div style={{ color: COLORS.g2, fontSize: 12 }}>
                Age {CLIENT.age} · {CLIENT.address}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {CLIENT.conditions.map((c) => (
              <Badge key={c} color={COLORS.teal} bg="rgba(79,209,197,0.12)">
                {c}
              </Badge>
            ))}
            <Badge color="#fff" bg={COLORS.red}>
              ⚠ {CLIENT.allergy} Allergy
            </Badge>
          </div>
        </div>

        {/* Task checklist */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Task Checklist
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TASKS.map((task, i) => (
              <div
                key={task}
                onClick={() => toggleTask(i)}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              >
                <div className={`task-check ${tasks[i] ? "checked" : ""}`}>
                  {tasks[i] && (
                    <svg width="12" height="9" viewBox="0 0 12 9">
                      <polyline
                        points="1,5 4,8 11,1"
                        fill="none"
                        stroke={COLORS.darkNavy}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    color: tasks[i] ? COLORS.g3 : COLORS.g1,
                    fontSize: 13,
                    textDecoration: tasks[i] ? "line-through" : "none",
                  }}
                >
                  {task}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Copilot card */}
        <div
          onClick={onCopilot}
          style={{
            background: `linear-gradient(135deg, rgba(79,209,197,0.15), rgba(56,178,172,0.1))`,
            border: `1px solid rgba(79,209,197,0.3)`,
            borderRadius: 14,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 28 }}>✦</div>
          <div>
            <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 14 }}>
              AI Copilot
            </div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>
              Ask about Grace's care, medications & more
            </div>
          </div>
          <div style={{ marginLeft: "auto", color: COLORS.teal, fontSize: 18 }}>›</div>
        </div>

        {/* Incident Report card */}
        <div
          onClick={() => setShowIncident(true)}
          style={{
            background: "rgba(246,183,60,0.08)",
            border: `1px solid rgba(246,183,60,0.3)`,
            borderRadius: 14,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 22 }}>📋</div>
          <div>
            <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 14 }}>
              Incident Report
            </div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>
              Fall, med error, skin change
            </div>
          </div>
          <Badge color={COLORS.amber} bg="rgba(246,183,60,0.15)">CQC</Badge>
          <div style={{ marginLeft: "auto", color: COLORS.amber, fontSize: 18 }}>›</div>
        </div>

        {/* Body Map card */}
        <div onClick={onBodyMap} style={{ background: "rgba(255,90,95,0.08)", border: "1px solid rgba(255,90,95,0.25)", borderRadius: 14, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22 }}>🫀</div>
          <div>
            <div style={{ color: COLORS.red, fontWeight: 700, fontSize: 14 }}>Skin Integrity / Body Map</div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Mark pressure sores, bruising, skin changes</div>
          </div>
          <Badge color={COLORS.red} bg="rgba(255,90,95,0.15)">CQC</Badge>
          <div style={{ marginLeft: "auto", color: COLORS.red, fontSize: 18 }}>›</div>
        </div>

        {/* Quick links: Care Plan + Emergency Contacts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div onClick={onCarePlan} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 18 }}>📄</span>
            <div style={{ color: COLORS.g1, fontWeight: 600, fontSize: 13 }}>Care Plan</div>
            <div style={{ color: COLORS.g3, fontSize: 11 }}>Grace Mensah's care objectives</div>
          </div>
          <div onClick={onEmergency} style={{ background: "rgba(255,90,95,0.08)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div style={{ color: COLORS.red, fontWeight: 600, fontSize: 13 }}>Emergency Contacts</div>
            <div style={{ color: COLORS.g3, fontSize: 11 }}>Next of kin & GP details</div>
          </div>
        </div>

        {/* Voice notes */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>
              Visit Notes
            </div>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 99,
                border: "none",
                background: isRecording
                  ? `linear-gradient(90deg, ${COLORS.red}, #cc1a20)`
                  : `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
                color: isRecording ? "#fff" : COLORS.darkNavy,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isRecording ? (
                <>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 16 }}>
                    {[0, 1, 2, 3].map((b) => (
                      <div
                        key={b}
                        className="wave-bar"
                        style={{
                          width: 3,
                          height: 12,
                          background: "#fff",
                          borderRadius: 2,
                          animationDelay: `${b * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  {formatTime(recordingTime)}
                </>
              ) : (
                <>🎤 Dictate</>
              )}
            </button>
          </div>

          <textarea
            value={notes + interim}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tap Dictate or type visit notes here..."
            style={{
              width: "100%",
              minHeight: 80,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 12px",
              color: "#fff",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              resize: "none",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {["Mood", "Appetite", "Mobility"].map((chip) => (
              <button
                key={chip}
                onClick={() => insertChip(chip)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1px solid rgba(79,209,197,0.3)`,
                  background: "rgba(79,209,197,0.08)",
                  color: COLORS.teal,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        {signatureDone ? (
          <button onClick={onMeds} style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
            End Visit & Confirm Meds →
          </button>
        ) : (
          <button onClick={() => setShowSignature(true)} style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
            ✍ Sign & End Visit →
          </button>
        )}
      </div>

      {/* Signature modal */}
      {showSignature && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,29,52,0.97)", zIndex: 80, display: "flex", flexDirection: "column", padding: "24px 18px" }}>
          <div style={{ color: "#fff", fontFamily: "DM Serif Display, serif", fontSize: 22, marginBottom: 6 }}>Carer Signature</div>
          <div style={{ color: COLORS.g2, fontSize: 13, marginBottom: 20 }}>Sign to confirm this visit record. This signature is stored in the CQC audit trail.</div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 4, border: "1px solid rgba(255,255,255,0.15)", marginBottom: 14 }}>
            <canvas ref={sigCanvasRef} width={320} height={160} style={{ display: "block", borderRadius: 10, cursor: "crosshair", touchAction: "none" }}
              onMouseDown={sigStart} onMouseMove={sigMove} onMouseUp={sigEnd} onMouseLeave={sigEnd}
              onTouchStart={sigStart} onTouchMove={sigMove} onTouchEnd={sigEnd}
            />
          </div>
          <div style={{ color: COLORS.g3, fontSize: 11, textAlign: "center", marginBottom: 16 }}>Draw your signature above</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={clearSig} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: COLORS.g2, fontFamily: "DM Sans, sans-serif", fontSize: 14, cursor: "pointer" }}>Clear</button>
            <button onClick={() => { setSignatureDone(true); setShowSignature(false); }} style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Confirm Signature ✓</button>
          </div>
          <button onClick={() => setShowSignature(false)} style={{ marginTop: 12, background: "none", border: "none", color: COLORS.g3, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
        </div>
      )}

      {/* Privacy overlay */}
      {isPrivate && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,29,52,0.97)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 50,
          }}
        >
          <div style={{ fontSize: 48 }}>👁</div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
            Screen Hidden
          </div>
          <div style={{ color: COLORS.g2, fontSize: 13, textAlign: "center" }}>
            Privacy mode is active
          </div>
          <button
            onClick={() => setIsPrivate(false)}
            style={{
              padding: "12px 28px",
              borderRadius: 12,
              border: `1px solid rgba(79,209,197,0.4)`,
              background: "rgba(79,209,197,0.1)",
              color: COLORS.teal,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            Tap to Reveal
          </button>
        </div>
      )}

      {/* Incident modal */}
      {showIncident && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 60,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowIncident(false); setIncidentSubmitted(false); } }}
        >
          <div
            className="fade-in"
            style={{
              width: "100%",
              background: COLORS.navy,
              borderRadius: "20px 20px 0 0",
              padding: 24,
            }}
          >
            {incidentSubmitted ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginTop: 12 }}>
                  Incident Reported
                </div>
                <div style={{ color: COLORS.teal, fontSize: 14, marginTop: 6 }}>
                  Ref: INC-2026-0312
                </div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 4 }}>
                  Supervisor has been notified
                </div>
                <button
                  onClick={() => { setShowIncident(false); setIncidentSubmitted(false); setIncidentType(""); }}
                  style={{
                    marginTop: 20,
                    padding: "12px 32px",
                    borderRadius: 12,
                    border: "none",
                    background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
                    color: COLORS.darkNavy,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
                  Report Incident
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {["Fall", "Medication Error", "Skin Change", "Other"].map((t) => (
                    <div
                      key={t}
                      onClick={() => setIncidentType(t)}
                      style={{
                        padding: "14px 10px",
                        borderRadius: 12,
                        border: `2px solid ${incidentType === t ? COLORS.amber : "rgba(255,255,255,0.1)"}`,
                        background: incidentType === t ? "rgba(246,183,60,0.15)" : "rgba(255,255,255,0.05)",
                        color: incidentType === t ? COLORS.amber : COLORS.g1,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: incidentType === t ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: COLORS.g1, fontSize: 13, marginBottom: 8 }}>Severity</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["Low", "Medium", "High"] as const).map((s) => {
                      const severityColor =
                        s === "Low" ? COLORS.green
                        : s === "Medium" ? COLORS.amber
                        : COLORS.red;
                      const severityBg =
                        s === "Low" ? "rgba(34,197,94,0.2)"
                        : s === "Medium" ? "rgba(246,183,60,0.2)"
                        : "rgba(255,90,95,0.2)";
                      return (
                        <button
                          key={s}
                          onClick={() => setSeverity(s)}
                          style={{
                            flex: 1,
                            padding: "8px 0",
                            borderRadius: 8,
                            border: `1px solid ${severity === s ? severityColor : "rgba(255,255,255,0.15)"}`,
                            background: severity === s ? severityBg : "transparent",
                            color: severity === s ? severityColor : COLORS.g2,
                            fontWeight: severity === s ? 700 : 400,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => incidentType && setIncidentSubmitted(true)}
                  disabled={!incidentType}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 12,
                    border: "none",
                    background: incidentType
                      ? `linear-gradient(90deg, ${COLORS.amber}, #e09800)`
                      : "rgba(255,255,255,0.1)",
                    color: incidentType ? COLORS.darkNavy : COLORS.g3,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: incidentType ? "pointer" : "not-allowed",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Submit Report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CopilotScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hello! I'm your AI care assistant for Grace Mensah's visit today. I have full access to her care record including her conditions (Hypertension, T2 Diabetes, Mild Cognitive Impairment), current medications, and allergy information.\n\nHow can I help you?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    // Check offline fallback
    const offlineKey = Object.keys(OFFLINE_RESPONSES).find(
      (k) => text.toLowerCase().includes(k.toLowerCase()),
    );

    try {
      const response = await fetch("/api/anthropic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          systemContext: `You are an AI care assistant embedded in the CAREi domiciliary care app. You have access to Grace Mensah's full care record:
- Name: Grace Mensah, Age: 83
- Address: 10 Oak Avenue, Reading RG1 4AT
- Conditions: Hypertension, T2 Diabetes, Mild Cognitive Impairment
- ALLERGY: Penicillin (CRITICAL)
- GP: Dr Sandra Obi
- Medications: Amlodipine 5mg (10AM oral), Metformin 500mg (10AM oral), Atorvastatin 20mg (10AM oral)
- Carer: Sarah Johnson, Adjoy Healthcare

Provide concise, clinically relevant, professional responses. Always highlight allergy risks. Keep responses brief and actionable for a busy carer.`,
        }),
      });

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      setMessages((m) => [...m, { role: "assistant", content: data.content }]);
    } catch {
      const fallback =
        offlineKey
          ? OFFLINE_RESPONSES[offlineKey]
          : "I'm currently in offline mode. For medication queries, always check with the prescribing GP or your supervisor.";
      setMessages((m) => [...m, { role: "assistant", content: fallback }]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div
      style={{
        height: "100%",
        background: COLORS.darkNavy,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `rgba(15,29,52,0.98)`,
          padding: "16px 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0 }}
        >
          ‹
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ✦
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>AI Copilot</div>
          <div style={{ color: COLORS.teal, fontSize: 11 }}>Grace Mensah's care context</div>
        </div>
      </div>

      {/* Messages */}
      <div className="phone-scroll" style={{ flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className="fade-in"
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                background:
                  m.role === "user"
                    ? `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`
                    : "rgba(255,255,255,0.08)",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
                color: m.role === "user" ? COLORS.darkNavy : COLORS.g0,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 0" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "16px 16px 16px 4px",
                padding: "10px 14px",
                display: "flex",
                gap: 4,
              }}
            >
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  className={`dot-${d + 1}`}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: COLORS.teal,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div
        style={{
          padding: "8px 14px 4px",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            style={{
              whiteSpace: "nowrap",
              padding: "6px 12px",
              borderRadius: 99,
              border: `1px solid rgba(79,209,197,0.3)`,
              background: "rgba(79,209,197,0.08)",
              color: COLORS.teal,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "8px 14px 16px",
          display: "flex",
          gap: 8,
          background: "rgba(15,29,52,0.95)",
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about Grace's care..."
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.07)",
            color: "#fff",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
            color: COLORS.darkNavy,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

function MedicationScreen({ onNext }: { onNext: () => void }) {
  const [medStatus, setMedStatus] = useState<Record<string, string>>({});
  const [monitoringElapsed, setMonitoringElapsed] = useState(0);
  const [monitoringConfirmed, setMonitoringConfirmed] = useState(false);
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [earlyExitReason, setEarlyExitReason] = useState("");
  const monitorWindowMins = 30;
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allActioned = CLIENT.meds.every((m) => medStatus[m.name]);

  useEffect(() => {
    if (allActioned && !monitoringConfirmed) {
      monitorRef.current = setInterval(() => setMonitoringElapsed((e) => e + 1), 1000);
    }
    return () => { if (monitorRef.current) clearInterval(monitorRef.current); };
  }, [allActioned, monitoringConfirmed]);

  const monitorPct = Math.min(100, Math.round((monitoringElapsed / (monitorWindowMins * 60)) * 100));
  const monitorMins = Math.floor(monitoringElapsed / 60);
  const monitorSecs = monitoringElapsed % 60;
  const monitorDone = monitoringElapsed >= monitorWindowMins * 60;

  return (
    <div
      style={{
        height: "100%",
        background: COLORS.darkNavy,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff" }}>
          Medication Confirmation
        </div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>
          Grace Mensah · {new Date().toLocaleDateString("en-GB")}
        </div>
      </div>

      {/* Allergy banner */}
      <div
        style={{
          margin: "0 14px 12px",
          background: "rgba(255,90,95,0.15)",
          border: `1px solid rgba(255,90,95,0.4)`,
          borderRadius: 12,
          padding: "10px 14px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <div style={{ color: COLORS.red, fontWeight: 700, fontSize: 13 }}>
            ALLERGY: Penicillin
          </div>
          <div style={{ color: "rgba(255,90,95,0.8)", fontSize: 11 }}>
            Do not administer any penicillin-based antibiotics
          </div>
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {CLIENT.meds.map((med) => (
          <div
            key={med.name}
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: "16px",
              border: medStatus[med.name]
                ? `1px solid ${medStatus[med.name] === "confirmed" ? COLORS.green : COLORS.amber}`
                : "1px solid transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  {med.name} {med.dose}
                </div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>
                  {med.time} · {med.route}
                </div>
              </div>
              {medStatus[med.name] && (
                <Badge
                  color={medStatus[med.name] === "confirmed" ? COLORS.green : COLORS.amber}
                  bg={
                    medStatus[med.name] === "confirmed"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(246,183,60,0.15)"
                  }
                >
                  {medStatus[med.name] === "confirmed" ? "✓ Given" : "⚠ Flagged"}
                </Badge>
              )}
            </div>
            {med.adminNote && (
              <div style={{ background: med.name === "Metformin" ? "rgba(246,183,60,0.12)" : "rgba(79,209,197,0.08)", border: `1px solid ${med.name === "Metformin" ? "rgba(246,183,60,0.3)" : "rgba(79,209,197,0.15)"}`, borderRadius: 8, padding: "7px 10px", marginBottom: 10, display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
                <span style={{ color: med.name === "Metformin" ? COLORS.amber : COLORS.teal, fontSize: 12, lineHeight: 1.4, fontWeight: med.name === "Metformin" ? 700 : 400 }}>{med.adminNote}</span>
              </div>
            )}
            {!medStatus[med.name] && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setMedStatus((s) => ({ ...s, [med.name]: "confirmed" }))}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `1px solid rgba(34,197,94,0.4)`,
                    background: "rgba(34,197,94,0.1)",
                    color: COLORS.green,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={() => setMedStatus((s) => ({ ...s, [med.name]: "flagged" }))}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `1px solid rgba(246,183,60,0.4)`,
                    background: "rgba(246,183,60,0.1)",
                    color: COLORS.amber,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  ⚠ Flag
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Feature 2, Medication Monitoring Timer */}
        {allActioned && !monitoringConfirmed && (
          <div style={{ background: "rgba(79,209,197,0.08)", border: "1px solid rgba(79,209,197,0.25)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>⏱️</span>
              <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 14 }}>Post-Medication Monitoring</div>
              <div style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: monitorDone ? COLORS.green : "#fff" }}>
                {String(monitorMins).padStart(2, "0")}:{String(monitorSecs).padStart(2, "0")}
              </div>
            </div>
            <div style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
              Observe the client for {monitorWindowMins} minutes. Check for dizziness (Amlodipine), nausea (Metformin) or muscle pain (Atorvastatin). Do not leave until the window is complete.
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6, marginBottom: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${monitorPct}%`, background: monitorDone ? COLORS.green : COLORS.teal, borderRadius: 99, transition: "width 1s linear" }} />
            </div>
            <div style={{ color: COLORS.g3, fontSize: 11, marginBottom: 12 }}>
              {monitorDone ? "✓ Monitoring window complete, confirm below" : `${monitorWindowMins - monitorMins} min ${60 - monitorSecs}s remaining · ${monitorPct}% complete`}
            </div>
            <button
              onClick={() => { setMonitoringConfirmed(true); if (monitorRef.current) clearInterval(monitorRef.current); }}
              style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: monitorDone ? `linear-gradient(90deg, ${COLORS.green}, #16a34a)` : "rgba(255,255,255,0.1)", color: monitorDone ? "#fff" : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {monitorDone ? "✓ I confirm I observed the client for 30 minutes" : "Confirm early (not recommended)"}
            </button>
          </div>
        )}

        {allActioned && monitoringConfirmed && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: "11px 14px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13 }}>Monitoring confirmed, {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        )}

        <button
          onClick={() => {
            if (!allActioned) return;
            if (!monitoringConfirmed && monitoringElapsed < monitorWindowMins * 60) {
              setShowEarlyExitModal(true);
            } else {
              onNext();
            }
          }}
          disabled={!allActioned}
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 14,
            border: "none",
            background: allActioned
              ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`
              : "rgba(255,255,255,0.1)",
            color: allActioned ? COLORS.darkNavy : COLORS.g3,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: allActioned ? "pointer" : "not-allowed",
            marginTop: 8,
          }}
        >
          {!allActioned ? `Action all medications (${Object.keys(medStatus).length}/${CLIENT.meds.length})` : "Continue to Summary →"}
        </button>
      </div>

      {/* Early Exit Soft-Gate Modal */}
      {showEarlyExitModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 60 }}>
          <div style={{ background: COLORS.navy, borderRadius: "20px 20px 0 0", padding: 20 }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff", marginBottom: 4 }}>Monitoring window still open</div>
            <div style={{ color: COLORS.amber, fontSize: 13, marginBottom: 6 }}>
              {monitorWindowMins - Math.floor(monitoringElapsed / 60)} min {60 - (monitoringElapsed % 60)}s remaining, early exit will be logged
            </div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
              You can proceed early if there is a clinical or operational reason. Select a reason to continue:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {["Next client appointment due", "Client is settled and a responsible adult is present", "Supervisor has been informed and agreed", "No concerns observed, low-risk situation"].map((r) => (
                <button key={r} onClick={() => setEarlyExitReason(r)} style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${earlyExitReason === r ? COLORS.amber : "rgba(255,255,255,0.1)"}`, background: earlyExitReason === r ? "rgba(246,183,60,0.15)" : "transparent", color: earlyExitReason === r ? COLORS.amber : COLORS.g2, textAlign: "left", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: earlyExitReason === r ? 600 : 400 }}>{r}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowEarlyExitModal(false); setEarlyExitReason(""); }} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g1, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Wait, stay with client</button>
              <button
                onClick={() => { if (earlyExitReason) { setMonitoringConfirmed(true); setShowEarlyExitModal(false); onNext(); } }}
                style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: earlyExitReason ? COLORS.amber : "rgba(255,255,255,0.08)", color: earlyExitReason ? COLORS.darkNavy : COLORS.g3, fontSize: 13, fontWeight: 700, cursor: earlyExitReason ? "pointer" : "not-allowed", fontFamily: "DM Sans, sans-serif" }}>
                {earlyExitReason ? "Proceed, log reason" : "Select a reason first"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryScreen({ onDone, carerName }: { onDone: () => void; carerName: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [readReceipt, setReadReceipt] = useState(false);

  const fallbackSummary = `${CLIENT.name} was in good spirits and engaged positively throughout the visit. Personal care completed fully. Medications administered as prescribed with no issues noted.

• Mood: Calm and responsive, recognised carer
• Appetite: Good, ate well at mealtime
• Mobility: Mobilising with assistance, steady and safe
• Skin: No new pressure areas or concerns observed

Next visit: Continue monitoring as per care plan. Follow any medication timing instructions carefully.`;

  useEffect(() => {
    async function generateSummary() {
      try {
        const response = await fetch("/api/anthropic/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: CLIENT,
            visitDate: new Date().toLocaleDateString("en-GB"),
          }),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setSummary(data.summary);
      } catch {
        setSummary(fallbackSummary);
      } finally {
        setLoading(false);
      }
    }
    generateSummary();
  }, []);

  if (submitted && !readReceipt) {
    const now = new Date();
    const ts = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return (
      <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", padding: "28px 20px" }}>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff", marginBottom: 6 }}>Handover Read Receipt</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginBottom: 24 }}>The next carer must confirm they have read this handover before starting the visit.</div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Badge color={COLORS.teal} bg="rgba(79,209,197,0.12)">ContinuCare+</Badge>
            <span style={{ color: COLORS.g3, fontSize: 12 }}>{new Date().toLocaleDateString("en-GB")} · {ts}</span>
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Grace Mensah, Handover Note</div>
          <div style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.6, maxHeight: 140, overflowY: "auto" }}>{summary}</div>
        </div>
        <div style={{ background: "rgba(79,209,197,0.08)", borderRadius: 14, padding: 16, border: "1px solid rgba(79,209,197,0.2)", marginBottom: 24 }}>
          <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Submitted by</div>
          <div style={{ color: COLORS.g1, fontSize: 13 }}>{carerName} · Adjoy Healthcare</div>
          <div style={{ color: COLORS.g3, fontSize: 11, marginTop: 2 }}>Visit ended · {ts}</div>
        </div>
        <div style={{ color: COLORS.g2, fontSize: 13, textAlign: "center", marginBottom: 16 }}>Next carer, tap below to confirm you have read this note</div>
        <button onClick={() => setReadReceipt(true)} style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          ✓ I've Read This Handover
        </button>
      </div>
    );
  }

  if (submitted && readReceipt) {
    return (
      <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 32 }}>
        <div className="fade-in" style={{ textAlign: "center" }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill={COLORS.teal} />
            <polyline points="20,37 30,47 52,24" fill="none" stroke={COLORS.darkNavy} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 22, marginTop: 16 }}>Handover Complete</div>
          <div style={{ color: COLORS.teal, fontSize: 14, marginTop: 6 }}>Chain of custody recorded ✓</div>
          <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Handover submitted by {carerName}<br />Read receipt confirmed by next carer
          </div>
          <div style={{ marginTop: 12, background: "rgba(34,197,94,0.12)", borderRadius: 10, padding: "8px 16px", display: "inline-block" }}>
            <span style={{ color: COLORS.green, fontWeight: 700, fontSize: 12 }}>CQC AUDIT TRAIL, COMPLETE</span>
          </div>
          <button onClick={onDone} style={{ marginTop: 24, padding: "14px 32px", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        background: COLORS.darkNavy,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <Badge color={COLORS.teal} bg="rgba(79,209,197,0.15)">
          ContinuCare+
        </Badge>
        <div
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: 24,
            color: "#fff",
            marginTop: 8,
          }}
        >
          Visit Summary
        </div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>
          AI-generated handover note · Grace Mensah
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 20px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: 18,
            minHeight: 200,
          }}
        >
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ color: COLORS.teal, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className={`dot-${d + 1}`}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.teal }}
                    />
                  ))}
                </div>
                Generating AI summary...
              </div>
              {[85, 70, 90, 60].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 12,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.08)",
                    width: `${w}%`,
                  }}
                />
              ))}
            </div>
          ) : (
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ color: COLORS.g0, fontSize: 13, lineHeight: 1.7, background: "transparent", border: "none", outline: "none", width: "100%", minHeight: 200, resize: "vertical", fontFamily: "DM Sans, sans-serif" }}
            />
          )}
        </div>

        {!loading && (
          <button
            onClick={() => setSubmitted(true)}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
              color: COLORS.darkNavy,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 16,
            }}
          >
            Submit Handover →
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ onSignOut, carerName, carerEmail }: { onSignOut: () => void; carerName: string; carerEmail: string }) {
  return (
    <div
      style={{
        height: "100%",
        background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`,
        display: "flex",
        flexDirection: "column",
        padding: "32px 20px",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.darkNavy,
            fontWeight: 700,
            fontSize: 28,
          }}
        >
          {getInitials(carerName)}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{carerName}</div>
          <div style={{ color: COLORS.g2, fontSize: 14, marginTop: 2 }}>Adjoy Healthcare</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Badge color={COLORS.green} bg="rgba(34,197,94,0.15)">DBS Checked</Badge>
          <Badge color={COLORS.teal} bg="rgba(79,209,197,0.15)">GPS Enabled</Badge>
          <Badge color={COLORS.amber} bg="rgba(246,183,60,0.15)">AI Enabled</Badge>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {[
          { icon: "📧", label: "Email", value: carerEmail || "Not set" },
          { icon: "🏢", label: "Organisation", value: "Adjoy Healthcare" },
          { icon: "📋", label: "Role", value: "Senior Care Worker" },
          { icon: "📍", label: "Region", value: "Reading, Berkshire" },
        ].map((item, i, arr) => (
          <div
            key={item.label}
            style={{
              padding: "14px 16px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <div>
              <div style={{ color: COLORS.g2, fontSize: 11, marginBottom: 2 }}>{item.label}</div>
              <div style={{ color: COLORS.g0, fontSize: 13 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: COLORS.g1,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Settings
        </button>
        <button
          onClick={onSignOut}
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: 12,
            border: `1px solid rgba(255,90,95,0.3)`,
            background: "rgba(255,90,95,0.1)",
            color: COLORS.red,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function SOSOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState<"confirm" | "active">("confirm");

  if (step === "active") {
    return (
      <div
        className="sos-flash"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 48 }}>🆘</div>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 28, textAlign: "center" }}>
          SOS ACTIVE
        </div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center" }}>
          Alert sent to supervisor
        </div>
        <div
          style={{
            background: "rgba(0,0,0,0.25)",
            borderRadius: 12,
            padding: "12px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4 }}>
            GPS Location
          </div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
            51.4545° N, -0.9781° W
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 4 }}>
            10 Oak Avenue, Reading
          </div>
        </div>
        <div
          style={{
            background: "rgba(0,0,0,0.25)",
            borderRadius: 12,
            padding: "10px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Supervisor</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Jenny Davies</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>07700 900123</div>
        </div>
        <button
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 12,
            border: "none",
            background: "#fff",
            color: COLORS.red,
            fontWeight: 900,
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          📞 Call 999
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.7)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            padding: "10px 24px",
            cursor: "pointer",
          }}
        >
          Dismiss Alert
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="fade-in"
        style={{
          background: COLORS.navy,
          borderRadius: 20,
          padding: 28,
          textAlign: "center",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🆘</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
          Send SOS Alert?
        </div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          This will immediately alert your supervisor and share your GPS location.
        </div>
        <button
          onClick={() => setStep("active")}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            border: "none",
            background: COLORS.red,
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 10,
          }}
        >
          Yes, Send SOS
        </button>
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: COLORS.g1,
            fontWeight: 500,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Family Portal Screen ─────────────────────────────────────────────────────

function FamilySummaryScreen({ onBack, approvalStatus, onRead, carerName, carerAgency, client }: { onBack: () => void; approvalStatus: "pending" | "approved"; onRead: () => void; carerName: string; carerAgency: string; client: typeof SCHEDULE_CLIENTS[0] }) {
  const [messageSent, setMessageSent] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (approvalStatus === "approved") onRead();
  }, [approvalStatus]);

  if (approvalStatus === "pending") {
    return (
      <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
        <button onClick={onBack} style={{ position: "absolute", top: 18, left: 18, background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(246,183,60,0.15)", border: "2px solid rgba(246,183,60,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>⏳</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Summary Pending Review</div>
          <div style={{ color: COLORS.g2, fontSize: 13, lineHeight: 1.6 }}>Today's visit summary is being reviewed by the care manager before being made available to you. You'll receive a notification once it's ready.</div>
        </div>
        <div style={{ background: "rgba(246,183,60,0.08)", border: "1px solid rgba(246,183,60,0.25)", borderRadius: 14, padding: "14px 18px", width: "100%", textAlign: "center" }}>
          <div style={{ color: COLORS.amber, fontWeight: 600, fontSize: 13 }}>Visit completed at 10:05</div>
          <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 4 }}>{carerName} · 9 April 2026</div>
        </div>
        <div style={{ textAlign: "center" }}>
          {carerAgency && <div style={{ color: COLORS.g2, fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Managed by {carerAgency}</div>}
          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12 }}>🔒</span>
            <span style={{ color: COLORS.g3, fontSize: 10 }}>GDPR Ready · Built for UK care compliance · Powered by CAREi</span>
          </div>
        </div>
      </div>
    );
  }

  const tasks = [
    { icon: "🛁", label: "Personal care", detail: "Washing, dressing, oral hygiene", done: true },
    { icon: "💊", label: "Morning medications given", detail: "Aspirin 75mg · Donepezil 10mg", done: true },
    { icon: "🍵", label: "Breakfast", detail: "Porridge with honey and a cup of tea, good appetite", done: true },
    { icon: "🚶", label: "Mobility support", detail: "Short walk to the living room with frame, no difficulty", done: true },
    { icon: "🩺", label: "Health check", detail: "Blood pressure 138/84 mmHg, within normal range", done: true },
    { icon: "🧩", label: "Activity", detail: "Enjoyed a short puzzle, 15 minutes, engaged well", done: true },
  ];

  const meds = client.meds.map((m, i) => ({ name: m.name, dose: m.dose, time: `09:${14 + i * 2}`, status: "given" }));

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        {/* Visit complete banner */}
        <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✓</div>
          <div>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 15 }}>Today's visit is complete</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>9 April 2026 · 09:00 – 10:05</div>
          </div>
        </div>
        {/* Carer & client */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>{client.name.split(" ")[0]}'s Day Summary</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>Carer: {carerName} · 1hr 5min visit</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 14 }}>{getInitials(client.name)}</div>
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "12px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* What happened */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>What happened today</div>
          </div>
          <div style={{ padding: "4px 0" }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "10px 14px", alignItems: "flex-start", borderBottom: i < tasks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                  <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>{t.detail}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: COLORS.green, fontSize: 10, fontWeight: 900 }}>✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Medications</div>
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>All medications given as prescribed</div>
          </div>
          {meds.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: i < meds.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{m.name} <span style={{ color: COLORS.g2, fontWeight: 400 }}>{m.dose}</span></div>
                <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 1 }}>Given at {m.time}</div>
              </div>
              <Badge color={COLORS.green} bg="rgba(34,197,94,0.12)">✓ Given</Badge>
            </div>
          ))}
        </div>

        {/* Carer's note */}
        <div style={{ background: "rgba(79,209,197,0.07)", border: "1px solid rgba(79,209,197,0.2)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{getInitials(carerName)}</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{carerName.split(" ")[0]}'s note</div>
              <div style={{ color: COLORS.g2, fontSize: 11 }}>Written at 10:07</div>
            </div>
          </div>
          <div style={{ color: COLORS.g0, fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>
            {`"${client.name.split(" ")[0]} was in really good spirits this morning. ${client.name.split(" ")[0]} had a healthy appetite and finished all of breakfast. Engaged well during the visit and all tasks completed as planned. A good visit overall."`}
          </div>
        </div>

        {/* Concerns */}
        <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🟢</span>
          <div>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13 }}>No concerns raised</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>Sarah reported nothing out of the ordinary today</div>
          </div>
        </div>

        {/* Next visit */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>NEXT VISIT</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Tomorrow morning</div>
              <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>09:00 – 10:00 · Carer TBC</div>
            </div>
            <Badge color={COLORS.amber} bg="rgba(246,183,60,0.12)">Scheduled</Badge>
          </div>
        </div>

        {/* CQC note */}
        {/* Agency attribution */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px", textAlign: "center", border: `1px solid rgba(79,209,197,0.12)` }}>
          {carerAgency ? (
            <>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Managed by {carerAgency}</div>
              <div style={{ color: COLORS.teal, fontSize: 11, marginTop: 4, letterSpacing: 0.3 }}>Powered by CAREi</div>
            </>
          ) : (
            <div style={{ color: COLORS.teal, fontSize: 11, letterSpacing: 0.3 }}>Powered by CAREi</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span style={{ color: COLORS.g3, fontSize: 11 }}>This summary is securely stored in compliance with CQC and GDPR requirements</span>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 18px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10 }}>
        <button onClick={() => setShowMessage(true)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.1)", color: COLORS.teal, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          💬 Message Agency
        </button>
        <button style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          📄 Download PDF
        </button>
      </div>

      {/* Message modal */}
      {showMessage && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 50 }}>
          <div style={{ background: COLORS.navy, borderRadius: "20px 20px 0 0", padding: 20, animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff", marginBottom: 14 }}>Message {carerAgency || "Agency"}</div>
            {messageSent ? (
              <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 14 }}>Message sent</div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 4 }}>The team will respond within 2 hours</div>
                <button onClick={() => { setShowMessage(false); setMessageSent(false); setMessageText(""); }} style={{ marginTop: 14, padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.1)", color: COLORS.g1, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Close</button>
              </div>
            ) : (
              <>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Write your message to ${carerAgency ? `the ${carerAgency} care team` : "the care team"}…`}
                  rows={4}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 13, fontFamily: "DM Sans, sans-serif", resize: "none", boxSizing: "border-box", outline: "none" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button onClick={() => setShowMessage(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
                  <button onClick={() => { if (messageText.trim()) setMessageSent(true); }} style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", background: messageText.trim() ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.1)", color: messageText.trim() ? COLORS.darkNavy : COLORS.g3, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Send Message</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FamilyPortalScreen({ onBack, onSummary, carerName, client }: { onBack: () => void; onSummary: () => void; carerName: string; client: typeof SCHEDULE_CLIENTS[0] }) {
  const firstName = client.name.split(" ")[0];
  const medNames = client.meds.map(m => `${m.name} ${m.dose}`).join(", ");
  const events = [
    { time: "10:02", icon: "🚗", text: `${carerName.split(" ")[0]} arrived at ${firstName}'s home`, done: true },
    { time: "10:05", icon: "🛁", text: "Personal care commenced", done: true },
    { time: "10:35", icon: "🍵", text: "Breakfast prepared, good intake", done: true },
    { time: "10:47", icon: "💊", text: `Medications administered: ${medNames}`, done: true },
    { time: "10:52", icon: "🩺", text: "Health check completed", done: true },
    { time: "11:05", icon: "🧩", text: "Activity & social engagement", done: true },
    { time: "~11:30", icon: "🏁", text: "Visit completion & handover note", done: false },
  ];
  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 14px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Family Portal</div>
          <Badge color={COLORS.green} bg="rgba(34,197,94,0.12)">Live</Badge>
        </div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>{client.name} · Today's Visit</div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "0 18px 100px" }}>
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2 }} />
          {events.map((ev, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 20 }}>
              <div style={{ position: "absolute", left: -24, top: 2, width: 14, height: 14, borderRadius: "50%", background: ev.done ? COLORS.teal : "rgba(255,255,255,0.15)", border: `2px solid ${ev.done ? COLORS.teal : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ev.done && <div style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.darkNavy }} />}
              </div>
              <div style={{ background: ev.done ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px", border: ev.done ? "none" : "1px dashed rgba(255,255,255,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{ev.icon}</span>
                  <span style={{ color: ev.done ? COLORS.teal : COLORS.amber, fontSize: 11, fontWeight: 700 }}>{ev.time}</span>
                  {!ev.done && <Badge color={COLORS.amber} bg="rgba(246,183,60,0.12)">Pending</Badge>}
                </div>
                <div style={{ color: ev.done ? COLORS.g0 : COLORS.g3, fontSize: 13 }}>{ev.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 18px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onSummary} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          📋 View Today's Full Summary
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.1)", color: COLORS.teal, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            💬 Message Agency
          </button>
          <button style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📞 Call Adjoy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Body Map Screen ──────────────────────────────────────────────────────────

type BodyMark = { zone: string; type: string; color: string };

function BodyMapScreen({ clientName, onBack }: { clientName: string; onBack: () => void }) {
  const [view, setView] = useState<"front" | "back">("front");
  const [markType, setMarkType] = useState("Pressure Sore");
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [saved, setSaved] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  }

  const markTypes = [
    { label: "Pressure Sore", color: COLORS.red },
    { label: "Bruising", color: "#8B5CF6" },
    { label: "Mark", color: COLORS.amber },
    { label: "Redness", color: "#F97316" },
  ];

  const zones: { id: string; label: string; x: number; y: number; w: number; h: number; rx?: number }[] = view === "front"
    ? [
        { id: "head", label: "Head", x: 75, y: 5, w: 50, h: 50, rx: 25 },
        { id: "neck", label: "Neck", x: 90, y: 55, w: 20, h: 18 },
        { id: "l-shoulder", label: "L Shoulder", x: 42, y: 72, w: 38, h: 30 },
        { id: "r-shoulder", label: "R Shoulder", x: 120, y: 72, w: 38, h: 30 },
        { id: "chest", label: "Chest", x: 64, y: 72, w: 72, h: 55 },
        { id: "abdomen", label: "Abdomen", x: 64, y: 127, w: 72, h: 45 },
        { id: "l-arm", label: "L Arm", x: 28, y: 102, w: 22, h: 80 },
        { id: "r-arm", label: "R Arm", x: 150, y: 102, w: 22, h: 80 },
        { id: "l-thigh", label: "L Thigh", x: 64, y: 172, w: 34, h: 65 },
        { id: "r-thigh", label: "R Thigh", x: 102, y: 172, w: 34, h: 65 },
        { id: "l-shin", label: "L Shin", x: 64, y: 237, w: 32, h: 60 },
        { id: "r-shin", label: "R Shin", x: 104, y: 237, w: 32, h: 60 },
        { id: "l-foot", label: "L Foot", x: 58, y: 297, w: 36, h: 18 },
        { id: "r-foot", label: "R Foot", x: 106, y: 297, w: 36, h: 18 },
      ]
    : [
        { id: "head-b", label: "Head (Back)", x: 75, y: 5, w: 50, h: 50, rx: 25 },
        { id: "neck-b", label: "Neck (Back)", x: 90, y: 55, w: 20, h: 18 },
        { id: "upper-back", label: "Upper Back", x: 64, y: 72, w: 72, h: 45 },
        { id: "lower-back", label: "Lower Back", x: 64, y: 117, w: 72, h: 40 },
        { id: "sacrum", label: "Sacrum", x: 80, y: 157, w: 40, h: 20 },
        { id: "l-buttock", label: "L Buttock", x: 64, y: 172, w: 34, h: 35 },
        { id: "r-buttock", label: "R Buttock", x: 102, y: 172, w: 34, h: 35 },
        { id: "l-thigh-b", label: "L Thigh (Back)", x: 64, y: 207, w: 34, h: 55 },
        { id: "r-thigh-b", label: "R Thigh (Back)", x: 102, y: 207, w: 34, h: 55 },
        { id: "l-calf", label: "L Calf", x: 64, y: 262, w: 32, h: 50 },
        { id: "r-calf", label: "R Calf", x: 104, y: 262, w: 32, h: 50 },
        { id: "l-heel", label: "L Heel", x: 64, y: 312, w: 30, h: 16 },
        { id: "r-heel", label: "R Heel", x: 106, y: 312, w: 30, h: 16 },
      ];

  function addMark(zone: string) {
    const type = markTypes.find(m => m.label === markType)!;
    setMarks(prev => [...prev, { zone, type: markType, color: type.color }]);
  }

  const marksForZone = (id: string) => marks.filter(m => m.zone === id);
  const markColor = markTypes.find(m => m.label === markType)?.color ?? COLORS.red;

  if (saved) return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>Body Map Saved</div>
      <div style={{ color: COLORS.g2, fontSize: 13, textAlign: "center" }}>{marks.length} mark{marks.length !== 1 ? "s" : ""} recorded and added to CQC audit trail</div>
      <button onClick={onBack} style={{ padding: "14px 32px", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Back to Visit</button>
    </div>
  );

  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 10px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 10 }}>‹</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 20, color: "#fff" }}>Skin Integrity Map</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>Tap a body zone to mark it · {clientName}</div>
          </div>
          <Badge color={COLORS.red} bg="rgba(255,90,95,0.12)">CQC</Badge>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {(["front", "back"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "5px 14px", borderRadius: 99, border: `1px solid ${view === v ? COLORS.teal : "rgba(255,255,255,0.1)"}`, background: view === v ? "rgba(79,209,197,0.12)" : "transparent", color: view === v ? COLORS.teal : COLORS.g2, fontSize: 12, fontWeight: view === v ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              {v === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {markTypes.map(m => (
            <button key={m.label} onClick={() => setMarkType(m.label)} style={{ padding: "4px 10px", borderRadius: 99, border: `1px solid ${markType === m.label ? m.color : "rgba(255,255,255,0.1)"}`, background: markType === m.label ? `${m.color}20` : "transparent", color: markType === m.label ? m.color : COLORS.g3, fontSize: 11, fontWeight: markType === m.label ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 8px", gap: 8 }}>
        <svg viewBox="0 0 200 330" width={180} height={297} style={{ overflow: "visible" }}>
          {zones.map(z => {
            const zoneMarks = marksForZone(z.id);
            return (
              <g key={z.id} onClick={() => addMark(z.id)} style={{ cursor: "pointer" }}>
                {z.rx
                  ? <ellipse cx={z.x + z.w / 2} cy={z.y + z.h / 2} rx={z.w / 2} ry={z.h / 2} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                  : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={6} fill={zoneMarks.length > 0 ? `${zoneMarks[zoneMarks.length - 1].color}30` : "rgba(255,255,255,0.06)"} stroke={zoneMarks.length > 0 ? zoneMarks[zoneMarks.length - 1].color : "rgba(255,255,255,0.15)"} strokeWidth={zoneMarks.length > 0 ? 1.5 : 1} />
                }
                {zoneMarks.length > 0 && (
                  <circle cx={z.x + z.w - 6} cy={z.y + 6} r={6} fill={zoneMarks[zoneMarks.length - 1].color} />
                )}
              </g>
            );
          })}
        </svg>

        {marks.length > 0 && (
          <div style={{ width: "100%", padding: "0 18px" }}>
            <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>RECORDED MARKS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {marks.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 10px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                  <span style={{ color: COLORS.g1, fontSize: 12 }}>{m.type}</span>
                  <span style={{ color: COLORS.g3, fontSize: 11 }}>·</span>
                  <span style={{ color: COLORS.g3, fontSize: 11 }}>{m.zone.replace(/-/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 18px 24px", flexShrink: 0 }}>
        <div style={{ color: COLORS.g3, fontSize: 11, textAlign: "center", marginBottom: 10 }}>Tap any zone to mark it with: <span style={{ color: markColor, fontWeight: 700 }}>{markType}</span></div>

        {/* Feature 4, Photo Capture */}
        {marks.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
            {photoUrl ? (
              <div style={{ position: "relative", marginBottom: 10 }}>
                <img src={photoUrl} alt="Skin integrity" style={{ width: "100%", borderRadius: 10, maxHeight: 140, objectFit: "cover" }} />
                <div style={{ position: "absolute", top: 6, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 99, padding: "2px 8px" }}>
                  <span style={{ color: COLORS.green, fontSize: 11, fontWeight: 700 }}>📷 Photo attached</span>
                </div>
                <button onClick={() => { setPhotoUrl(null); if (photoInputRef.current) photoInputRef.current.value = ""; }} style={{ position: "absolute", top: 6, left: 8, background: "rgba(255,90,95,0.8)", border: "none", borderRadius: 99, padding: "2px 8px", color: "#fff", fontSize: 11, cursor: "pointer" }}>Remove</button>
              </div>
            ) : (
              <button onClick={() => photoInputRef.current?.click()} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", color: COLORS.g2, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                📷 Add Photo (CQC recommended)
              </button>
            )}
          </div>
        )}

        {saved ? (
          <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13 }}>Body Map Saved</div>
              <div style={{ color: COLORS.g3, fontSize: 11, marginTop: 2 }}>{marks.length} mark{marks.length !== 1 ? "s" : ""} recorded · {photoUrl ? "Photo attached" : "No photo"} · {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ) : (
          <button onClick={() => setSaved(true)} disabled={marks.length === 0} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: marks.length > 0 ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.1)", color: marks.length > 0 ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: marks.length > 0 ? "pointer" : "not-allowed" }}>
            Save Body Map ({marks.length} mark{marks.length !== 1 ? "s" : ""})
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Visit History Screen ─────────────────────────────────────────────────────

function VisitHistoryScreen({ clientName, onBack }: { clientName: string; onBack: () => void }) {
  const firstName = clientName.split(" ")[0];
  const history = [
    { date: "12 Mar 2026", time: "10:00–11:30", carer: "Sarah Johnson", tasks: "Personal care, Meds, Breakfast", note: `${firstName} in good spirits. No concerns.` },
    { date: "11 Mar 2026", time: "10:00–11:15", carer: "Amy Mitchell",  tasks: "Personal care, Meds",           note: "Client tired, ate half breakfast. BP 146/90." },
    { date: "10 Mar 2026", time: "10:15–11:45", carer: "Sarah Johnson", tasks: "Personal care, Meds, Physio",   note: "Physio exercises completed. Skin intact." },
    { date: "09 Mar 2026", time: "10:00–11:00", carer: "Kemi Adeyemi",  tasks: "Personal care, Meds",           note: "No concerns noted." },
    { date: "08 Mar 2026", time: "10:00–11:30", carer: "Sarah Johnson", tasks: "Personal care, Meds, Activity",  note: `${firstName} engaged well. Good mood.` },
  ];
  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Visit History</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>{clientName} · Last 30 days</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {history.map((v, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{v.date}</div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>{v.time} · {v.carer}</div>
              </div>
              <Badge color={COLORS.green} bg="rgba(34,197,94,0.12)">Complete</Badge>
            </div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginBottom: 6 }}>{v.tasks}</div>
            <div style={{ color: COLORS.g3, fontSize: 11, fontStyle: "italic" }}>"{v.note}"</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Care Plan Screen ─────────────────────────────────────────────────────────

function buildCarePlan(client: typeof SCHEDULE_CLIENTS[0]) {
  const n = client.name.split(" ")[0];
  const isHe = client.id === "tom";
  const pronoun = isHe ? "he" : "she";
  const possessive = isHe ? "his" : "her";

  const byCondition: Record<string, {
    objectives: string[];
    preventive: string[];
    risks: string[];
    postMed: string[];
    pbsCalmSigns: string[];
    pbsCalmActions: string[];
    pbsAnxiousSigns: string[];
    pbsAnxiousActions: string[];
    pbsRiskSigns: string[];
    pbsRiskActions: string[];
    lastReview: string[];
  }> = {
    mary: {
      objectives: [
        "Maintain personal hygiene and dignity at all times",
        "Support safe mobility with walking frame at all times",
        "Administer medications as prescribed",
        "Monitor nutrition and fluid intake, encourage 6–8 glasses of water daily",
        "Promote cognitive engagement, crosswords, music, familiar routines",
        "Monitor for signs of pain or discomfort that Mary may not verbalise",
      ],
      preventive: [
        "Falls: Remove trip hazards before starting each task; ensure non-slip footwear",
        "Falls: Walking frame must remain within reach at all times, never move it away",
        "Wandering: Ensure exit doors are secured; note any exit-seeking behaviour",
        "Dehydration: Offer fluids every 20–30 mins, Mary may not ask independently",
        "Routine: Use the same sequence of tasks each visit, familiarity reduces anxiety",
        "Skin integrity: Check for pressure marks or bruising at each visit",
      ],
      risks: [
        "HIGH FALL RISK, walking frame at all times, never leave Mary standing unassisted",
        "Dementia, may not recognise staff; introduce yourself at every visit",
        "Exit seeking, monitor during visits; escalate immediately if Mary leaves unsupervised",
        "Medication compliance, verify each dose is swallowed, document refusals",
        "Aspirin with food only, never on empty stomach",
        "Donepezil after breakfast, monitor for nausea or sleep disturbance",
      ],
      postMed: [
        "After Aspirin: Give with food; observe for stomach discomfort for 20 mins",
        "After Donepezil: Give after breakfast; monitor for nausea or sleep disturbance",
        "If Mary refuses medication: do not force, document refusal, reason, and notify office",
        "If any adverse reaction: call 999 immediately, then notify the care office",
      ],
      pbsCalmSigns: ["Smiling, relaxed, engaging in conversation", "Cooperating with personal care without resistance", "Asking for tea or familiar music", "Recognising or responding warmly to the carer"],
      pbsCalmActions: ["Continue with the planned care routine calmly", "Offer choices wherever possible, 'Would you like tea first or a wash?'", `Engage ${n} in ${possessive} preferred topics, music, family, crosswords`, "Praise cooperation genuinely and warmly"],
      pbsAnxiousSigns: ["Repeated questioning, 'Where am I?', 'Who are you?'", "Pacing or trying to get up repeatedly", `Refusing tasks ${pronoun} usually accepts`, "Tearfulness, calling out or verbal expressions of fear"],
      pbsAnxiousActions: ["Pause the task, do not push through resistance", `Speak softly, use ${n}'s name: '${n}, I'm here to help you, you're safe'`, "Offer a warm drink and sit beside her calmly", `Try a familiar distraction, ${possessive} favourite music or a photo of family`, "Document the episode and what helped in the visit notes"],
      pbsRiskSigns: ["Hitting, scratching or grabbing at staff", "Shouting, swearing or screaming", "Spitting or biting", "Attempting to leave the property urgently"],
      pbsRiskActions: [`Do NOT restrain, step back and create a safe distance`, `Stay calm, speak slowly: '${n}, I'm not going to hurt you, I'm here to help'`, `This is the dementia, not ${n}, do not take behaviour personally`, "Request backup: call a colleague or the office immediately", "Document fully in CAREi and complete an Incident Report", "If injury occurs: seek first aid, complete Datix, notify manager"],
      lastReview: ["Reviewed: 01 March 2026 by Dr A. Patel", "Next review: 01 June 2026", "Care package: 1 hr × 5 days per week", "Framework: PBS + Person-Centred + Dementia Care Mapping"],
    },
    tom: {
      objectives: [
        "Support safe transfers and mobility, hoist required for all bed/chair transfers",
        "Maintain personal hygiene and dignity throughout",
        "Administer medications as prescribed with food",
        "Monitor for signs of stroke recurrence, FAST assessment if concerned",
        "Encourage stroke rehabilitation exercises as per physio plan",
        "Monitor blood pressure and document at each visit",
      ],
      preventive: [
        "Transfers: Always use the hoist, never attempt manual lifts alone",
        "Falls: Ensure pathways are clear; Tom has weakness on the affected side",
        "Stroke recurrence: Know the FAST signs, Face drooping, Arm weakness, Speech difficulty, Time to call 999",
        "Dysphagia: If Tom has swallowing difficulties, report immediately, never rush food or drink",
        "Skin integrity: Check pressure areas after transfers, especially hips and sacrum",
        "Blood pressure: Record reading every visit; report above 140/90 to the office",
      ],
      risks: [
        "HOIST REQUIRED for all transfers, never attempt manual lift alone",
        "Post-stroke weakness on affected side, support that side during all movement",
        "Communication difficulties (aphasia), allow extra time, do not rush Tom",
        "Blood pressure monitoring, report readings above 140/90 immediately",
        "Aspirin with morning meal only",
        "Lisinopril with food, monitor blood pressure after administration",
      ],
      postMed: [
        "After Aspirin: Give with morning meal; check for stomach discomfort",
        "After Lisinopril: Monitor blood pressure for 20 mins; report readings above 140/90",
        "If Tom refuses medication: do not force, document refusal, reason, and notify office",
        "If any adverse reaction: call 999 immediately, then notify the care office",
      ],
      pbsCalmSigns: ["Engaging in conversation or attempting to communicate", "Cooperating with personal care and transfers", "Good eye contact, relaxed posture", "Attempting physio exercises willingly"],
      pbsCalmActions: ["Continue with the care routine at Tom's pace", "Allow extra time for communication, do not finish his sentences", `Acknowledge ${possessive} effort and progress genuinely`, "Engage Tom in conversation about his interests between tasks"],
      pbsAnxiousSigns: ["Visible frustration at being unable to communicate clearly", "Withdrawal, closing eyes, turning away, refusing interaction", "Increased agitation during personal care", "Refusing transfers or physio exercises"],
      pbsAnxiousActions: ["Pause, never force a transfer or task when Tom is distressed", `Use calm, simple language: '${n}, we can take our time, there's no rush'`, "Offer Tom control, 'Are you ready? Tell me when'", "Try a brief distraction, music or a short break before trying again", "Document the episode and what helped"],
      pbsRiskSigns: ["Grabbing or pushing staff during transfers or care", "Shouting or verbal outbursts from frustration", "Refusing to cooperate with essential tasks over multiple visits", "Extreme distress during personal care"],
      pbsRiskActions: ["Step back and give Tom space, do not react to physical behaviour", `Stay calm: '${n}, I hear you. Let's stop for a moment'`, "Do not attempt transfers without cooperation, call for backup", "This is post-stroke frustration, not aggression; never retaliate", "Document fully in CAREi and complete an Incident Report", "If injury occurs: seek first aid, complete Datix, notify manager"],
      lastReview: ["Reviewed: 15 February 2026 by Dr M. Clarke", "Next review: 15 May 2026", "Care package: 30 mins × 5 days per week", "Framework: PBS + Person-Centred + Stroke Rehabilitation Approach"],
    },
    aisha: {
      objectives: [
        "Monitor blood sugar levels and document at each visit",
        "Ensure Metformin is administered AFTER meals, confirm client has eaten first",
        "Monitor nutrition, low-sugar, balanced meals; encourage 6–8 glasses of water",
        "Inspect feet at each visit, report any redness, numbness or wounds immediately",
        "Promote independence while providing verbal prompting and encouragement",
        "Be alert for signs of hypoglycaemia at all times",
      ],
      preventive: [
        "Hypoglycaemia: Know the signs, sweating, shaking, pale skin, confusion, rapid pulse",
        "Hypoglycaemia: Always ensure Aisha has eaten before administering Metformin",
        "Foot care: Inspect for cuts, blisters, redness or swelling at every visit, diabetes increases infection risk",
        "Hydration: Encourage 6–8 glasses of water, dehydration worsens blood sugar control",
        "Ketoacidosis: Report any excessive thirst, frequent urination or fruity breath immediately",
        "Allergy: SULFONAMIDES, check all medication labels carefully before administration",
      ],
      risks: [
        "ALLERGY: Sulfonamides: do not administer under any circumstances",
        "Metformin MUST be given AFTER meals, never on empty stomach",
        "HIGH HYPOGLYCAEMIA RISK, monitor for sweating, shaking, confusion before and after meals",
        "Diabetic foot risk, inspect feet every visit; report any wounds or redness immediately",
        "Lisinopril with food, monitor blood pressure after administration",
        "Aisha values her privacy, always explain what you are doing before you do it",
      ],
      postMed: [
        "After Metformin: Monitor for nausea or stomach discomfort for 30 mins, ensure Aisha has eaten first",
        "After Lisinopril: Monitor blood pressure for 20 mins; report readings above 140/90",
        "If Aisha refuses medication: do not force, document refusal, reason, and notify office",
        "If any adverse reaction or suspected hypo: call 999 immediately, then notify the care office",
      ],
      pbsCalmSigns: ["Engaged and communicating confidently", "Eating and drinking well, cooperative with care", "Managing tasks semi-independently with verbal prompts", "Relaxed, good eye contact, responding positively"],
      pbsCalmActions: ["Continue with the care routine, offer choices and respect Aisha's preferences", "Always explain each step before doing it, Aisha values being in control", `Engage ${n} in conversation, ${pronoun} may be bilingual; adapt to ${possessive} language preference`, "Praise cooperation and independence positively"],
      pbsAnxiousSigns: ["Sweating, shaking, pale skin or trembling, possible hypoglycaemia", "Appearing confused, disorientated or slow to respond", "Refusing food when blood sugar may be low", "Withdrawal, quiet, not engaging, avoiding eye contact"],
      pbsAnxiousActions: ["PRIORITY: Check blood sugar if equipment available, report low reading immediately", `Offer a small fast-acting sugar source (glucose gel, fruit juice) if hypo is suspected`, `Stay calm: '${n}, I'm going to help you. Can you tell me how you feel?'`, "If blood sugar is critically low or Aisha loses consciousness: call 999 immediately", "Document blood sugar readings and any symptoms in the visit notes"],
      pbsRiskSigns: ["Confusion or disorientation not resolving with sugar intervention", "Loss of responsiveness or reduced consciousness", "Aggressive or unusual behaviour caused by very low blood sugar", "Vomiting, extreme weakness or collapse"],
      pbsRiskActions: ["Call 999 immediately, do not delay for any reason", "Place Aisha in the recovery position if unconscious and breathing", "Do NOT give food or drink to an unconscious person", "Notify the care office and next of kin immediately", "Remain with Aisha until emergency services arrive", "Document the full episode in CAREi and complete an Incident Report"],
      lastReview: ["Reviewed: 10 March 2026 by Dr F. Hassan", "Next review: 10 June 2026", "Care package: 1 hr × 5 days per week", "Framework: PBS + Person-Centred + Diabetes Care Protocol"],
    },
  };

  const d = byCondition[client.id] || byCondition.mary;

  const standardSections = [
    { title: "Support Framework", icon: "🧭", color: COLORS.teal, items: client.framework.split(" · ").map(f => `${f}, embedded throughout all care interactions`) },
    { title: "Level of Support", icon: "🤝", color: COLORS.teal, items: [client.supportLevel, ...d.objectives.slice(0, 2)] },
    { title: "Communication Passport", icon: "💬", color: "#a78bfa", items: client.communication.split(". ").filter(Boolean).map(s => s.trim().replace(/\.$/, "") + ".") },
    { title: "Care Objectives", icon: "🎯", color: COLORS.teal, items: d.objectives },
    { title: "Preventive Strategies", icon: "🛡️", color: COLORS.amber, items: d.preventive },
    { title: "Risks & Precautions", icon: "⚠️", color: COLORS.red, items: d.risks },
    { title: "Post-Medication Monitoring", icon: "💊", color: COLORS.teal, items: d.postMed },
    { title: "Last Review", icon: "📋", color: COLORS.g2, items: d.lastReview },
  ];

  const pbsStates = [
    { label: `${n} is Calm / Happy`, color: COLORS.green, bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", emoji: "😊", signs: d.pbsCalmSigns, staffActions: d.pbsCalmActions },
    { label: `${n} is Anxious / Distressed`, color: COLORS.amber, bg: "rgba(246,183,60,0.1)", border: "rgba(246,183,60,0.25)", emoji: "😟", signs: d.pbsAnxiousSigns, staffActions: d.pbsAnxiousActions },
    { label: `${n} displays Risk Behaviour`, color: COLORS.red, bg: "rgba(255,90,95,0.1)", border: "rgba(255,90,95,0.3)", emoji: "⚠️", signs: d.pbsRiskSigns, staffActions: d.pbsRiskActions },
  ];

  return { standardSections, pbsStates };
}

function CarePlanScreen({ client, onBack }: { client: typeof SCHEDULE_CLIENTS[0]; onBack: () => void }) {
  const { standardSections, pbsStates } = buildCarePlan(client);
  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Care Plan</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>{client.name} · Person-Centred Care Package</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {standardSections.map(s => (
          <div key={s.title} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{s.title}</div>
            </div>
            {s.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: s.color, marginTop: 6, flexShrink: 0 }} />
                <span style={{ color: COLORS.g1, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
        {/* PBS Support Plan */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", borderLeft: "3px solid #a78bfa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>🧩</span>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>PBS Support Plan</div>
          </div>
          <div style={{ color: COLORS.g3, fontSize: 11, marginBottom: 14 }}>Positive Behaviour Support, what to do in each state</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pbsStates.map(state => (
              <div key={state.label} style={{ background: state.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${state.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{state.emoji}</span>
                  <div style={{ color: state.color, fontWeight: 700, fontSize: 13 }}>{state.label}</div>
                </div>
                <div style={{ color: COLORS.g3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Signs to look for</div>
                {state.signs.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4, alignItems: "flex-start" }}>
                    <div style={{ width: 3, height: 3, borderRadius: "50%", background: state.color, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
                <div style={{ color: COLORS.g3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "10px 0 5px" }}>What staff should do</div>
                {state.staffActions.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4, alignItems: "flex-start" }}>
                    <span style={{ color: state.color, fontSize: 12, flexShrink: 0, fontWeight: 700 }}>→</span>
                    <span style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Safety Intervention */}
        <div style={{ background: "rgba(255,90,95,0.08)", borderRadius: 14, padding: "14px 16px", borderLeft: `3px solid ${COLORS.red}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🦺</span>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Safety Intervention Guidance</div>
          </div>
          {[
            "If a service user hits or kicks you: step back immediately, do NOT retaliate or restrain. De-escalate using calm voice and safe distancing.",
            "If you are injured: prioritise your safety, leave the room if necessary, call for help or dial 999.",
            "If a service user has fallen: do NOT attempt to lift them alone. Call 999 if injured, keep them warm and calm, contact the office.",
            "All incidents must be reported immediately via the Incident Report in CAREi and a full Datix completed within 24 hours.",
            "Adjoy Healthcare operates a zero-tolerance policy to staff injury, always report, always document.",
            "Safety intervention training is mandatory, speak to your manager if you have not completed MAPA/breakaway training.",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.red, marginTop: 6, flexShrink: 0 }} />
              <span style={{ color: COLORS.g1, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Emergency Contacts Screen ────────────────────────────────────────────────

function EmergencyContactsScreen({ onBack, carerAgency }: { onBack: () => void; carerAgency: string }) {
  const agencyName = carerAgency || "Care Agency";
  const contacts = [
    { name: "David Mensah", relation: "Son (Next of Kin)", phone: "07700 900123", primary: true },
    { name: "Akosua Mensah", relation: "Daughter", phone: "07700 900456", primary: false },
    { name: "Dr Sandra Obi", relation: "GP: Caversham Surgery", phone: "0118 947 0111", primary: false },
    { name: agencyName, relation: "Care Agency (24hr)", phone: "0118 321 9900", primary: false },
    { name: `Care Manager, ${agencyName}`, relation: "On-call care manager", phone: "0800 000 0000", primary: false },
    { name: "Emergency Services", relation: "Police / Ambulance / Fire", phone: "999", primary: false },
    { name: "NHS Non-Emergency", relation: "Medical advice", phone: "111", primary: false },
  ];
  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Emergency Contacts</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>Grace Mensah · Next of kin & key contacts</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {contacts.map((c, i) => (
          <div key={i} style={{ background: c.primary ? "rgba(79,209,197,0.08)" : "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", border: c.primary ? "1px solid rgba(79,209,197,0.2)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>{c.relation}</div>
                <div style={{ color: COLORS.teal, fontSize: 13, fontWeight: 600, marginTop: 4 }}>{c.phone}</div>
              </div>
              {c.primary && <Badge color={COLORS.teal} bg="rgba(79,209,197,0.12)">Primary</Badge>}
            </div>
            <button style={{ marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: c.phone === "999" ? "rgba(255,90,95,0.2)" : "rgba(255,255,255,0.07)", color: c.phone === "999" ? COLORS.red : COLORS.g1, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              📞 Call {c.name.split(" ")[0]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Teaser Screen ──────────────────────────────────────────────────────

function AdminTeaserScreen({
  onBack,
  onOpenAdmin,
  visitStatuses,
  onSchedule,
  onManagerApprovals,
  pendingApprovals,
}: {
  onBack: () => void;
  onOpenAdmin: () => void;
  visitStatuses: Record<string, string>;
  onSchedule: () => void;
  onManagerApprovals: () => void;
  pendingApprovals: number;
}) {
  const metrics = [
    { label: "Carers on Shift", value: "7", color: COLORS.green },
    { label: "Active Alerts", value: "2", color: COLORS.red },
    { label: "CQC Score", value: "94%", color: COLORS.teal },
  ];
  const carers = [
    { name: "Sarah J.", status: "Active" },
    { name: "Amy M.", status: "Late" },
    { name: "James O.", status: "Active" },
    { name: "David C.", status: "Break" },
    { name: "Priya P.", status: "Done" },
  ];
  const statusColors: Record<string, string> = { Active: COLORS.green, Late: COLORS.red, Break: COLORS.amber, Done: COLORS.g3 };
  const statusBgs: Record<string, string> = { Active: "rgba(34,197,94,0.15)", Late: "rgba(255,90,95,0.15)", Break: "rgba(246,183,60,0.15)", Done: "rgba(100,116,139,0.12)" };
  const visitStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: COLORS.amber },
    "in-progress": { label: "In Progress", color: COLORS.teal },
    completed: { label: "Completed", color: COLORS.green },
  };

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 14px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Manager Overview</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 2 }}>Adjoy Healthcare · Live</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, minHeight: 0, padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ color: m.color, fontWeight: 700, fontSize: 22 }}>{m.value}</div>
              <div style={{ color: COLORS.g3, fontSize: 10, marginTop: 3, lineHeight: 1.3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Manager Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onManagerApprovals}
            style={{ flex: 1, position: "relative", padding: "12px 10px", borderRadius: 12, border: pendingApprovals > 0 ? "1px solid rgba(246,183,60,0.4)" : "1px solid rgba(255,255,255,0.1)", background: pendingApprovals > 0 ? "rgba(246,183,60,0.08)" : "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            {pendingApprovals > 0 && (
              <div style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: "50%", background: COLORS.amber, color: COLORS.darkNavy, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {pendingApprovals}
              </div>
            )}
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ color: pendingApprovals > 0 ? COLORS.amber : COLORS.g1, fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.3, fontFamily: "DM Sans, sans-serif" }}>Manager{"\n"}Approvals</span>
          </button>
          <button
            onClick={onSchedule}
            style={{ flex: 1, padding: "12px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <span style={{ fontSize: 18 }}>📅</span>
            <span style={{ color: COLORS.g1, fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.3, fontFamily: "DM Sans, sans-serif" }}>Manage{"\n"}Schedule</span>
          </button>
        </div>

        {/* Carer strip */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Live Carer Status</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {carers.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, background: statusBgs[c.status], borderRadius: 99, padding: "4px 10px 4px 6px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColors[c.status] }} />
                <span style={{ color: statusColors[c.status], fontSize: 11, fontWeight: 700 }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Visit Status */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Live Visit Status</div>
          {SCHEDULE_CLIENTS.map((client) => {
            const status = visitStatuses[client.id] || "pending";
            const cfg = visitStatusConfig[status] || visitStatusConfig.pending;
            return (
              <div key={client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{client.name}</div>
                  <div style={{ color: COLORS.g2, fontSize: 11 }}>{client.time}</div>
                </div>
                <Badge color={cfg.color} bg={`${cfg.color}22`}>{cfg.label}</Badge>
              </div>
            );
          })}
        </div>

        {/* Top alert */}
        <div style={{ background: "rgba(255,90,95,0.1)", border: "1px solid rgba(255,90,95,0.3)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <Badge color={COLORS.red} bg="rgba(255,90,95,0.2)">Critical</Badge>
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Amy Mitchell, lone worker overdue</div>
          <div style={{ color: COLORS.g2, fontSize: 12 }}>Check-in 18 min overdue at Patricia Lane's address. Supervisor action required.</div>
        </div>

        {/* CQC summary */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>CQC Compliance Today</div>
          {[["Medication confirmations", 96], ["Visit sign-offs", 91], ["Handover notes", 88]].map(([l, v]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: COLORS.g2, fontSize: 12 }}>{l}</span>
                <span style={{ color: Number(v) >= 90 ? COLORS.green : COLORS.amber, fontSize: 12, fontWeight: 700 }}>{v}%</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4 }}>
                <div style={{ height: 4, borderRadius: 99, background: Number(v) >= 90 ? COLORS.green : COLORS.amber, width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onOpenAdmin} style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Open Full Admin Dashboard →
        </button>
      </div>
    </div>
  );
}

// ─── Manager Approvals Screen ─────────────────────────────────────────────────

function ManagerApprovalsScreen({
  approvalStatus,
  onApprove,
  summaryReadAt,
  onBack,
  carerName,
}: {
  approvalStatus: "pending" | "approved";
  onApprove: () => void;
  summaryReadAt: string | null;
  onBack: () => void;
  carerName: string;
}) {
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  function handleApprove() {
    setApprovedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    onApprove();
  }

  const isApproved = approvalStatus === "approved";

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Manager Approvals</div>
        <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>Review and release family summaries</div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "0 18px 30px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Status banner */}
        <div style={{ background: isApproved ? "rgba(34,197,94,0.08)" : "rgba(246,183,60,0.08)", border: `1px solid ${isApproved ? "rgba(34,197,94,0.3)" : "rgba(246,183,60,0.3)"}`, borderRadius: 14, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{isApproved ? "✅" : "⏳"}</span>
          <div>
            <div style={{ color: isApproved ? COLORS.green : COLORS.amber, fontWeight: 700, fontSize: 13 }}>
              {isApproved ? "Summary released to family" : "Awaiting your approval"}
            </div>
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>
              {isApproved ? `Approved${approvedAt ? ` at ${approvedAt}` : ""}` : "Review the summary below before releasing to family"}
            </div>
          </div>
        </div>

        {/* Summary preview */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Mary Johnson, 9 Apr 2026</div>
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>Carer: {carerName} · Visit 09:00–10:05</div>
          </div>
          {[
            { label: "Tasks completed", value: "6 / 6" },
            { label: "Medications given", value: "2 / 2, all as prescribed" },
            { label: "Concerns raised", value: "None" },
            { label: "Carer's note", value: '"Mary was in really good spirits…"' },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: COLORS.g2, fontSize: 12 }}>{row.label}</span>
              <span style={{ color: COLORS.g1, fontSize: 12, fontWeight: 500, maxWidth: "55%", textAlign: "right" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Read receipt */}
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>READ RECEIPT</div>
          {summaryReadAt ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 16 }}>👁</span>
              <div>
                <div style={{ color: COLORS.green, fontSize: 13, fontWeight: 600 }}>Summary viewed by family</div>
                <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>Opened at {summaryReadAt}</div>
              </div>
            </div>
          ) : (
            <div style={{ color: COLORS.g3, fontSize: 12 }}>
              {isApproved ? "Not yet opened by family" : "Awaiting approval before family can view"}
            </div>
          )}
        </div>

        {/* Checklist before approving */}
        {!isApproved && (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>APPROVAL CHECKLIST</div>
            {[
              "Carer's note is appropriate for family reading",
              "No clinical concerns require a phone call first",
              "Medication log is complete and accurate",
              "No safeguarding issues flagged",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(79,209,197,0.2)", border: "1px solid rgba(79,209,197,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ color: COLORS.teal, fontSize: 10 }}>✓</span>
                </div>
                <span style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Approve button */}
        {!isApproved && (
          <button onClick={handleApprove} style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            ✓ Approve & Release to Family
          </button>
        )}
        {isApproved && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 14, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 14 }}>Released ✓</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 4 }}>Mary's family can now view today's summary in the Family Portal</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Incident Report Screen ────────────────────────────────────────────────────

const INCIDENT_TYPES = ["Fall", "Skin integrity change", "Behavioural change", "Medication concern", "Safeguarding", "Other"];
const INCIDENT_ACTIONS = ["Contacted supervisor", "Called 999", "Called GP", "Left written note", "No immediate action required"];

function IncidentReportScreen({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "">("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");
  const [notified, setNotified] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = type && severity && description.trim().length > 10 && action;

  if (submitted) {
    return (
      <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✓</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 20, textAlign: "center" }}>Incident Logged</div>
        <div style={{ color: COLORS.g2, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>This report has been added to the CQC audit trail and your supervisor has been notified.</div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", width: "100%" }}>
          <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>REFERENCE</div>
          <div style={{ color: COLORS.teal, fontSize: 14, fontWeight: 700 }}>INC-{Math.floor(Math.random() * 9000 + 1000)}-2026</div>
        </div>
        <button onClick={onSubmit} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back to Visit</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 10 }}>‹</button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 20, color: "#fff" }}>Report Incident</div>
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 1 }}>This will be logged to the CQC audit trail</div>
          </div>
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "0 18px 100px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Incident type */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>INCIDENT TYPE *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {INCIDENT_TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} style={{ padding: "7px 12px", borderRadius: 99, border: `1px solid ${type === t ? COLORS.red : "rgba(255,255,255,0.15)"}`, background: type === t ? "rgba(255,90,95,0.15)" : "transparent", color: type === t ? COLORS.red : COLORS.g2, fontSize: 12, fontWeight: type === t ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>SEVERITY *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {([["low", COLORS.green, "Low"], ["medium", COLORS.amber, "Medium"], ["high", COLORS.red, "High"]] as const).map(([val, col, lbl]) => (
              <button key={val} onClick={() => setSeverity(val)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${severity === val ? col : "rgba(255,255,255,0.12)"}`, background: severity === val ? `${col}22` : "transparent", color: severity === val ? col : COLORS.g3, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>DESCRIPTION * <span style={{ color: COLORS.g3, fontWeight: 400 }}>(what happened, exactly)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened in your own words. Include time, location, and what the client was doing beforehand."
            rows={4}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Action taken */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>IMMEDIATE ACTION TAKEN *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {INCIDENT_ACTIONS.map((a) => (
              <button key={a} onClick={() => setAction(a)} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${action === a ? COLORS.teal : "rgba(255,255,255,0.1)"}`, background: action === a ? "rgba(79,209,197,0.1)" : "rgba(255,255,255,0.04)", color: action === a ? COLORS.teal : COLORS.g2, textAlign: "left", fontSize: 13, fontWeight: action === a ? 600 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{a}</button>
            ))}
          </div>
        </div>

        {/* Who was notified */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>WHO WAS NOTIFIED <span style={{ color: COLORS.g3, fontWeight: 400 }}>(optional)</span></label>
          <input
            value={notified}
            onChange={(e) => setNotified(e.target.value)}
            placeholder="e.g. Supervisor, next of kin, GP…"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* Submit */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 18px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => { if (canSubmit) setSubmitted(true); }}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: canSubmit ? COLORS.red : "rgba(255,255,255,0.08)", color: canSubmit ? "#fff" : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >
          {canSubmit ? "Submit Incident Report" : "Complete required fields"}
        </button>
      </div>
    </div>
  );
}

// ─── Handover Notes Screen ─────────────────────────────────────────────────────

function HandoverScreen({ client, onSubmit }: { client: typeof SCHEDULE_CLIENTS[0]; onSubmit: () => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [appetite, setAppetite] = useState("");
  const [mobility, setMobility] = useState("");
  const [observations, setObservations] = useState("");
  const [pendingTasks, setPendingTasks] = useState("");
  const [concerns, setConcerns] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = mood !== null && appetite && mobility;

  const MOODS = ["😔", "😕", "😐", "🙂", "😊"];

  if (submitted) {
    return (
      <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <div style={{ fontSize: 48 }}>📋</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 20, textAlign: "center" }}>Handover Saved</div>
        <div style={{ color: COLORS.g2, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>Your notes are ready for the next carer visiting {client.name.split(" ")[0]}.</div>
        <button onClick={onSubmit} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Continue to Visit Summary →</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>📋</span>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 20, color: "#fff" }}>Handover Notes</div>
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 1 }}>For the next carer visiting {client.name.split(" ")[0]}</div>
          </div>
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, minHeight: 0, padding: "0 18px 120px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Mood */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 10 }}>HOW WAS {client.name.split(" ")[0].toUpperCase()}'S MOOD? *</label>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
            {MOODS.map((emoji, i) => (
              <button key={i} onClick={() => setMood(i)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${mood === i ? COLORS.teal : "rgba(255,255,255,0.1)"}`, background: mood === i ? "rgba(79,209,197,0.15)" : "rgba(255,255,255,0.04)", fontSize: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span>{emoji}</span>
                <span style={{ color: COLORS.g3, fontSize: 9 }}>{["Very low", "Low", "Okay", "Good", "Great"][i]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Appetite + Mobility */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>APPETITE *</label>
            {["Good", "Fair", "Poor"].map((v) => (
              <button key={v} onClick={() => setAppetite(v)} style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 0", borderRadius: 8, border: `1px solid ${appetite === v ? COLORS.teal : "rgba(255,255,255,0.1)"}`, background: appetite === v ? "rgba(79,209,197,0.1)" : "transparent", color: appetite === v ? COLORS.teal : COLORS.g2, fontSize: 12, fontWeight: appetite === v ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{v}</button>
            ))}
          </div>
          <div>
            <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>MOBILITY *</label>
            {["Independent", "Needs support", "Limited"].map((v) => (
              <button key={v} onClick={() => setMobility(v)} style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 0", borderRadius: 8, border: `1px solid ${mobility === v ? COLORS.teal : "rgba(255,255,255,0.1)"}`, background: mobility === v ? "rgba(79,209,197,0.1)" : "transparent", color: mobility === v ? COLORS.teal : COLORS.g2, fontSize: 12, fontWeight: mobility === v ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{v}</button>
            ))}
          </div>
        </div>

        {/* Observations */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>KEY OBSERVATIONS <span style={{ color: COLORS.g3, fontWeight: 400 }}>(optional)</span></label>
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder={`Anything the next carer should know about ${client.name.split(" ")[0]}…`} rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Pending tasks */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>TASKS LEFT FOR NEXT CARER <span style={{ color: COLORS.g3, fontWeight: 400 }}>(optional)</span></label>
          <textarea value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} placeholder="e.g. Evening medication, call with daughter due at 6pm…" rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Concerns */}
        <div>
          <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 8 }}>ANY CONCERNS TO FLAG? <span style={{ color: COLORS.g3, fontWeight: 400 }}>(optional)</span></label>
          <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} placeholder="Leave blank if none. Include anything that needs supervisor attention." rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${concerns ? "rgba(246,183,60,0.35)" : "rgba(255,255,255,0.12)"}`, background: concerns ? "rgba(246,183,60,0.05)" : "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }} />
        </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 18px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => { if (canSubmit) setSubmitted(true); }}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: canSubmit ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.08)", color: canSubmit ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >
          {canSubmit ? "Save Handover & Continue →" : "Set mood, appetite and mobility first"}
        </button>
      </div>
    </div>
  );
}

// ─── Rota Screen ──────────────────────────────────────────────────────────────

const WEEK_SHIFTS: { day: string; date: string; shifts: { time: string; client: string; type: string }[] }[] = [
  { day: "Mon", date: "7 Apr", shifts: [{ time: "09:00–10:00", client: "Mary Johnson", type: "Morning" }, { time: "10:30–11:00", client: "Tom Adams", type: "Morning" }] },
  { day: "Tue", date: "8 Apr", shifts: [{ time: "12:00–13:00", client: "Aisha Khan", type: "Afternoon" }] },
  { day: "Wed", date: "9 Apr", shifts: [{ time: "09:00–10:00", client: "Mary Johnson", type: "Morning" }, { time: "10:30–11:00", client: "Tom Adams", type: "Morning" }, { time: "12:00–13:00", client: "Aisha Khan", type: "Afternoon" }] },
  { day: "Thu", date: "10 Apr", shifts: [{ time: "09:00–10:00", client: "Mary Johnson", type: "Morning" }] },
  { day: "Fri", date: "11 Apr", shifts: [{ time: "10:30–11:00", client: "Tom Adams", type: "Morning" }, { time: "12:00–13:00", client: "Aisha Khan", type: "Afternoon" }] },
  { day: "Sat", date: "12 Apr", shifts: [] },
  { day: "Sun", date: "13 Apr", shifts: [] },
];

const MONTH_WEEKS = [
  { label: "Week 1 (7–13 Apr)", days: [2, 3, 3, 1, 2, 0, 0] },
  { label: "Week 2 (14–20 Apr)", days: [2, 1, 3, 2, 2, 0, 0] },
  { label: "Week 3 (21–27 Apr)", days: [3, 2, 3, 1, 2, 0, 0] },
  { label: "Week 4 (28 Apr–4 May)", days: [2, 1, 3, 2, 1, 0, 0] },
];

const SWAP_CARERS = ["Alice Osei", "James Kwame", "Emma Brobbey", "Priya Nair"];

function RotaScreen({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<"week" | "month">("week");
  const [swapShift, setSwapShift] = useState<{ day: string; time: string; client: string } | null>(null);
  const [swapRequested, setSwapRequested] = useState<string | null>(null);
  const [unavailDays, setUnavailDays] = useState<string[]>([]);
  const [showUnavailForm, setShowUnavailForm] = useState(false);
  const [unavailDate, setUnavailDate] = useState("");
  const [unavailReason, setUnavailReason] = useState("Holiday");
  const [swapSent, setSwapSent] = useState(false);

  function requestSwap(carer: string) {
    setSwapRequested(carer);
    setSwapSent(true);
    setTimeout(() => { setSwapShift(null); setSwapRequested(null); setSwapSent(false); }, 2000);
  }

  function flagUnavail() {
    if (unavailDate) {
      setUnavailDays((d) => [...d, unavailDate]);
      setShowUnavailForm(false);
      setUnavailDate("");
    }
  }

  const totalShifts = WEEK_SHIFTS.reduce((sum, d) => sum + d.shifts.length, 0);
  const totalHours = totalShifts * 1.5;

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff", lineHeight: 1.1 }}>My Rota</div>
            <div style={{ color: COLORS.g2, fontSize: 11 }}>April 2026</div>
          </div>
        </div>
        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Shifts this week", value: String(totalShifts) },
            { label: "Hours this week", value: `${totalHours}h` },
            { label: "Days off", value: "2" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 18 }}>{s.value}</div>
              <div style={{ color: COLORS.g2, fontSize: 9, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: 3, marginTop: 12 }}>
          {(["week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: view === v ? COLORS.teal : "transparent", color: view === v ? COLORS.darkNavy : COLORS.g2, fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "DM Sans, sans-serif" }}>
              {v === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 120px", display: "flex", flexDirection: "column", gap: 8 }}>
        {view === "week" ? (
          <>
            {WEEK_SHIFTS.map((day) => {
              const isToday = day.day === "Wed";
              const isUnavail = unavailDays.includes(day.date);
              return (
                <div key={day.day} style={{ borderRadius: 14, overflow: "hidden", border: isToday ? `1px solid rgba(79,209,197,0.4)` : "1px solid rgba(255,255,255,0.06)", background: isToday ? "rgba(79,209,197,0.05)" : "rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px 8px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isToday ? COLORS.teal : "rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: isToday ? COLORS.darkNavy : COLORS.g2, fontSize: 9, fontWeight: 700 }}>{day.day}</span>
                        <span style={{ color: isToday ? COLORS.darkNavy : "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{day.date.split(" ")[0]}</span>
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{day.date}</div>
                        <div style={{ color: COLORS.g2, fontSize: 10 }}>
                          {isUnavail ? "🔴 Unavailable" : day.shifts.length === 0 ? "Rest day" : `${day.shifts.length} shift${day.shifts.length > 1 ? "s" : ""}`}
                        </div>
                      </div>
                    </div>
                    {isToday && <Badge color={COLORS.teal} bg="rgba(79,209,197,0.15)">Today</Badge>}
                    {!isUnavail && day.shifts.length > 0 && (
                      <button onClick={() => { setUnavailDate(day.date); setShowUnavailForm(true); }} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, border: `1px solid rgba(255,90,95,0.4)`, background: "rgba(255,90,95,0.1)", color: COLORS.red, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>Flag</button>
                    )}
                  </div>
                  {day.shifts.length > 0 && !isUnavail && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 14px 10px" }}>
                      {day.shifts.map((shift, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                          <div>
                            <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{shift.client}</div>
                            <div style={{ color: COLORS.g2, fontSize: 10 }}>{shift.time} · {shift.type}</div>
                          </div>
                          <button onClick={() => setSwapShift({ day: day.day, time: shift.time, client: shift.client })} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, border: `1px solid rgba(79,209,197,0.4)`, background: "rgba(79,209,197,0.1)", color: COLORS.teal, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>Swap</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            {MONTH_WEEKS.map((week) => (
              <div key={week.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>{week.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ color: COLORS.g2, fontSize: 9, marginBottom: 4 }}>{d}</div>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: week.days[i] > 0 ? "rgba(79,209,197,0.15)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", border: week.days[i] > 0 ? "1px solid rgba(79,209,197,0.3)" : "1px solid rgba(255,255,255,0.06)" }}>
                        {week.days[i] > 0 ? (
                          <span style={{ color: COLORS.teal, fontSize: 12, fontWeight: 700 }}>{week.days[i]}</span>
                        ) : (
                          <span style={{ color: COLORS.g2, fontSize: 9 }}>–</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Monthly Summary</div>
              {[{ label: "Total shifts", value: "42" }, { label: "Total hours", value: "63h" }, { label: "Avg per day", value: "2.1" }].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: COLORS.g2, fontSize: 12 }}>{s.label}</span>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Flagged unavailability */}
        {unavailDays.length > 0 && (
          <div style={{ background: "rgba(255,90,95,0.08)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,90,95,0.2)" }}>
            <div style={{ color: COLORS.red, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Flagged Unavailability</div>
            {unavailDays.map((d) => (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: COLORS.g1, fontSize: 12 }}>{d}</span>
                <button onClick={() => setUnavailDays((ds) => ds.filter((x) => x !== d))} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, border: "none", background: "rgba(255,90,95,0.2)", color: COLORS.red, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flag Unavailability bottom button */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px 20px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={() => setShowUnavailForm(true)} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid rgba(255,90,95,0.4)`, background: "rgba(255,90,95,0.1)", color: COLORS.red, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>+ Flag Unavailability</button>
      </div>

      {/* Swap Request Modal */}
      {swapShift && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 50 }}>
          <div style={{ background: COLORS.navy, borderRadius: "20px 20px 0 0", padding: 20, animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff", marginBottom: 4 }}>Request Shift Swap</div>
            <div style={{ color: COLORS.g2, fontSize: 12, marginBottom: 16 }}>{swapShift.day} · {swapShift.time} · {swapShift.client}</div>
            {swapSent ? (
              <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
                <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 14 }}>Swap request sent to {swapRequested}</div>
                <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 4 }}>Awaiting confirmation from supervisor</div>
              </div>
            ) : (
              <>
                <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Select a carer to request swap with:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SWAP_CARERS.map((carer) => (
                    <button key={carer} onClick={() => requestSwap(carer)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(79,209,197,0.25)", background: "rgba(79,209,197,0.07)", cursor: "pointer" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {carer.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span style={{ color: "#fff", fontWeight: 500, fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>{carer}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSwapShift(null)} style={{ marginTop: 14, width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Flag Unavailability Modal */}
      {showUnavailForm && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 50 }}>
          <div style={{ background: COLORS.navy, borderRadius: "20px 20px 0 0", padding: 20, animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff", marginBottom: 16 }}>Flag Unavailability</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Date</label>
                <input
                  type="date"
                  value={unavailDate}
                  onChange={(e) => setUnavailDate(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 13, fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Reason</label>
                <select
                  value={unavailReason}
                  onChange={(e) => setUnavailReason(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: COLORS.navy, color: "#fff", fontSize: 13, fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" }}
                >
                  {["Holiday", "Sick Leave", "Personal", "Medical Appointment", "Other"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowUnavailForm(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
              <button onClick={flagUnavail} style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", background: COLORS.red, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Flag as Unavailable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Screens ───────────────────────────────────────────────────────────────

function TodayCareScreen({
  visitStatuses,
  onSelectClient,
  onOperations,
  onRota,
  onAssistant,
  onSOS,
  onProfile,
  carerName,
}: {
  visitStatuses: Record<string, string>;
  onSelectClient: (id: string) => void;
  onOperations: () => void;
  onRota: () => void;
  onAssistant: () => void;
  onSOS: () => void;
  onProfile: () => void;
  carerName: string;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const doneCount = Object.values(visitStatuses).filter((s) => s === "completed").length;
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  function playBriefing(c: typeof SCHEDULE_CLIENTS[0], e: React.MouseEvent) {
    e.stopPropagation();
    if (speakingId === c.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const bullets = (c.lastHandoverBullets as string[]).join(". ");
    const text = `Handover briefing for ${c.name}. ${bullets}`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-GB";
    utt.rate = 0.92;
    utt.onend = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utt);
    setSpeakingId(c.id);
  }

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>{greeting},</div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff" }}>Today's Care</div>
          </div>
          <div onClick={onProfile} style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{getInitials(carerName)}</div>
        </div>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
          {[
            { label: "Visits", value: "3" },
            { label: "Hours", value: "3.5" },
            { label: "Done", value: String(doneCount) },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 20 }}>{s.value}</div>
              <div style={{ color: COLORS.g2, fontSize: 10, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visit cards */}
      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 130px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ color: COLORS.g1, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Today's Schedule</div>
        {SCHEDULE_CLIENTS.map((client) => {
          const status = visitStatuses[client.id] || "pending";
          const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
            pending: { label: "Pending", color: COLORS.amber, bg: "rgba(246,183,60,0.15)" },
            "in-progress": { label: "In Progress", color: COLORS.teal, bg: "rgba(79,209,197,0.15)" },
            completed: { label: "Completed", color: COLORS.green, bg: "rgba(34,197,94,0.15)" },
          };
          const cfg = statusConfig[status] || statusConfig.pending;
          return (
            <div
              key={client.id}
              onClick={() => status !== "completed" ? onSelectClient(client.id) : undefined}
              style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", cursor: status !== "completed" ? "pointer" : "default", border: status === "in-progress" ? `1px solid rgba(79,209,197,0.35)` : "1px solid transparent", opacity: status === "completed" ? 0.7 : 1 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {client.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{client.name}</div>
                    <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 1 }}>Age {client.age} · {client.time}</div>
                  </div>
                </div>
                <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {client.tags.map((tag) => (
                    <Badge key={tag} color={COLORS.teal} bg="rgba(79,209,197,0.1)">{tag}</Badge>
                  ))}
                </div>
                {status !== "completed" && (
                  <button
                    onClick={(e) => playBriefing(client, e)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 99, border: `1px solid ${speakingId === client.id ? "rgba(246,183,60,0.6)" : "rgba(79,209,197,0.55)"}`, background: speakingId === client.id ? "rgba(246,183,60,0.15)" : "rgba(79,209,197,0.18)", color: speakingId === client.id ? "#F6B73C" : COLORS.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", flexShrink: 0 }}
                  >
                    {speakingId === client.id ? "⏹ Stop" : "🔊 Listen to update"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating CAREi Assistant button - bottom left */}
      <button onClick={onAssistant} className="fade-in" style={{ position: "absolute", bottom: 88, left: 20, width: 54, height: 54, borderRadius: "50%", border: "none", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(59,130,246,0.5)", zIndex: 10 }} title="CAREi Assistant">✦</button>

      {/* Floating SOS button - bottom right */}
      <button onClick={onSOS} className="sos-pulse" style={{ position: "absolute", bottom: 88, right: 20, width: 54, height: 54, borderRadius: "50%", border: "none", background: COLORS.red, color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>SOS</button>

      {/* Bottom nav */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 78, background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
        {[
          { icon: "🏠", label: "Home", action: undefined as undefined | (() => void) },
          { icon: "📅", label: "My Rota", action: onRota },
          { icon: "⚙️", label: "Operations", action: onOperations },
          { icon: "👤", label: "Profile", action: onProfile },
        ].map((n) => (
          <div key={n.label} onClick={n.action} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: n.action ? "pointer" : "default", gap: 2, opacity: n.label === "Home" ? 1 : 0.5 }}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ color: COLORS.g2, fontSize: 10 }}>{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveVisitScreen({
  client,
  onComplete,
  onBack,
  onSOS,
  onAssistant,
  onBodyMap,
  onCarePlan,
  onEmergency,
  medStatus,
  setMedStatus,
  tasks,
  setTasks,
  notes,
  setNotes,
  fluidGlasses,
  setFluidGlasses,
}: {
  client: typeof SCHEDULE_CLIENTS[0];
  onComplete: (data: VisitData) => void;
  onBack: () => void;
  onSOS: () => void;
  onAssistant: () => void;
  onBodyMap: () => void;
  onCarePlan: () => void;
  onEmergency: () => void;
  medStatus: Record<string, "taken" | "refused" | undefined>;
  setMedStatus: React.Dispatch<React.SetStateAction<Record<string, "taken" | "refused" | undefined>>>;
  tasks: boolean[];
  setTasks: React.Dispatch<React.SetStateAction<boolean[]>>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  fluidGlasses: number;
  setFluidGlasses: React.Dispatch<React.SetStateAction<number>>;
  mood: string;
  setMood: React.Dispatch<React.SetStateAction<string>>;
  moodSet: boolean;
  setMoodSet: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRefusalFor, setShowRefusalFor] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState("");
  const [refusalWhatSaid, setRefusalWhatSaid] = useState("");
  const [refusalAction, setRefusalAction] = useState("");
  const [isLone, setIsLone] = useState(false);
  const [loneElapsed, setLoneElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [o2sat, setO2sat] = useState("");
  const [vitalsSaved, setVitalsSaved] = useState(false);
  const [mealStatus, setMealStatus] = useState<"" | "Full" | "Half" | "Refused">("");
  const [showMealPrompt, setShowMealPrompt] = useState(false);
  const [mealPromptDismissed, setMealPromptDismissed] = useState(false);
  const [shownCues, setShownCues] = useState<Set<string>>(new Set());
  const [showPrevVisits, setShowPrevVisits] = useState(false);
  const [showInlineIncident, setShowInlineIncident] = useState(false);
  const [incidentSeverity, setIncidentSeverity] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentDone, setIncidentDone] = useState(false);

  const loneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const VISIT_TASKS = ["Prepare breakfast", "Assist with mobility", "Record mood"];
  const MEAL_TASK_IDX = 0;
  const CARE_HISTORY = [
    { date: "14 Mar 2026", summary: "Client in good spirits. All medication administered. Breakfast completed without issue." },
    { date: "12 Mar 2026", summary: "Mobility slightly reduced compared to previous visit. Flagged to supervisor. Meds taken on time." },
    { date: "10 Mar 2026", summary: "Visit completed. Client engaged well with carer. No concerns raised." },
  ];

  useEffect(() => {
    visitIntervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (visitIntervalRef.current) clearInterval(visitIntervalRef.current); };
  }, []);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  useEffect(() => {
    if (isLone) {
      loneIntervalRef.current = setInterval(() => setLoneElapsed((e) => e + 1), 1000);
    } else {
      if (loneIntervalRef.current) clearInterval(loneIntervalRef.current);
      setLoneElapsed(0);
    }
    return () => { if (loneIntervalRef.current) clearInterval(loneIntervalRef.current); };
  }, [isLone]);

  useEffect(() => {
    const trackActivity = () => { lastActivityRef.current = Date.now(); };
    document.addEventListener("click", trackActivity);
    document.addEventListener("touchstart", trackActivity);
    const visCheck = setInterval(() => {
      if (isLone && document.hidden) {
        const inactiveMs = Date.now() - lastActivityRef.current;
        if (inactiveMs >= 25 * 60 * 1000) setLoneElapsed(25 * 60 + 1);
      }
    }, 30000);
    return () => {
      document.removeEventListener("click", trackActivity);
      document.removeEventListener("touchstart", trackActivity);
      clearInterval(visCheck);
    };
  }, [isLone]);

  const loneOverdue = isLone && loneElapsed >= 25 * 60;
  const allMedsAcknowledged = client.meds.every((m) => medStatus[m.name] !== undefined);
  const firstName = client.name.split(" ")[0];

  function handleTaskCheck(i: number) {
    const newTasks = [...tasks];
    newTasks[i] = !newTasks[i];
    setTasks(newTasks);
    if (i === MEAL_TASK_IDX && newTasks[i] && !mealPromptDismissed && mealStatus === "") {
      setShowMealPrompt(true);
    }
    const taskName = VISIT_TASKS[i];
    const cue = (client.contextualCues as { trigger: string; content: string }[])?.find((c) => c.trigger === taskName);
    if (cue && newTasks[i] && !shownCues.has(taskName)) {
      setShownCues((prev) => new Set([...prev, taskName]));
    }
  }

  function startRecording() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setNotes((n) => (n ? n + "\n" : "") + "[Voice dictation requires Chrome, allow microphone and try again.]");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onresult = (e: any) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) setNotes((n) => n + final + " ");
    };
    rec.onerror = () => stopRecording();
    rec.onend = () => stopRecording();
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
  }

  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", position: "relative" }}>

      {/* ── Header ── */}
      <div style={{ background: "rgba(15,29,52,0.98)", padding: "12px 16px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Active Visit</div>
            <div style={{ color: COLORS.g2, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>⏱ {formatTime(elapsed)}</div>
          </div>
          <button onClick={onSOS} style={{ background: COLORS.red, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, padding: "5px 10px", cursor: "pointer" }}>SOS</button>
        </div>

        {/* Client + AI button */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {client.name.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{client.name}</div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Age {client.age} · {client.condition}</div>
          </div>
          <button onClick={onAssistant} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</button>
        </div>

        {/* Persistent controls row */}
        <div style={{ display: "flex", gap: 8, marginTop: 9, alignItems: "center" }}>
          <button onClick={() => setIsLone((l) => !l)} style={{ background: isLone ? "rgba(255,90,95,0.2)" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 99, padding: "5px 12px", color: isLone ? COLORS.red : COLORS.g2, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {isLone ? "🔴 Lone Worker" : "Lone Worker"}
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: fluidGlasses >= 6 ? "rgba(34,197,94,0.12)" : "rgba(79,209,197,0.1)", borderRadius: 99, padding: "4px 10px", border: `1px solid ${fluidGlasses >= 6 ? "rgba(34,197,94,0.3)" : "rgba(79,209,197,0.25)"}` }}>
            <span style={{ fontSize: 13 }}>💧</span>
            <span style={{ color: fluidGlasses >= 6 ? COLORS.green : COLORS.teal, fontWeight: 700, fontSize: 13, minWidth: 14, textAlign: "center" }}>{fluidGlasses}</span>
            <button onClick={() => setFluidGlasses((g) => Math.min(12, g + 1))} style={{ width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
          </div>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: "rgba(246,183,60,0.9)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>📵</span>
          <span style={{ color: "#1B2A49", fontWeight: 700, fontSize: 12 }}>Offline, data will sync when reconnected</span>
        </div>
      )}

      {/* Lone worker banner */}
      {isLone && (
        <div style={{ background: loneOverdue ? COLORS.red : "rgba(255,90,95,0.18)", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{loneOverdue ? "⚠ Check-in overdue!" : "Lone Worker Active"}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>{formatTime(loneElapsed)} since last check-in</div>
          </div>
          <button onClick={() => setLoneElapsed(0)} style={{ background: "#fff", border: "none", borderRadius: 8, color: COLORS.red, fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Check In ✓</button>
        </div>
      )}

      {/* ── Mood Capture ── */}
      {!moodSet ? (
        <div style={{ padding: "10px 14px 8px", background: "rgba(79,209,197,0.05)", borderBottom: "1px solid rgba(79,209,197,0.12)", flexShrink: 0 }}>
          <div style={{ color: COLORS.teal, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>How does {firstName} seem right now?</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ emoji: "😊", label: "Good" }, { emoji: "😐", label: "Neutral" }, { emoji: "😔", label: "Low" }, { emoji: "😰", label: "Anxious" }, { emoji: "😴", label: "Tired" }].map((m) => (
              <button key={m.label} onClick={() => { setMood(m.label); setMoodSet(true); }}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "7px 2px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>{m.emoji}</span>
                <span style={{ color: COLORS.g2, fontSize: 9, fontFamily: "DM Sans, sans-serif" }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "5px 14px", background: "rgba(34,197,94,0.06)", borderBottom: "1px solid rgba(34,197,94,0.1)", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>✓</span>
          <span style={{ color: COLORS.green, fontSize: 11, fontWeight: 600 }}>Mood at visit start: {mood}</span>
          <button onClick={() => setMoodSet(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: COLORS.g3, fontSize: 10, cursor: "pointer", padding: 0 }}>edit</button>
        </div>
      )}

      {/* ── Single scroll content ── */}
      <div className="phone-scroll" style={{ flex: 1, padding: "12px 14px 110px", display: "flex", flexDirection: "column", gap: 0 }}>

        {/* SECTION 1: Care Tasks */}
        <div style={{ color: COLORS.g3, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>CARE TASKS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
          {VISIT_TASKS.map((task, i) => {
            const cue = (client.contextualCues as { trigger: string; content: string }[])?.find((c) => c.trigger === task);
            const cueShown = shownCues.has(task);
            return (
              <div key={task}>
                <div onClick={() => handleTaskCheck(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "rgba(255,255,255,0.06)", borderRadius: tasks[i] && !(i === MEAL_TASK_IDX && showMealPrompt && !mealPromptDismissed) ? 12 : "12px 12px 0 0", cursor: "pointer", borderBottom: tasks[i] && (i === MEAL_TASK_IDX && showMealPrompt && !mealPromptDismissed || cueShown) ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className={`task-check ${tasks[i] ? "checked" : ""}`}>
                    {tasks[i] && <svg width="12" height="9" viewBox="0 0 12 9"><polyline points="1,5 4,8 11,1" fill="none" stroke={COLORS.darkNavy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span style={{ color: tasks[i] ? COLORS.g3 : COLORS.g1, fontSize: 13, textDecoration: tasks[i] ? "line-through" : "none", flex: 1 }}>{task}</span>
                  {tasks[i] && cue && <span style={{ color: COLORS.teal, fontSize: 11 }}>💡</span>}
                </div>

                {/* Inline meal prompt */}
                {i === MEAL_TASK_IDX && tasks[i] && showMealPrompt && !mealPromptDismissed && mealStatus === "" && (
                  <div className="fade-in" style={{ padding: "10px 14px 12px", background: "rgba(246,183,60,0.07)", borderRadius: "0 0 12px 12px", border: "1px solid rgba(246,183,60,0.18)", borderTop: "none" }}>
                    <div style={{ color: COLORS.amber, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>How much did {firstName} eat?</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["Full", "Half", "Refused"] as const).map((opt) => (
                        <button key={opt} onClick={() => { setMealStatus(opt); setShowMealPrompt(false); setMealPromptDismissed(true); }}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${opt === "Full" ? "rgba(34,197,94,0.4)" : opt === "Half" ? "rgba(246,183,60,0.4)" : "rgba(255,90,95,0.4)"}`, background: opt === "Full" ? "rgba(34,197,94,0.1)" : opt === "Half" ? "rgba(246,183,60,0.1)" : "rgba(255,90,95,0.1)", color: opt === "Full" ? COLORS.green : opt === "Half" ? COLORS.amber : COLORS.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                          {opt === "Full" ? "🍽 Full" : opt === "Half" ? "🍴 Half" : "✗ Refused"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Meal status confirmed badge */}
                {i === MEAL_TASK_IDX && tasks[i] && mealStatus !== "" && (
                  <div style={{ padding: "5px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "0 0 10px 10px", borderTop: "none", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: mealStatus === "Full" ? COLORS.green : mealStatus === "Half" ? COLORS.amber : COLORS.red, fontSize: 11, fontWeight: 600 }}>
                      {mealStatus === "Full" ? "🍽 Full meal eaten" : mealStatus === "Half" ? "🍴 Half portion eaten" : "✗ Meal refused, note in care notes"}
                    </span>
                  </div>
                )}

                {/* Contextual care plan cue */}
                {tasks[i] && cueShown && cue && !(i === MEAL_TASK_IDX && showMealPrompt && !mealPromptDismissed) && (
                  <div className="fade-in" style={{ margin: "0 0 0 0", padding: "8px 14px 10px 44px", background: "rgba(79,209,197,0.05)", border: "1px solid rgba(79,209,197,0.18)", borderTop: "none", borderRadius: mealStatus !== "" || i !== MEAL_TASK_IDX ? "0 0 12px 12px" : "0 0 12px 12px" }}>
                    <div style={{ color: COLORS.teal, fontSize: 10, fontWeight: 700, marginBottom: 3, letterSpacing: 0.5 }}>💡 CARE GUIDANCE</div>
                    <div style={{ color: COLORS.g2, fontSize: 12, lineHeight: 1.5 }}>{cue.content}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick record links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10, marginBottom: 6 }}>
          <div onClick={onBodyMap} style={{ background: "rgba(255,90,95,0.07)", borderRadius: 11, padding: "10px 12px", cursor: "pointer", border: "1px solid rgba(255,90,95,0.15)" }}>
            <span style={{ fontSize: 16 }}>🫀</span>
            <div style={{ color: COLORS.red, fontWeight: 600, fontSize: 11, marginTop: 3 }}>Body Map</div>
          </div>
          <div onClick={onCarePlan} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 11, padding: "10px 12px", cursor: "pointer" }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <div style={{ color: COLORS.g1, fontWeight: 600, fontSize: 11, marginTop: 3 }}>Care Plan</div>
          </div>
          <div onClick={onEmergency} style={{ background: "rgba(255,90,95,0.07)", borderRadius: 11, padding: "10px 12px", cursor: "pointer", gridColumn: "span 2", display: "flex", gap: 8, alignItems: "center", border: "1px solid rgba(255,90,95,0.15)" }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <div style={{ color: COLORS.red, fontWeight: 600, fontSize: 11 }}>Emergency Contacts</div>
          </div>
        </div>

        {/* Inline incident flag button */}
        <button onClick={() => { setShowInlineIncident(true); setIncidentDone(false); setIncidentSeverity(""); setIncidentType(""); setIncidentNote(""); }}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 11, border: "1px solid rgba(246,183,60,0.25)", background: "rgba(246,183,60,0.06)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 2, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>⚑</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: COLORS.amber, fontWeight: 600, fontSize: 12 }}>Flag an Incident</div>
            <div style={{ color: COLORS.g3, fontSize: 10 }}>Falls, skin changes, behaviour, safeguarding</div>
          </div>
        </button>

        {/* SECTION 2: Medications Due */}
        <div style={{ color: COLORS.g3, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>MEDICATIONS DUE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {client.meds.map((med) => (
            <div key={med.name} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, border: medStatus[med.name] ? `1px solid ${medStatus[med.name] === "taken" ? COLORS.green : COLORS.amber}` : "1px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: medStatus[med.name] ? 6 : 8 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{med.name} {med.dose}</div>
                  <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 1 }}>{med.adminNote}</div>
                </div>
                {medStatus[med.name] && (
                  <Badge color={medStatus[med.name] === "taken" ? COLORS.green : COLORS.amber} bg={medStatus[med.name] === "taken" ? "rgba(34,197,94,0.15)" : "rgba(246,183,60,0.15)"}>
                    {medStatus[med.name] === "taken" ? "✓ Taken" : "⚠ Refused"}
                  </Badge>
                )}
              </div>
              {!medStatus[med.name] && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setMedStatus((s) => ({ ...s, [med.name]: "taken" }))} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)", color: COLORS.green, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>✓ Taken</button>
                  <button onClick={() => { setShowRefusalFor(med.name); setRefusalReason(""); setRefusalWhatSaid(""); setRefusalAction(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1px solid rgba(246,183,60,0.4)", background: "rgba(246,183,60,0.1)", color: COLORS.amber, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>✗ Refused</button>
                </div>
              )}
            </div>
          ))}
          {!allMedsAcknowledged && (
            <div style={{ background: "rgba(246,183,60,0.08)", borderRadius: 9, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span style={{ color: COLORS.amber, fontSize: 11 }}>Acknowledge all medications before completing visit.</span>
            </div>
          )}
        </div>

        {/* SECTION 3: Care Notes */}
        <div style={{ color: COLORS.g3, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>CARE NOTES</div>

        {/* Vital Signs, contextual: only for Tom */}
        {client.vitalSignsRequired && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", borderLeft: `3px solid ${COLORS.teal}`, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>🩺</span>
              <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 13 }}>Vital Signs</div>
              {vitalsSaved && <span style={{ marginLeft: "auto", color: COLORS.green, fontSize: 11, fontWeight: 700 }}>✓ Recorded</span>}
            </div>
            {(client.vitalSignsThreshold as string) && (
              <div style={{ background: "rgba(255,90,95,0.1)", borderRadius: 8, padding: "6px 10px", marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>⚠️</span>
                <span style={{ color: COLORS.red, fontSize: 11, fontWeight: 600 }}>{client.vitalSignsThreshold as string}</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { label: "Systolic (mmHg)", val: bpSys, set: setBpSys, placeholder: "e.g. 128" },
                { label: "Diastolic (mmHg)", val: bpDia, set: setBpDia, placeholder: "e.g. 82" },
                { label: "Pulse (bpm)", val: pulse, set: setPulse, placeholder: "e.g. 72" },
                { label: "O₂ Sat (%)", val: o2sat, set: setO2sat, placeholder: "e.g. 97" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <div style={{ color: COLORS.g3, fontSize: 10, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                  <input type="number" value={val} onChange={(e) => { set(e.target.value); setVitalsSaved(false); }} placeholder={placeholder}
                    style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 9px", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, outline: "none" }} />
                </div>
              ))}
            </div>
            {bpSys && bpDia && (parseInt(bpSys) > 140 || parseInt(bpDia) > 90) && (
              <div style={{ background: "rgba(255,90,95,0.12)", border: "1px solid rgba(255,90,95,0.3)", borderRadius: 8, padding: "6px 10px", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>⚠️</span>
                <span style={{ color: COLORS.red, fontSize: 11, fontWeight: 700 }}>BP elevated, notify office immediately</span>
              </div>
            )}
            <button onClick={() => { if (bpSys && bpDia) setVitalsSaved(true); }} disabled={!bpSys || !bpDia}
              style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none", background: bpSys && bpDia ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.08)", color: bpSys && bpDia ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700, cursor: bpSys && bpDia ? "pointer" : "not-allowed" }}>
              {vitalsSaved ? "✓ Vitals Saved" : "Save Vitals"}
            </button>
          </div>
        )}

        {/* Fluid & Nutrition full card */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", borderLeft: `3px solid ${COLORS.amber}`, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>💧</span>
            <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 13 }}>Fluid & Nutrition</div>
            {mealStatus && <Badge color={mealStatus === "Full" ? COLORS.green : mealStatus === "Half" ? COLORS.amber : COLORS.red} bg={mealStatus === "Full" ? "rgba(34,197,94,0.12)" : mealStatus === "Half" ? "rgba(246,183,60,0.12)" : "rgba(255,90,95,0.12)"}>{mealStatus === "Full" ? "🍽 Full" : mealStatus === "Half" ? "🍴 Half" : "✗ Refused"}</Badge>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Fluid intake (glasses)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <button onClick={() => setFluidGlasses((g) => Math.max(0, g - 1))} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ color: fluidGlasses >= 6 ? COLORS.green : COLORS.amber, fontWeight: 700, fontSize: 17, minWidth: 20, textAlign: "center" }}>{fluidGlasses}</span>
              <button onClick={() => setFluidGlasses((g) => Math.min(12, g + 1))} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, height: 5, marginBottom: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (fluidGlasses / 8) * 100)}%`, background: fluidGlasses >= 6 ? COLORS.green : COLORS.amber, borderRadius: 8, transition: "width 0.3s" }} />
          </div>
          <div style={{ color: COLORS.g3, fontSize: 11 }}>Target: 6–8 glasses · {fluidGlasses >= 6 ? "✓ Target reached" : `${8 - fluidGlasses} more to go`}</div>
          {!mealStatus && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: COLORS.g2, fontSize: 11, marginBottom: 6 }}>Meal completion</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["Full", "Half", "Refused"] as const).map((opt) => (
                  <button key={opt} onClick={() => setMealStatus(opt)} style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: `1px solid rgba(255,255,255,0.12)`, background: "rgba(255,255,255,0.04)", color: COLORS.g2, fontSize: 11, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                    {opt === "Full" ? "🍽 Full" : opt === "Half" ? "🍴 Half" : "✗ Refused"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Care Notes dictation */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Care Notes</div>
            <button onClick={isRecording ? stopRecording : startRecording}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, border: "none", background: isRecording ? `linear-gradient(90deg, ${COLORS.red}, #cc1a20)` : `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: isRecording ? "#fff" : COLORS.darkNavy, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {isRecording ? `⏺ ${recordingTime}s` : "🎤 Dictate"}
            </button>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tap Dictate or type care notes here…" rows={4}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, resize: "none", outline: "none" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
            {["Mood", "Appetite", "Mobility", "Skin"].map((chip) => (
              <button key={chip} onClick={() => setNotes((n) => n + (n ? " " : "") + chip + ": ")}
                style={{ padding: "4px 9px", borderRadius: 99, border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.07)", color: COLORS.teal, fontSize: 11, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>+ {chip}</button>
            ))}
          </div>
        </div>

        {/* SECTION 4: Previous Visits (collapsible) */}
        <button onClick={() => setShowPrevVisits((v) => !v)}
          style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: COLORS.g2, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Previous Visits</span>
          <span>{showPrevVisits ? "▾" : "▸"}</span>
        </button>
        {showPrevVisits && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {CARE_HISTORY.map((visit, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: COLORS.teal, fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{visit.date}</div>
                <div style={{ color: COLORS.g2, fontSize: 12, lineHeight: 1.5 }}>{visit.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Complete Visit button */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={allMedsAcknowledged ? () => onComplete({
            notes,
            confirmedMeds: client.meds.filter(m => medStatus[m.name] === "taken").map(m => `${m.name} ${m.dose}`),
            skippedMeds: client.meds.filter(m => medStatus[m.name] === "refused").map(m => `${m.name} ${m.dose}`),
            fluidMl: fluidGlasses * 250,
            completedTasks: VISIT_TASKS.filter((_, i) => tasks[i]),
            mealStatus,
            mood,
          }) : undefined}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: allMedsAcknowledged ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.1)", color: allMedsAcknowledged ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: allMedsAcknowledged ? "pointer" : "not-allowed" }}
        >
          {allMedsAcknowledged ? "Complete Visit →" : `Confirm medications (${Object.keys(medStatus).length}/${client.meds.length})`}
        </button>
      </div>

      {/* Medication Refusal Modal */}
      {showRefusalFor && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 50 }}>
          <div style={{ background: COLORS.navy, borderRadius: "20px 20px 0 0", padding: 20, animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff", marginBottom: 4 }}>Medication Refusal Log</div>
            <div style={{ color: COLORS.amber, fontSize: 12, marginBottom: 16 }}>{showRefusalFor}, This will be logged to the CQC audit trail</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>REASON *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Client refused", "Asleep", "Unable to swallow", "Nausea / vomiting", "Other"].map((r) => (
                    <button key={r} onClick={() => setRefusalReason(r)} style={{ padding: "5px 10px", borderRadius: 99, border: `1px solid ${refusalReason === r ? COLORS.amber : "rgba(255,255,255,0.12)"}`, background: refusalReason === r ? "rgba(246,183,60,0.15)" : "transparent", color: refusalReason === r ? COLORS.amber : COLORS.g2, fontSize: 11, fontWeight: refusalReason === r ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>WHAT DID THE CLIENT SAY? <span style={{ color: COLORS.g3, fontWeight: 400 }}>(optional)</span></label>
                <input value={refusalWhatSaid} onChange={(e) => setRefusalWhatSaid(e.target.value)} placeholder="e.g. 'I don't want it today'…"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>ACTION TAKEN *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {["Contacted supervisor", "Left note for next carer", "Will offer at next dose", "No action required"].map((a) => (
                    <button key={a} onClick={() => setRefusalAction(a)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${refusalAction === a ? COLORS.teal : "rgba(255,255,255,0.1)"}`, background: refusalAction === a ? "rgba(79,209,197,0.1)" : "transparent", color: refusalAction === a ? COLORS.teal : COLORS.g2, textAlign: "left", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: refusalAction === a ? 600 : 400 }}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowRefusalFor(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
              <button onClick={() => { if (refusalReason && refusalAction) { setMedStatus((s) => ({ ...s, [showRefusalFor!]: "refused" })); setShowRefusalFor(null); } }}
                style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: refusalReason && refusalAction ? COLORS.amber : "rgba(255,255,255,0.08)", color: refusalReason && refusalAction ? COLORS.darkNavy : COLORS.g3, fontSize: 13, fontWeight: 700, cursor: refusalReason && refusalAction ? "pointer" : "not-allowed", fontFamily: "DM Sans, sans-serif" }}>Log Refusal</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Incident Flag Bottom Sheet */}
      {showInlineIncident && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 50 }} onClick={(e) => { if (e.target === e.currentTarget && !incidentDone) setShowInlineIncident(false); }}>
          <div style={{ background: COLORS.navy, borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "80%", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
            {incidentDone ? (
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Incident Flagged</div>
                <div style={{ color: COLORS.amber, fontSize: 13, marginBottom: 6 }}>Ref: INC-{Date.now().toString().slice(-6)}</div>
                <div style={{ color: COLORS.g2, fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>Your supervisor has been notified. This is logged to the CQC audit trail.</div>
                <button onClick={() => setShowInlineIncident(false)} style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18, color: "#fff", marginBottom: 4 }}>Report Incident</div>
                <div style={{ color: COLORS.g2, fontSize: 12, marginBottom: 16 }}>This will be logged to supervisor and CQC audit trail immediately.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>SEVERITY</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[{ label: "Low", color: COLORS.green }, { label: "Medium", color: COLORS.amber }, { label: "High", color: COLORS.red }].map((s) => (
                        <button key={s.label} onClick={() => setIncidentSeverity(s.label)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${incidentSeverity === s.label ? s.color : "rgba(255,255,255,0.12)"}`, background: incidentSeverity === s.label ? `${s.color}22` : "transparent", color: incidentSeverity === s.label ? s.color : COLORS.g2, fontWeight: incidentSeverity === s.label ? 700 : 400, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>INCIDENT TYPE</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {["Fall", "Medication error", "Skin change", "Behaviour", "Safeguarding", "Other"].map((t) => (
                        <button key={t} onClick={() => setIncidentType(t)}
                          style={{ padding: "5px 11px", borderRadius: 99, border: `1px solid ${incidentType === t ? COLORS.amber : "rgba(255,255,255,0.12)"}`, background: incidentType === t ? "rgba(246,183,60,0.15)" : "transparent", color: incidentType === t ? COLORS.amber : COLORS.g2, fontSize: 11, fontWeight: incidentType === t ? 700 : 400, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: COLORS.g2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>BRIEF DESCRIPTION <span style={{ color: COLORS.g3, fontWeight: 400 }}>(optional)</span></label>
                    <textarea value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} placeholder="What happened? What action did you take?" rows={3}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, outline: "none", resize: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => setShowInlineIncident(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: COLORS.g2, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
                  <button onClick={() => { if (incidentSeverity && incidentType) setIncidentDone(true); }}
                    style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: incidentSeverity && incidentType ? COLORS.amber : "rgba(255,255,255,0.08)", color: incidentSeverity && incidentType ? COLORS.darkNavy : COLORS.g3, fontSize: 13, fontWeight: 700, cursor: incidentSeverity && incidentType ? "pointer" : "not-allowed", fontFamily: "DM Sans, sans-serif" }}>Flag Incident</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CAREiAssistantModal({ onClose, clientName }: { onClose: () => void; clientName?: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const suggestions = ["Mood trend", "Medication history", "Recent concerns"];

  async function handleSend(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    const contextName = clientName || "this client";
    setMessages((m) => [...m, {
      role: "assistant",
      content: text.toLowerCase().includes("mood")
        ? `Mood trend for ${contextName}: Yesterday recorded as neutral. Last week showed two positive days. Consider monitoring closely given recent withdrawal signs.`
        : text.toLowerCase().includes("medication")
        ? `Medication history: All scheduled medications taken on time over the past 7 days. No missed doses recorded. Last confirmed: yesterday at 10:00.`
        : text.toLowerCase().includes("concern")
        ? `Recent concerns logged: Mild mobility reduction noted 2 days ago. Supervisor informed. No escalation required at this time.`
        : `Yesterday at 12:15, lunch was completed for ${contextName}. Mood recorded as neutral. No incidents logged.`,
    }]);
    setLoading(false);
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="slide-up" style={{ background: COLORS.navy, borderRadius: "22px 22px 0 0", padding: "16px 18px 32px", maxHeight: "78%", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.2)", margin: "0 auto 4px" }} />
        {/* Title bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>✦ CAREi Assistant</div>
            {clientName && <div style={{ color: COLORS.g2, fontSize: 12 }}>Context: {clientName}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: COLORS.g2, fontSize: 13, padding: "6px 12px", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>✕ Close</button>
        </div>
        {/* Messages */}
        {messages.length > 0 && (
          <div className="phone-scroll" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", background: m.role === "user" ? `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.08)", borderRadius: 12, padding: "8px 12px", color: m.role === "user" ? COLORS.darkNavy : COLORS.g0, fontSize: 13, lineHeight: 1.5 }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 12, width: "fit-content" }}>
                {[0, 1, 2].map((d) => <div key={d} className={`dot-${d + 1}`} style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.teal }} />)}
              </div>
            )}
          </div>
        )}
        {/* Suggestion chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suggestions.map((s) => (
            <button key={s} onClick={() => handleSend(s)} style={{ padding: "6px 12px", borderRadius: 99, border: "1px solid rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.1)", color: "#93C5FD", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>{s}</button>
          ))}
        </div>
        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend(input)} placeholder="Ask about this client…" style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, outline: "none" }} />
          <button onClick={() => handleSend(input)} style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>
    </div>
  );
}

function ContinuCareSummaryScreen({
  client,
  onDone,
  visitData,
}: {
  client: typeof SCHEDULE_CLIENTS[0];
  onDone: () => void;
  visitData?: VisitData;
}) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ observations: "", medication: "", riskSignals: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    function buildMedText() {
      if (visitData?.confirmedMeds?.length || visitData?.skippedMeds?.length) {
        const lines: string[] = [];
        (visitData.confirmedMeds ?? []).forEach(m => lines.push(`${m}, given ✓`));
        (visitData.skippedMeds ?? []).forEach(m => lines.push(`${m}, not given ⚠️`));
        return lines.join("\n");
      }
      return client.meds.map(m => `${m.name} ${m.dose}, taken ✓`).join("\n");
    }

    function buildFallback() {
      const parts: string[] = [];
      if (visitData?.mood) parts.push(`Mood at visit start: ${visitData.mood}.`);
      if (visitData?.completedTasks?.length) parts.push(`Tasks completed: ${visitData.completedTasks.join(", ")}.`);
      if (visitData?.mealStatus) parts.push(`Meal intake: ${visitData.mealStatus}.`);
      if (visitData?.fluidMl) parts.push(`Fluid intake: ${visitData.fluidMl}ml.`);
      if (visitData?.notes?.trim()) parts.push(`Carer's notes: "${visitData.notes.trim()}"`);
      const obs = parts.length ? parts.join("\n") : `Visit with ${client.name} completed. Personal care carried out as per care plan.`;
      const risk = visitData?.notes?.trim()
        ? `From carer's notes: "${visitData.notes.trim().slice(0, 180)}"`
        : "No risk signals or concerns recorded this visit.";
      setSummary({ observations: obs, medication: buildMedText(), riskSignals: risk });
      setLoading(false);
    }

    async function generate() {
      try {
        const response = await fetch("/api/anthropic/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client,
            visitDate: new Date().toLocaleDateString("en-GB"),
            notes: visitData?.notes ?? "",
            confirmedMeds: visitData?.confirmedMeds ?? [],
            skippedMeds: visitData?.skippedMeds ?? [],
            fluidMl: visitData?.fluidMl ?? 0,
            completedTasks: visitData?.completedTasks ?? [],
            mealStatus: visitData?.mealStatus ?? "",
            mood: visitData?.mood ?? "",
          }),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setSummary({
          observations: data.summary ?? "",
          medication: buildMedText(),
          riskSignals: visitData?.notes?.trim()
            ? `Carer's own notes: "${visitData.notes.trim().slice(0, 200)}"`
            : "No concerns or risk signals recorded this visit.",
        });
      } catch {
        buildFallback();
      } finally {
        setLoading(false);
      }
    }

    generate();
  }, []);

  if (submitted) {
    return (
      <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 32 }}>
        <div className="fade-in" style={{ textAlign: "center", width: "100%" }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill={COLORS.teal} />
            <polyline points="20,37 30,47 52,24" fill="none" stroke={COLORS.darkNavy} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 22, marginTop: 16 }}>Shift Complete</div>
          <div style={{ color: COLORS.teal, fontSize: 14, marginTop: 6 }}>ContinuCare+ Summary Submitted ✓</div>
          <div style={{ marginTop: 12, background: "rgba(34,197,94,0.12)", borderRadius: 10, padding: "8px 16px", display: "inline-block" }}>
            <span style={{ color: COLORS.green, fontWeight: 700, fontSize: 12 }}>CQC AUDIT TRAIL, COMPLETE</span>
          </div>
          <button onClick={onDone} style={{ marginTop: 24, padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "DM Sans, sans-serif", width: "100%", display: "block" }}>
            Return to Today's Care
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <Badge color={COLORS.teal} bg="rgba(79,209,197,0.15)">AI Generated ContinuCare+</Badge>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff", marginTop: 8 }}>Shift Summary</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 2 }}>{client.name} · {new Date().toLocaleDateString("en-GB")}</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: COLORS.teal, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 3 }}>{[0, 1, 2].map((d) => <div key={d} className={`dot-${d + 1}`} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.teal }} />)}</div>
              Generating AI summary…
            </div>
            {[85, 70, 90, 60, 80].map((w, i) => <div key={i} style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,0.08)", width: `${w}%` }} />)}
          </div>
        ) : (
          <>
            {[
              { title: "Observations", icon: "📝", content: summary.observations, color: COLORS.teal },
              { title: "Medication", icon: "💊", content: summary.medication, color: COLORS.green },
              { title: "Risk Signals", icon: "⚠️", content: summary.riskSignals, color: COLORS.amber },
            ].map((section) => (
              <div key={section.title} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{section.icon}</span>
                  <div style={{ color: section.color, fontWeight: 700, fontSize: 13 }}>{section.title}</div>
                </div>
                <div style={{ color: COLORS.g1, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{section.content}</div>
              </div>
            ))}
            <button onClick={() => setSubmitted(true)} style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
              Submit & End Shift →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OperationsScreen({
  visitStatuses,
  onSchedule,
  onBack,
}: {
  visitStatuses: Record<string, string>;
  onSchedule: () => void;
  onBack: () => void;
}) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: COLORS.amber },
    "in-progress": { label: "In Progress", color: COLORS.teal },
    completed: { label: "Completed", color: COLORS.green },
  };

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 18px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Manager View</div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff" }}>Operations</div>
          </div>
          <button onClick={onBack} style={{ padding: "6px 12px", borderRadius: 99, border: "1px solid rgba(79,209,197,0.4)", background: "rgba(79,209,197,0.1)", color: COLORS.teal, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>← Carer View</button>
        </div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Analytics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Visits Today", value: "3", color: COLORS.teal },
            { label: "Compliance", value: "94%", color: COLORS.green },
            { label: "Escalations", value: "0", color: COLORS.amber },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ color: s.color, fontWeight: 700, fontSize: 18 }}>{s.value}</div>
              <div style={{ color: COLORS.g2, fontSize: 10, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Live Visit Status */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
          <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Live Visit Status</div>
          {SCHEDULE_CLIENTS.map((client) => {
            const status = visitStatuses[client.id] || "pending";
            const cfg = statusConfig[status] || statusConfig.pending;
            return (
              <div key={client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{client.name}</div>
                  <div style={{ color: COLORS.g2, fontSize: 11 }}>{client.time}</div>
                </div>
                <Badge color={cfg.color} bg={`${cfg.color}22`}>{cfg.label}</Badge>
              </div>
            );
          })}
        </div>
        {/* Alerts Panel */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
          <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Alerts Panel</div>
          {[
            { label: "Missed Medications", value: 1, color: COLORS.red },
            { label: "Low Mood Flags", value: 2, color: COLORS.amber },
          ].map((alert) => (
            <div key={alert.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ color: COLORS.g1, fontSize: 13 }}>{alert.label}</div>
              <div style={{ background: alert.color, color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 99, padding: "2px 10px" }}>{alert.value}</div>
            </div>
          ))}
        </div>
        {/* Manage Schedule */}
        <button onClick={onSchedule} style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          📅 Manage Schedule →
        </button>
      </div>
    </div>
  );
}

function ScheduleScreen({
  assignedCarers,
  onAssign,
  onBack,
}: {
  assignedCarers: Record<string, string>;
  onAssign: (clientId: string, carer: string) => void;
  onBack: () => void;
}) {
  const CARERS = ["Sarah", "John", "Amina", "Unassigned"];

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 18px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff" }}>Schedule</div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Today's visits · Adjoy Healthcare</div>
          </div>
        </div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {SCHEDULE_CLIENTS.map((client) => {
          const assigned = assignedCarers[client.id] || "Unassigned";
          const isAssigned = assigned !== "Unassigned";
          return (
            <div key={client.id} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, border: `1px solid ${isAssigned ? "rgba(79,209,197,0.2)" : "rgba(246,183,60,0.2)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{client.name}</div>
                  <div style={{ color: COLORS.g2, fontSize: 12 }}>{client.time} · Age {client.age}</div>
                </div>
                <Badge color={isAssigned ? COLORS.teal : COLORS.amber} bg={isAssigned ? "rgba(79,209,197,0.12)" : "rgba(246,183,60,0.12)"}>
                  {isAssigned ? "✓ Assigned" : "Unassigned"}
                </Badge>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ color: COLORS.g2, fontSize: 12, whiteSpace: "nowrap" }}>Assign to:</div>
                <select value={assigned} onChange={(e) => onAssign(client.id, e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, outline: "none", cursor: "pointer" }}>
                  {CARERS.map((c) => <option key={c} value={c} style={{ background: "#1B2A49" }}>{c}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        <div style={{ background: "rgba(79,209,197,0.08)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(79,209,197,0.2)" }}>
          <div style={{ color: COLORS.teal, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ℹ️ Scheduling note</div>
          <div style={{ color: COLORS.g2, fontSize: 12, lineHeight: 1.5 }}>Assigning a carer will add the visit to their Today's Care view and trigger the care workflow.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function CAREiApp() {
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      const saved = sessionStorage.getItem("carei_screen") as Screen;
      const account = sessionStorage.getItem("carei_account");
      const valid: Screen[] = ["today","client-overview","active-visit","medication","handover","continucare-summary","care-plan","bodymap","emergency","visit-history","incident-report","rota","operations","schedule","family","family-summary","manager-approvals","copilot","profile","admin","admin-dashboard"];
      return (account && valid.includes(saved)) ? saved : "splash";
    } catch {
      return "splash";
    }
  });
  const [showSOS, setShowSOS] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string>("mary");
  const [visitStatuses, setVisitStatuses] = useState<Record<string, string>>({
    mary: "completed",
    tom: "in-progress",
    aisha: "pending",
  });
  const [assignedCarers, setAssignedCarers] = useState<Record<string, string>>({
    mary: "Sarah",
    tom: "Sarah",
    aisha: "Sarah",
  });
  const [visitReturnScreen, setVisitReturnScreen] = useState<Screen>("active-visit");
  const [summaryApproval, setSummaryApproval] = useState<"pending" | "approved">("pending");
  const [summaryReadAt, setSummaryReadAt] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [carerName, setCarerName] = useState("Sarah Johnson");
  const [carerEmail, setCarerEmail] = useState<string>(() => {
    try { const a = sessionStorage.getItem("carei_account"); return a ? (JSON.parse(a).email ?? "") : ""; } catch { return ""; }
  });
  const [showDevNav, setShowDevNav] = useState(false);
  const [carerAgency, setCarerAgency] = useState<string>(() => {
    try { const a = sessionStorage.getItem("carei_account"); return a ? (JSON.parse(a).agency ?? "") : ""; } catch { return ""; }
  });
  const [lastVisitData, setLastVisitData] = useState<VisitData | undefined>(undefined);
  const [visitMedStatus, setVisitMedStatus] = useState<Record<string, "taken" | "refused" | undefined>>({});
  const [visitTasks, setVisitTasks] = useState([false, false, false]);
  const [visitNotes, setVisitNotes] = useState("");
  const [visitFluidGlasses, setVisitFluidGlasses] = useState(0);
  const [visitMood, setVisitMood] = useState("");
  const [visitMoodSet, setVisitMoodSet] = useState(false);

  useEffect(() => {
    const up = () => { setIsOffline(false); setQueuedCount(0); };
    const dn = () => { setIsOffline(true); };
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  useEffect(() => {
    if (isOffline) {
      const t = setTimeout(() => setQueuedCount((n) => n + 1), 4000);
      return () => clearTimeout(t);
    }
  }, [isOffline, queuedCount]);

  function nav(s: Screen) {
    setScreen(s);
    setShowSOS(false);
    setShowAssistant(false);
    try { sessionStorage.setItem("carei_screen", s); } catch {}
  }

  function renderScreen() {
    switch (screen) {
      case "splash":
        return <SplashScreen onSignUp={() => nav("signup")} onLogin={() => nav("login")} />;
      case "otp":
      case "signup":
        return <SignUpScreen onNext={(name, agency, email) => { setCarerName(name); setCarerAgency(agency); setCarerEmail(email); nav("today"); }} onLogin={() => nav("login")} />;
      case "login":
        return <LoginScreen onNext={(name, agency, email) => { setCarerName(name); setCarerAgency(agency); setCarerEmail(email); nav("today"); }} onSignUp={() => nav("signup")} />;
      case "copilot":
        return <CopilotScreen onBack={() => nav("today")} />;
      case "medication":
        return <MedicationScreen onNext={() => nav("today")} />;
      case "profile":
        return <ProfileScreen onSignOut={() => nav("otp")} carerName={carerName} carerEmail={carerEmail} />;
      case "family": {
        const familyClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return <FamilyPortalScreen onBack={() => nav("today")} onSummary={() => nav("family-summary")} carerName={carerName} client={familyClient} />;
      }
      case "family-summary": {
        const familyClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return (
          <FamilySummaryScreen
            onBack={() => nav("family")}
            approvalStatus={summaryApproval}
            onRead={() => { if (!summaryReadAt) setSummaryReadAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); }}
            carerName={carerName}
            carerAgency={carerAgency}
            client={familyClient}
          />
        );
      }
      case "manager-approvals":
        return (
          <ManagerApprovalsScreen
            approvalStatus={summaryApproval}
            onApprove={() => setSummaryApproval("approved")}
            summaryReadAt={summaryReadAt}
            onBack={() => nav("admin")}
            carerName={carerName}
          />
        );
      case "bodymap": {
        const bClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return <BodyMapScreen clientName={bClient.name} onBack={() => nav(visitReturnScreen)} />;
      }
      case "visit-history": {
        const vhClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return <VisitHistoryScreen clientName={vhClient.name} onBack={() => nav("today")} />;
      }
      case "care-plan": {
        const cpClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return <CarePlanScreen client={cpClient} onBack={() => nav(visitReturnScreen)} />;
      }
      case "emergency":
        return <EmergencyContactsScreen onBack={() => nav(visitReturnScreen)} carerAgency={carerAgency} />;
      case "admin":
        return (
          <AdminTeaserScreen
            onBack={() => nav("today")}
            onOpenAdmin={() => nav("admin-dashboard")}
            visitStatuses={visitStatuses}
            onSchedule={() => nav("schedule")}
            onManagerApprovals={() => nav("manager-approvals")}
            pendingApprovals={summaryApproval === "pending" ? 1 : 0}
          />
        );
      case "admin-dashboard":
        return null;
      case "today":
        return (
          <TodayCareScreen
            visitStatuses={visitStatuses}
            onSelectClient={(id) => { setActiveClientId(id); nav("client-overview"); }}
            onOperations={() => nav("operations")}
            onRota={() => nav("rota")}
            onAssistant={() => setShowAssistant(true)}
            onSOS={() => setShowSOS(true)}
            onProfile={() => nav("profile")}
            carerName={carerName}
          />
        );
      case "client-overview": {
        const overviewClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return (
          <ClientOverviewScreen
            client={overviewClient}
            onBack={() => nav("today")}
            onStartVisit={() => { setVisitStatuses((s) => ({ ...s, [overviewClient.id]: "in-progress" })); setVisitMedStatus({}); setVisitTasks([false, false, false]); setVisitNotes(""); setVisitFluidGlasses(0); setVisitMood(""); setVisitMoodSet(false); nav("active-visit"); }}
          />
        );
      }
      case "active-visit": {
        const activeClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return (
          <ActiveVisitScreen
            client={activeClient}
            onComplete={(data) => { setLastVisitData(data); setVisitMedStatus({}); setVisitTasks([false, false, false]); setVisitNotes(""); setVisitFluidGlasses(0); setVisitMood(""); setVisitMoodSet(false); nav("handover"); }}
            onBack={() => nav("today")}
            onSOS={() => setShowSOS(true)}
            onAssistant={() => setShowAssistant(true)}
            onBodyMap={() => { setVisitReturnScreen("active-visit"); nav("bodymap"); }}
            onCarePlan={() => { setVisitReturnScreen("active-visit"); nav("care-plan"); }}
            onEmergency={() => { setVisitReturnScreen("active-visit"); nav("emergency"); }}
            medStatus={visitMedStatus}
            setMedStatus={setVisitMedStatus}
            tasks={visitTasks}
            setTasks={setVisitTasks}
            notes={visitNotes}
            setNotes={setVisitNotes}
            fluidGlasses={visitFluidGlasses}
            setFluidGlasses={setVisitFluidGlasses}
            mood={visitMood}
            setMood={setVisitMood}
            moodSet={visitMoodSet}
            setMoodSet={setVisitMoodSet}
          />
        );
      }
      case "handover": {
        const handoverClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return <HandoverScreen client={handoverClient} onSubmit={() => nav("continucare-summary")} />;
      }
      case "incident-report":
        return <IncidentReportScreen onBack={() => nav("active-visit")} onSubmit={() => nav("active-visit")} />;
      case "continucare-summary": {
        const summaryClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return (
          <ContinuCareSummaryScreen
            client={summaryClient}
            onDone={() => { setVisitStatuses((s) => ({ ...s, [summaryClient.id]: "completed" })); nav("today"); }}
            visitData={lastVisitData}
          />
        );
      }
      case "operations":
        return (
          <AdminTeaserScreen
            onBack={() => nav("today")}
            onOpenAdmin={() => nav("admin-dashboard")}
            visitStatuses={visitStatuses}
            onSchedule={() => nav("schedule")}
            onManagerApprovals={() => nav("manager-approvals")}
            pendingApprovals={summaryApproval === "pending" ? 1 : 0}
          />
        );
      case "schedule":
        return (
          <ScheduleScreen
            assignedCarers={assignedCarers}
            onAssign={(id, carer) => setAssignedCarers((c) => ({ ...c, [id]: carer }))}
            onBack={() => nav("admin")}
          />
        );
      case "rota":
        return <RotaScreen onBack={() => nav("today")} />;
      default:
        return null;
    }
  }

  if (screen === "admin-dashboard") {
    return (
      <>
        <style>{globalStyles}</style>
        <AdminDashboard onBack={() => nav("admin")} onCarerView={() => nav("today")} />
      </>
    );
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div
        className="carei-root"
        style={{
          minHeight: "100vh",
          background: "#050d1a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <button
          onClick={() => setShowDevNav(v => !v)}
          title="Dev navigation"
          style={{
            position: "fixed", top: 14, right: 14, zIndex: 9999,
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.4)", fontSize: 11,
            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ⚙
        </button>
        {showDevNav && <NavPills current={screen} onNav={nav} />}

        {/* Phone frame */}
        <div
          style={{
            width: 393,
            height: 852,
            maxWidth: "100%",
            maxHeight: "calc(100vh - 120px)",
            borderRadius: 52,
            border: `4px solid ${COLORS.navy}`,
            boxShadow: `0 0 0 6px ${COLORS.darkNavy}, 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(79,209,197,0.08)`,
            overflow: "hidden",
            position: "relative",
            background: COLORS.darkNavy,
          }}
        >
          {/* Notch */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
              height: 8,
              borderRadius: 99,
              background: COLORS.navy,
              zIndex: 200,
            }}
          />

          <div style={{ width: "100%", height: "100%", paddingTop: 24, overflow: "hidden" }}>
            {/* Global offline banner */}
            {isOffline && screen !== "admin-dashboard" && (
              <div style={{ position: "absolute", top: 24, left: 0, right: 0, zIndex: 100, background: "rgba(246,183,60,0.95)", padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>📵</span>
                <span style={{ color: COLORS.darkNavy, fontWeight: 700, fontSize: 12, flex: 1 }}>Offline, data will sync on reconnect</span>
                {queuedCount > 0 && <span style={{ background: COLORS.darkNavy, color: COLORS.amber, borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "2px 8px" }}>{queuedCount} queued</span>}
              </div>
            )}
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
              {renderScreen()}
              {showSOS && <SOSOverlay onDismiss={() => setShowSOS(false)} />}
              {showAssistant && (
                <CAREiAssistantModal
                  onClose={() => setShowAssistant(false)}
                  clientName={SCHEDULE_CLIENTS.find((c) => c.id === activeClientId)?.name}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
