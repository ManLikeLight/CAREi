import { useState, useEffect, useRef } from "react";
// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "splash"
  | "otp"
  | "dashboard"
  | "visit"
  | "copilot"
  | "medication"
  | "summary"
  | "profile";

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
    { key: "dashboard", label: "Dashboard" },
    { key: "visit", label: "Live Visit" },
    { key: "copilot", label: "AI Copilot" },
    { key: "medication", label: "Meds" },
    { key: "summary", label: "Summary" },
    { key: "profile", label: "Profile" },
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
}: {
  onVisit: () => void;
  onCopilot: () => void;
  onSOS: () => void;
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
          { icon: "🏠", label: "Home" },
          { icon: "📅", label: "Schedule" },
          { icon: "📋", label: "Reports" },
          { icon: "👤", label: "Profile" },
        ].map((n) => (
          <div
            key={n.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
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
}: {
  onBack: () => void;
  onCopilot: () => void;
  onMeds: () => void;
  onSOS: () => void;
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
      setNotes((n) => n + " [Voice recognition not available in this browser]");
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
    rec.onerror = () => setIsRecording(false);
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
        <button
          onClick={onMeds}
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
            marginTop: 4,
          }}
        >
          End Visit & Confirm Meds →
        </button>
      </div>

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

  if (submitted) {
    return (
      <div
        style={{
          height: "100%",
          background: COLORS.darkNavy,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 32,
        }}
      >
        <div className="fade-in" style={{ textAlign: "center" }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill={COLORS.teal} />
            <polyline
              points="20,37 30,47 52,24"
              fill="none"
              stroke={COLORS.darkNavy}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 22, marginTop: 16 }}>
            Handover Submitted
          </div>
          <div style={{ color: COLORS.teal, fontSize: 14, marginTop: 6 }}>
            ContinuCare+ Note Sent
          </div>
          <div style={{ color: COLORS.g2, fontSize: 13, marginTop: 8 }}>
            Supervisor and next carer have been notified
          </div>
          <button
            onClick={onDone}
            style={{
              marginTop: 24,
              padding: "14px 32px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.teal2})`,
              color: COLORS.darkNavy,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
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
            <div style={{ color: COLORS.g0, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {summary}
            </div>
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

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function CAREiApp() {
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      const saved = sessionStorage.getItem("carei_screen") as Screen;
      const valid: Screen[] = ["splash","otp","dashboard","visit","copilot","medication","summary","profile"];
      return valid.includes(saved) ? saved : "splash";
    } catch {
      return "splash";
    }
  });
  const [showSOS, setShowSOS] = useState(false);

  function nav(s: Screen) {
    setScreen(s);
    setShowSOS(false);
    try { sessionStorage.setItem("carei_screen", s); } catch {}
  }

  function renderScreen() {
    switch (screen) {
      case "splash":
        return <SplashScreen onNext={() => nav("otp")} />;
      case "otp":
        return <OTPScreen onNext={() => nav("dashboard")} />;
      case "dashboard":
        return (
          <DashboardScreen
            onVisit={() => nav("visit")}
            onCopilot={() => nav("copilot")}
            onSOS={() => setShowSOS(true)}
          />
        );
      case "visit":
        return (
          <LiveVisitScreen
            onBack={() => nav("dashboard")}
            onCopilot={() => nav("copilot")}
            onMeds={() => nav("medication")}
            onSOS={() => setShowSOS(true)}
          />
        );
      case "copilot":
        return <CopilotScreen onBack={() => nav(screen === "copilot" ? "visit" : "dashboard")} />;
      case "medication":
        return <MedicationScreen onNext={() => nav("summary")} />;
      case "summary":
        return <SummaryScreen onDone={() => nav("dashboard")} />;
      case "profile":
        return <ProfileScreen onSignOut={() => nav("splash")} />;
      default:
        return null;
    }
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
