import { useState, useEffect, useRef } from "react";
import AdminDashboard from "./AdminDashboard";
// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "splash"
  | "otp"
  | "dashboard"
  | "visit"
  | "copilot"
  | "medication"
  | "summary"
  | "profile"
  | "family"
  | "bodymap"
  | "admin"
  | "admin-dashboard"
  | "visit-history"
  | "care-plan"
  | "emergency"
  | "today"
  | "active-visit"
  | "continucare-summary"
  | "operations"
  | "schedule"
  | "rota";

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
    { name: "Amlodipine", dose: "5mg", time: "10AM", route: "Oral" },
    { name: "Metformin", dose: "500mg", time: "10AM", route: "Oral" },
    { name: "Atorvastatin", dose: "20mg", time: "10AM", route: "Oral" },
  ],
};

const TASKS = [
  "Personal care — wash, dress",
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
    "Grace's current medications: Amlodipine 5mg (10AM oral) for hypertension, Metformin 500mg (10AM oral) for T2 Diabetes, Atorvastatin 20mg (10AM oral) for cholesterol. ALLERGY: Penicillin.",
};

const SCHEDULE_CLIENTS = [
  {
    id: "mary",
    name: "Mary Johnson",
    age: 82,
    time: "09:00 – 10:00",
    condition: "Dementia",
    tags: ["Dementia", "Medication Required"],
    meds: [
      { name: "Aspirin", dose: "75mg" },
      { name: "Donepezil", dose: "10mg" },
    ],
  },
  {
    id: "tom",
    name: "Tom Adams",
    age: 75,
    time: "10:30 – 11:00",
    condition: "Post Stroke",
    tags: ["Post Stroke", "Mobility Support"],
    meds: [
      { name: "Aspirin", dose: "75mg" },
      { name: "Lisinopril", dose: "10mg" },
    ],
  },
  {
    id: "aisha",
    name: "Aisha Khan",
    age: 69,
    time: "12:00 – 13:00",
    condition: "Diabetes",
    tags: ["Diabetes", "Nutrition Monitoring"],
    meds: [
      { name: "Metformin", dose: "500mg" },
      { name: "Lisinopril", dose: "10mg" },
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
    { key: "splash", label: "Splash" },
    { key: "otp", label: "Login" },
    { key: "today", label: "Today's Care" },
    { key: "active-visit", label: "Active Visit" },
    { key: "continucare-summary", label: "Summary" },
    { key: "operations", label: "Operations" },
    { key: "schedule", label: "Schedule" },
    { key: "rota", label: "My Rota" },
    { key: "dashboard", label: "Dashboard (old)" },
    { key: "visit", label: "Live Visit (old)" },
    { key: "bodymap", label: "Body Map" },
    { key: "copilot", label: "AI Copilot" },
    { key: "medication", label: "Meds" },
    { key: "summary", label: "Summary (old)" },
    { key: "family", label: "Family" },
    { key: "visit-history", label: "History" },
    { key: "care-plan", label: "Care Plan" },
    { key: "emergency", label: "Emergency" },
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

function SplashScreen({ onNext }: { onNext: () => void }) {
  return (
    <div
      style={{
        height: "100%",
        background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 24,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: 40,
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          CAREi
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 400,
            background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginTop: 6,
          }}
        >
          Intelligent Care. Every Visit.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {["CQC Regulated", "GDPR Compliant", "AI Powered"].map((b) => (
          <Badge key={b} color={COLORS.teal} bg="rgba(79,209,197,0.15)">
            {b}
          </Badge>
        ))}
      </div>

      <div
        style={{
          color: COLORS.g2,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: 260,
        }}
      >
        Supporting UK domiciliary care teams with AI-assisted visit management.
      </div>

      <button
        onClick={onNext}
        style={{
          marginTop: 8,
          width: "100%",
          padding: "16px 0",
          borderRadius: 14,
          border: "none",
          background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
          color: COLORS.darkNavy,
          fontFamily: "DM Sans, sans-serif",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: 0.3,
        }}
      >
        Log In
      </button>
    </div>
  );
}

function OTPScreen({ onNext }: { onNext: () => void }) {
  const [email, setEmail] = useState("sarah.johnson@adjoy.co.uk");
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (verified) {
      const t = setTimeout(onNext, 1200);
      return () => clearTimeout(t);
    }
  }, [verified, onNext]);

  function handleSend() {
    setCodeSent(true);
    setError("");
    setTimeout(() => refs[0].current?.focus(), 100);
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) refs[i + 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  }

  function handleVerify() {
    const code = otp.join("");
    if (code.length === 6) {
      setVerified(true);
      setError("");
    } else {
      setError("Please enter all 6 digits.");
    }
  }

  return (
    <div
      style={{
        height: "100%",
        background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`,
        display: "flex",
        flexDirection: "column",
        padding: "48px 28px 32px",
        gap: 20,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: 28,
            color: "#fff",
          }}
        >
          Welcome back
        </div>
        <div style={{ color: COLORS.g2, fontSize: 14, marginTop: 4 }}>
          Sign in to your CAREi account
        </div>
      </div>

      <div>
        <label style={{ color: COLORS.g1, fontSize: 13, fontWeight: 500 }}>
          Email address
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid rgba(255,255,255,0.15)`,
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {!codeSent && (
        <button
          onClick={handleSend}
          style={{
            padding: "14px 0",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
            color: COLORS.darkNavy,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Send Code
        </button>
      )}

      {codeSent && !verified && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ color: COLORS.g1, fontSize: 13 }}>
            Enter the 6-digit code sent to your email
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {otp.map((v, i) => (
              <input
                key={i}
                ref={refs[i]}
                value={v}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={1}
                style={{
                  width: 44,
                  height: 52,
                  borderRadius: 10,
                  border: `2px solid ${v ? COLORS.teal : "rgba(255,255,255,0.2)"}`,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  textAlign: "center",
                  outline: "none",
                }}
              />
            ))}
          </div>
          {error && (
            <div style={{ color: COLORS.red, fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}
          <button
            onClick={handleVerify}
            style={{
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
              color: COLORS.darkNavy,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Verify
          </button>
          <button
            onClick={handleSend}
            style={{
              background: "none",
              border: "none",
              color: COLORS.teal,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Resend code
          </button>
        </div>
      )}

      {verified && (
        <div
          className="fade-in"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: 24,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill={COLORS.teal} />
            <polyline
              points="18,33 27,42 46,22"
              fill="none"
              stroke={COLORS.darkNavy}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="0"
            />
          </svg>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>
            Verified! Signing you in...
          </div>
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
      setNotes((n) => (n ? n + "\n" : "") + "[Dictation requires Chrome or Edge — open the app in a full browser tab and allow microphone access, then try again.]");
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
        setNotes((n) => (n ? n + "\n" : "") + "[Microphone access denied — please allow microphone permission in your browser and try again.]");
      } else if (e.error === "no-speech") {
        setNotes((n) => (n ? n + "\n" : "") + "[No speech detected — please speak clearly and try again.]");
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
          <span style={{ color: "#1B2A49", fontWeight: 700, fontSize: 12 }}>Offline — data will sync when reconnected</span>
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

  const allActioned = CLIENT.meds.every((m) => medStatus[m.name]);

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
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

        <button
          onClick={onNext}
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
          {allActioned ? "Continue to Summary →" : `Action all medications (${Object.keys(medStatus).length}/${CLIENT.meds.length})`}
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [readReceipt, setReadReceipt] = useState(false);

  const fallbackSummary = `Grace was in good spirits and engaged positively throughout the visit. Personal care completed fully. Medications administered as prescribed with no issues noted.

• Mood: Calm and responsive, recognised carer
• Appetite: Breakfast eaten — porridge and tea, good intake
• Mobility: Mobilising with frame, steady on feet
• Skin: No new pressure areas or concerns observed

Next visit: Monitor blood sugar levels. Ensure Metformin is taken with food. Check in with Dr Sandra Obi if confusion increases.`;

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
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Grace Mensah — Handover Note</div>
          <div style={{ color: COLORS.g1, fontSize: 12, lineHeight: 1.6, maxHeight: 140, overflowY: "auto" }}>{summary}</div>
        </div>
        <div style={{ background: "rgba(79,209,197,0.08)", borderRadius: 14, padding: 16, border: "1px solid rgba(79,209,197,0.2)", marginBottom: 24 }}>
          <div style={{ color: COLORS.teal, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Submitted by</div>
          <div style={{ color: COLORS.g1, fontSize: 13 }}>Sarah Johnson · Adjoy Healthcare</div>
          <div style={{ color: COLORS.g3, fontSize: 11, marginTop: 2 }}>Visit ended · {ts}</div>
        </div>
        <div style={{ color: COLORS.g2, fontSize: 13, textAlign: "center", marginBottom: 16 }}>Next carer — tap below to confirm you have read this note</div>
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
            Handover submitted by Sarah Johnson<br />Read receipt confirmed by next carer
          </div>
          <div style={{ marginTop: 12, background: "rgba(34,197,94,0.12)", borderRadius: 10, padding: "8px 16px", display: "inline-block" }}>
            <span style={{ color: COLORS.green, fontWeight: 700, fontSize: 12 }}>CQC AUDIT TRAIL — COMPLETE</span>
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

function ProfileScreen({ onSignOut }: { onSignOut: () => void }) {
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
          SJ
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>Sarah Johnson</div>
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
          { icon: "📧", label: "Email", value: "sarah.johnson@adjoy.co.uk" },
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

function FamilyPortalScreen({ onBack }: { onBack: () => void }) {
  const events = [
    { time: "10:02", icon: "🚗", text: "Sarah arrived at Grace's home", done: true },
    { time: "10:05", icon: "🛁", text: "Personal care commenced", done: true },
    { time: "10:35", icon: "🍵", text: "Breakfast prepared — porridge and tea, good intake", done: true },
    { time: "10:47", icon: "💊", text: "Medications administered: Amlodipine, Metformin, Atorvastatin", done: true },
    { time: "10:52", icon: "🩺", text: "Blood pressure checked: 142/88 mmHg", done: true },
    { time: "11:05", icon: "🧩", text: "Activity: crossword puzzle, good engagement", done: true },
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
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>Grace Mensah · Today's Visit</div>
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

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 18px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10 }}>
        <button style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.1)", color: COLORS.teal, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          💬 Message Agency
        </button>
        <button style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: COLORS.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          📞 Call Adjoy
        </button>
      </div>
    </div>
  );
}

// ─── Body Map Screen ──────────────────────────────────────────────────────────

type BodyMark = { zone: string; type: string; color: string };

function BodyMapScreen({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<"front" | "back">("front");
  const [markType, setMarkType] = useState("Pressure Sore");
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [saved, setSaved] = useState(false);

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
            <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>Tap a body zone to mark it · Grace Mensah</div>
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
        <button onClick={() => setSaved(true)} disabled={marks.length === 0} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: marks.length > 0 ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.1)", color: marks.length > 0 ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: marks.length > 0 ? "pointer" : "not-allowed" }}>
          Save Body Map ({marks.length} mark{marks.length !== 1 ? "s" : ""})
        </button>
      </div>
    </div>
  );
}

// ─── Visit History Screen ─────────────────────────────────────────────────────

function VisitHistoryScreen({ onBack }: { onBack: () => void }) {
  const history = [
    { date: "12 Mar 2026", time: "10:00–11:30", carer: "Sarah Johnson", tasks: "Personal care, Meds, Breakfast", note: "Grace in good spirits. No concerns." },
    { date: "11 Mar 2026", time: "10:00–11:15", carer: "Amy Mitchell",  tasks: "Personal care, Meds",           note: "Client tired, ate half breakfast. BP 146/90." },
    { date: "10 Mar 2026", time: "10:15–11:45", carer: "Sarah Johnson", tasks: "Personal care, Meds, Physio",   note: "Physio exercises completed. Skin intact." },
    { date: "09 Mar 2026", time: "10:00–11:00", carer: "Kemi Adeyemi",  tasks: "Personal care, Meds",           note: "No concerns noted." },
    { date: "08 Mar 2026", time: "10:00–11:30", carer: "Sarah Johnson", tasks: "Personal care, Meds, Activity",  note: "Grace completed crossword. Good mood." },
  ];
  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Visit History</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>Grace Mensah · Last 30 days</div>
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

function CarePlanScreen({ onBack }: { onBack: () => void }) {
  const sections = [
    { title: "Care Objectives", icon: "🎯", items: ["Maintain personal hygiene and dignity", "Support safe mobility with walking frame", "Administer medications as prescribed", "Monitor nutrition and fluid intake", "Promote social engagement and mental wellbeing"] },
    { title: "Preferences & Routines", icon: "🌿", items: ["Prefers morning visits before 11am", "Likes tea with two sugars, no milk", "Enjoys crosswords and Radio 4", "Requires verbal prompts for washing", "Prefers female carers"] },
    { title: "Risks & Precautions", icon: "⚠️", items: ["Fall risk — use walking frame at all times", "ALLERGY: Penicillin — do not administer", "Mild cognitive impairment — simple instructions", "High blood pressure — monitor regularly", "Diabetic — ensure meals taken with Metformin"] },
    { title: "Last Review", icon: "📋", items: ["Reviewed: 01 March 2026 by Dr Sandra Obi", "Next review: 01 June 2026", "Care package: 1.5 hrs × 5 days per week"] },
  ];
  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Care Plan</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 4 }}>Grace Mensah · Personal Care Package</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {sections.map(s => (
          <div key={s.title} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{s.title}</div>
            </div>
            {s.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.teal, marginTop: 6, flexShrink: 0 }} />
                <span style={{ color: COLORS.g1, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Emergency Contacts Screen ────────────────────────────────────────────────

function EmergencyContactsScreen({ onBack }: { onBack: () => void }) {
  const contacts = [
    { name: "David Mensah", relation: "Son (Next of Kin)", phone: "07700 900123", primary: true },
    { name: "Akosua Mensah", relation: "Daughter", phone: "07700 900456", primary: false },
    { name: "Dr Sandra Obi", relation: "GP — Caversham Surgery", phone: "0118 947 0111", primary: false },
    { name: "Adjoy Healthcare", relation: "Care Agency (24hr)", phone: "0118 321 9900", primary: false },
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

function AdminTeaserScreen({ onBack, onOpenAdmin }: { onBack: () => void; onOpenAdmin: () => void }) {
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
  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 14px", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 12 }}>‹</button>
        <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>Manager Overview</div>
        <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 2 }}>Adjoy Healthcare · Live</div>
      </div>
      <div className="phone-scroll" style={{ flex: 1, padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ color: m.color, fontWeight: 700, fontSize: 22 }}>{m.value}</div>
              <div style={{ color: COLORS.g3, fontSize: 10, marginTop: 3, lineHeight: 1.3 }}>{m.label}</div>
            </div>
          ))}
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
        {/* Top alert */}
        <div style={{ background: "rgba(255,90,95,0.1)", border: "1px solid rgba(255,90,95,0.3)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <Badge color={COLORS.red} bg="rgba(255,90,95,0.2)">Critical</Badge>
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Amy Mitchell — lone worker overdue</div>
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
}: {
  visitStatuses: Record<string, string>;
  onSelectClient: (id: string) => void;
  onOperations: () => void;
  onRota: () => void;
  onAssistant: () => void;
  onSOS: () => void;
  onProfile: () => void;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const doneCount = Object.values(visitStatuses).filter((s) => s === "completed").length;

  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg, ${COLORS.darkNavy} 0%, ${COLORS.navy} 100%)`, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "20px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>{greeting},</div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 24, color: "#fff" }}>Today's Care</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={onOperations} style={{ padding: "6px 12px", borderRadius: 99, border: "1px solid rgba(246,183,60,0.4)", background: "rgba(246,183,60,0.1)", color: COLORS.amber, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Switch to Operations</button>
            <div onClick={onProfile} style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SJ</div>
          </div>
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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {client.tags.map((tag) => (
                  <Badge key={tag} color={COLORS.teal} bg="rgba(79,209,197,0.1)">{tag}</Badge>
                ))}
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
}: {
  client: typeof SCHEDULE_CLIENTS[0];
  onComplete: () => void;
  onBack: () => void;
  onSOS: () => void;
  onAssistant: () => void;
  onBodyMap: () => void;
  onCarePlan: () => void;
  onEmergency: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"tasks" | "notes" | "medication" | "history">("tasks");
  const [tasks, setTasks] = useState([false, false, false]);
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [medStatus, setMedStatus] = useState<Record<string, "taken" | "not-taken" | undefined>>({});
  const [medReasons, setMedReasons] = useState<Record<string, string>>({});
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null);
  const [isLone, setIsLone] = useState(false);
  const [loneElapsed, setLoneElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const loneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const VISIT_TASKS = ["Prepare breakfast", "Assist with mobility", "Record mood"];
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

  const loneOverdue = isLone && loneElapsed >= 25 * 60;
  const allMedsAcknowledged = client.meds.every((m) => medStatus[m.name] !== undefined);

  function handleMicClick() {
    setIsRecording(true);
    setTimeout(() => {
      setNotes((n) => (n ? n + "\n" : "") + "Client ate breakfast. Appeared withdrawn. Mobility slightly reduced.");
      setIsRecording(false);
    }, 1500);
  }

  const TAB_LABELS: Record<string, string> = {
    tasks: "Care Tasks",
    notes: "Care Notes",
    medication: "Medication",
    history: "Care History",
  };

  return (
    <div style={{ height: "100%", background: COLORS.darkNavy, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ background: "rgba(15,29,52,0.98)", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.g2, fontSize: 22, cursor: "pointer", padding: 0 }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Active Visit</div>
            <div style={{ color: COLORS.g2, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>⏱ {formatTime(elapsed)}</div>
          </div>
          <button onClick={onSOS} style={{ background: COLORS.red, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, padding: "5px 10px", cursor: "pointer" }}>SOS</button>
        </div>

        {/* Client profile card */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.darkNavy, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {client.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{client.name}</div>
            <div style={{ color: COLORS.g2, fontSize: 12 }}>Age {client.age} · {client.condition}</div>
            <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 1 }}>{client.time}</div>
          </div>
          <button onClick={onAssistant} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="CAREi Assistant">✦</button>
        </div>

        {/* Lone worker control pill */}
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setIsLone((l) => !l)} style={{ background: isLone ? "rgba(255,90,95,0.2)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 99, padding: "5px 14px", color: isLone ? COLORS.red : COLORS.g2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {isLone ? "🔴 Lone Worker Active — tap to deactivate" : "Lone Worker — tap to activate"}
          </button>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background: "rgba(246,183,60,0.9)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>📵</span>
          <span style={{ color: "#1B2A49", fontWeight: 700, fontSize: 12 }}>Offline — data will sync when reconnected</span>
        </div>
      )}

      {/* Lone worker banner — always visible when active, regardless of tab */}
      {isLone && (
        <div style={{ background: loneOverdue ? COLORS.red : "rgba(255,90,95,0.18)", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{loneOverdue ? "⚠ Check-in overdue!" : "Lone Worker Active"}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>{formatTime(loneElapsed)} since last check-in</div>
          </div>
          <button onClick={() => setLoneElapsed(0)} style={{ background: "#fff", border: "none", borderRadius: 8, color: COLORS.red, fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Check In ✓</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        {(["tasks", "notes", "medication", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "10px 4px", border: "none", background: "transparent", color: activeTab === tab ? COLORS.teal : COLORS.g3, fontSize: 10, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${activeTab === tab ? COLORS.teal : "transparent"}`, fontFamily: "DM Sans, sans-serif" }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="phone-scroll" style={{ flex: 1, padding: "12px 14px 96px" }}>

        {/* Care Tasks */}
        {activeTab === "tasks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Care Tasks</div>
            {VISIT_TASKS.map((task, i) => (
              <div key={task} onClick={() => { const t = [...tasks]; t[i] = !t[i]; setTasks(t); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.06)", borderRadius: 12, cursor: "pointer" }}>
                <div className={`task-check ${tasks[i] ? "checked" : ""}`}>
                  {tasks[i] && <svg width="12" height="9" viewBox="0 0 12 9"><polyline points="1,5 4,8 11,1" fill="none" stroke={COLORS.darkNavy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ color: tasks[i] ? COLORS.g3 : COLORS.g1, fontSize: 13, textDecoration: tasks[i] ? "line-through" : "none" }}>{task}</span>
              </div>
            ))}
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 2 }}>Client Records</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div onClick={onBodyMap} style={{ background: "rgba(255,90,95,0.08)", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>🫀</span>
                <div style={{ color: COLORS.red, fontWeight: 600, fontSize: 12, marginTop: 4 }}>Body Map</div>
              </div>
              <div onClick={onCarePlan} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div style={{ color: COLORS.g1, fontWeight: 600, fontSize: 12, marginTop: 4 }}>Care Plan</div>
              </div>
              <div onClick={onEmergency} style={{ background: "rgba(255,90,95,0.08)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", gridColumn: "span 2", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <div style={{ color: COLORS.red, fontWeight: 600, fontSize: 12 }}>Emergency Contacts</div>
              </div>
            </div>
          </div>
        )}

        {/* Care Notes */}
        {activeTab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Care Notes</div>
              <button onClick={handleMicClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 99, border: "none", background: isRecording ? `linear-gradient(90deg, ${COLORS.red}, #cc1a20)` : `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`, color: isRecording ? "#fff" : COLORS.darkNavy, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {isRecording ? "⏺ Listening…" : "🎤 Dictate"}
              </button>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tap Dictate or type care notes here…" rows={7} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 13, resize: "none", outline: "none" }} />
            <div style={{ display: "flex", gap: 6 }}>
              {["Mood", "Appetite", "Mobility"].map((chip) => (
                <button key={chip} onClick={() => setNotes((n) => n + (n ? " " : "") + chip + ": ")} style={{ padding: "4px 10px", borderRadius: 99, border: "1px solid rgba(79,209,197,0.3)", background: "rgba(79,209,197,0.08)", color: COLORS.teal, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>+ {chip}</button>
              ))}
            </div>
          </div>
        )}

        {/* Medication */}
        {activeTab === "medication" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Scheduled Medications</div>
            {client.meds.map((med) => (
              <div key={med.name} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, border: medStatus[med.name] ? `1px solid ${medStatus[med.name] === "taken" ? COLORS.green : COLORS.amber}` : "1px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: medStatus[med.name] ? 0 : 10 }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{med.name} {med.dose}</div>
                    <div style={{ color: COLORS.g2, fontSize: 11, marginTop: 2 }}>Scheduled dose</div>
                  </div>
                  {medStatus[med.name] && (
                    <Badge color={medStatus[med.name] === "taken" ? COLORS.green : COLORS.amber} bg={medStatus[med.name] === "taken" ? "rgba(34,197,94,0.15)" : "rgba(246,183,60,0.15)"}>
                      {medStatus[med.name] === "taken" ? "✓ Taken" : "⚠ Not Taken"}
                    </Badge>
                  )}
                </div>
                {!medStatus[med.name] && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setMedStatus((s) => ({ ...s, [med.name]: "taken" }))} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)", color: COLORS.green, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>✓ Taken</button>
                    <button onClick={() => setShowReasonFor(med.name)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid rgba(246,183,60,0.4)", background: "rgba(246,183,60,0.1)", color: COLORS.amber, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>✗ Not Taken</button>
                  </div>
                )}
                {showReasonFor === med.name && (
                  <div style={{ marginTop: 10 }}>
                    <input value={medReasons[med.name] || ""} onChange={(e) => setMedReasons((r) => ({ ...r, [med.name]: e.target.value }))} placeholder="Reason for not taking…" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(246,183,60,0.3)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, outline: "none" }} />
                    <button onClick={() => { setMedStatus((s) => ({ ...s, [med.name]: "not-taken" })); setShowReasonFor(null); }} style={{ marginTop: 8, width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: "rgba(246,183,60,0.2)", color: COLORS.amber, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Confirm Reason</button>
                  </div>
                )}
              </div>
            ))}
            {!allMedsAcknowledged && (
              <div style={{ background: "rgba(246,183,60,0.1)", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
                <span>⚠️</span>
                <span style={{ color: COLORS.amber, fontSize: 12, lineHeight: 1.5 }}>All medications must be acknowledged before completing the visit.</span>
              </div>
            )}
          </div>
        )}

        {/* Care History */}
        {activeTab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: COLORS.g1, fontSize: 13, fontWeight: 600 }}>Previous Visits</div>
            {CARE_HISTORY.map((visit, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ color: COLORS.teal, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{visit.date}</div>
                <div style={{ color: COLORS.g1, fontSize: 13, lineHeight: 1.5 }}>{visit.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Complete Visit button */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px 24px", background: "rgba(15,29,52,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={allMedsAcknowledged ? onComplete : () => setActiveTab("medication")}
          style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: allMedsAcknowledged ? `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})` : "rgba(255,255,255,0.1)", color: allMedsAcknowledged ? COLORS.darkNavy : COLORS.g3, fontFamily: "DM Sans, sans-serif", fontSize: 15, fontWeight: 700, cursor: allMedsAcknowledged ? "pointer" : "not-allowed" }}
        >
          {allMedsAcknowledged ? "Complete Visit →" : `Confirm medications first (${Object.keys(medStatus).length}/${client.meds.length})`}
        </button>
      </div>
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
}: {
  client: typeof SCHEDULE_CLIENTS[0];
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ observations: "", medication: "", riskSignals: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSummary({
        observations: "Client consumed breakfast. Mild withdrawal noted during visit. Engaged with carer appropriately. Personal care completed fully.",
        medication: client.meds.map((m) => `${m.name} ${m.dose} — taken ✓`).join("\n"),
        riskSignals: "Slight reduction in mobility compared to previous visit. Monitor mood over next 48 hours. No immediate escalation required.",
      });
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
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
            <span style={{ color: COLORS.green, fontWeight: 700, fontSize: 12 }}>CQC AUDIT TRAIL — COMPLETE</span>
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
      const valid: Screen[] = ["splash","otp","dashboard","visit","copilot","medication","summary","profile","family","bodymap","admin","admin-dashboard","visit-history","care-plan","emergency","today","active-visit","continucare-summary","operations","schedule","rota"];
      return valid.includes(saved) ? saved : "splash";
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

  function nav(s: Screen) {
    setScreen(s);
    setShowSOS(false);
    setShowAssistant(false);
    try { sessionStorage.setItem("carei_screen", s); } catch {}
  }

  function renderScreen() {
    switch (screen) {
      case "splash":
        return <SplashScreen onNext={() => nav("otp")} />;
      case "otp":
        return <OTPScreen onNext={() => nav("today")} />;
      case "dashboard":
        return (
          <DashboardScreen
            onVisit={() => nav("visit")}
            onCopilot={() => nav("copilot")}
            onSOS={() => setShowSOS(true)}
            onFamily={() => nav("family")}
            onAdmin={() => nav("admin")}
            onHistory={() => nav("visit-history")}
            onProfile={() => nav("profile")}
          />
        );
      case "visit":
        return (
          <LiveVisitScreen
            onBack={() => nav("dashboard")}
            onCopilot={() => nav("copilot")}
            onMeds={() => nav("medication")}
            onSOS={() => setShowSOS(true)}
            onBodyMap={() => { setVisitReturnScreen("visit"); nav("bodymap"); }}
            onEmergency={() => { setVisitReturnScreen("visit"); nav("emergency"); }}
            onCarePlan={() => { setVisitReturnScreen("visit"); nav("care-plan"); }}
          />
        );
      case "copilot":
        return <CopilotScreen onBack={() => nav("visit")} />;
      case "medication":
        return <MedicationScreen onNext={() => nav("summary")} />;
      case "summary":
        return <SummaryScreen onDone={() => nav("dashboard")} />;
      case "profile":
        return <ProfileScreen onSignOut={() => nav("splash")} />;
      case "family":
        return <FamilyPortalScreen onBack={() => nav("dashboard")} />;
      case "bodymap":
        return <BodyMapScreen onBack={() => nav(visitReturnScreen)} />;
      case "visit-history":
        return <VisitHistoryScreen onBack={() => nav("dashboard")} />;
      case "care-plan":
        return <CarePlanScreen onBack={() => nav(visitReturnScreen)} />;
      case "emergency":
        return <EmergencyContactsScreen onBack={() => nav(visitReturnScreen)} />;
      case "admin":
        return <AdminTeaserScreen onBack={() => nav("dashboard")} onOpenAdmin={() => nav("admin-dashboard")} />;
      case "admin-dashboard":
        return null;
      case "today":
        return (
          <TodayCareScreen
            visitStatuses={visitStatuses}
            onSelectClient={(id) => { setActiveClientId(id); setVisitStatuses((s) => ({ ...s, [id]: "in-progress" })); nav("active-visit"); }}
            onOperations={() => nav("operations")}
            onRota={() => nav("rota")}
            onAssistant={() => setShowAssistant(true)}
            onSOS={() => setShowSOS(true)}
            onProfile={() => nav("profile")}
          />
        );
      case "active-visit": {
        const activeClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return (
          <ActiveVisitScreen
            client={activeClient}
            onComplete={() => nav("continucare-summary")}
            onBack={() => nav("today")}
            onSOS={() => setShowSOS(true)}
            onAssistant={() => setShowAssistant(true)}
            onBodyMap={() => { setVisitReturnScreen("active-visit"); nav("bodymap"); }}
            onCarePlan={() => { setVisitReturnScreen("active-visit"); nav("care-plan"); }}
            onEmergency={() => { setVisitReturnScreen("active-visit"); nav("emergency"); }}
          />
        );
      }
      case "continucare-summary": {
        const summaryClient = SCHEDULE_CLIENTS.find((c) => c.id === activeClientId) || SCHEDULE_CLIENTS[0];
        return (
          <ContinuCareSummaryScreen
            client={summaryClient}
            onDone={() => { setVisitStatuses((s) => ({ ...s, [summaryClient.id]: "completed" })); nav("today"); }}
          />
        );
      }
      case "operations":
        return (
          <OperationsScreen
            visitStatuses={visitStatuses}
            onSchedule={() => nav("schedule")}
            onBack={() => nav("today")}
          />
        );
      case "schedule":
        return (
          <ScheduleScreen
            assignedCarers={assignedCarers}
            onAssign={(id, carer) => setAssignedCarers((c) => ({ ...c, [id]: carer }))}
            onBack={() => nav("operations")}
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
        <AdminDashboard onBack={() => nav("admin")} />
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
        <NavPills current={screen} onNav={nav} />

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
