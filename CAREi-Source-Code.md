# CAREi — Full Source Code
**Adjoy Healthcare · UK CQC-Regulated Domiciliary Care Management Platform**
*Generated: 25 May 2026 · Repository: github.com/ManLikeLight/CAREi*

---

## Project Structure

```
artifacts/
├── carei-app/                        # React + Vite frontend (mobile-first)
│   ├── src/
│   │   ├── main.tsx                  # Entry point
│   │   ├── App.tsx                   # Root component
│   │   ├── index.css                 # Global styles + Tailwind + CAREi theme
│   │   └── pages/
│   │       ├── CAREiApp.tsx          # Main app (5,201 lines) — all screens
│   │       └── AdminDashboard.tsx    # Supervisor admin dashboard
│   └── vite.config.ts
└── api-server/                       # Express + TypeScript API
    └── src/
        ├── app.ts
        ├── index.ts
        └── routes/
            ├── index.ts
            ├── health.ts
            └── anthropic.ts          # Claude AI integration
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Navy | `#1B2A49` | Primary background |
| Dark Navy | `#0F1D34` | Deep background |
| Teal | `#4FD1C5` / `#38B2AC` | Primary action / brand |
| Amber | `#F6B73C` | Warnings / nutrition |
| Red | `#FF5A5F` | Alerts / SOS / allergy |
| Green | `#22C55E` | Success / confirmed |
| Font | DM Sans + DM Serif Display | Body + headings |

All UI is inline styles — no CSS classes except global animations.

---

## Features Implemented (6 MVP Features)

1. **Vital Signs Logging** — BP (systolic/diastolic), pulse, O₂ sat with elevated-BP alert
2. **Post-Medication Monitoring Timer** — 30-min countdown with progress bar; gates "Continue" button
3. **Fluid & Nutrition Logging** — Glass counter with target progress + meal completion selector
4. **Body Map Photo Capture** — Camera capture via `<input capture="environment">` with thumbnail
5. **Handover Read Receipt** — Carer must confirm reading previous handover before starting visit
6. **Supervisor Acknowledgement Log** — Per-alert action log with timestamp in Admin Dashboard

---

## `artifacts/carei-app/src/main.tsx`

```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

---

## `artifacts/carei-app/src/App.tsx`

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import CAREiApp from "@/pages/CAREiApp";

export default function App() {
  return <CAREiApp />;
}
```

---

## `artifacts/carei-app/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  /* ... full Tailwind token mapping ... */
}

/* CAREi dark navy theme */
:root {
  --background: 217 46% 7%;
  --foreground: 210 40% 96%;
  --primary: 174 60% 57%;          /* Teal #4FD1C5 */
  --destructive: 358 100% 68%;     /* Red #FF5A5F */
  --app-font-sans: 'DM Sans', sans-serif;
  --app-font-serif: 'DM Serif Display', Georgia, serif;
  --radius: .75rem;
}

@layer base {
  body {
    @apply font-sans antialiased bg-background text-foreground;
    background: #050d1a;
  }
}
```

---

## `artifacts/carei-app/src/pages/AdminDashboard.tsx`

```tsx
import { useState } from "react";

const C = {
  navy: "#1B2A49", dark: "#0F1D34", teal: "#4FD1C5", teal2: "#38B2AC",
  amber: "#F6B73C", red: "#FF5A5F", green: "#22C55E",
  g0: "#F8FAFC", g1: "#E2E8F0", g2: "#94A3B8", g3: "#475569", g4: "#64748B",
};

const CARERS = [
  { name: "Sarah Johnson",  client: "Grace Mensah",    time: "10:00–11:30", status: "Active", gps: "2 min ago",  x: 52, y: 38 },
  { name: "Amy Mitchell",   client: "Patricia Lane",   time: "10:15–11:45", status: "Late",   gps: "18 min ago", x: 68, y: 45 },
  { name: "James Osei",     client: "Robert Turner",   time: "09:30–11:00", status: "Active", gps: "3 min ago",  x: 35, y: 58 },
  { name: "David Chen",     client: "—",               time: "—",           status: "Break",  gps: "5 min ago",  x: 74, y: 28 },
  { name: "Priya Patel",    client: "Alan Simmons",    time: "11:00–12:30", status: "Done",   gps: "1 min ago",  x: 44, y: 70 },
  { name: "Kemi Adeyemi",   client: "Margaret Cole",   time: "10:30–12:00", status: "Active", gps: "4 min ago",  x: 58, y: 62 },
  { name: "Tom Bridges",    client: "Frank Novak",     time: "09:00–10:30", status: "Done",   gps: "45 min ago", x: 28, y: 42 },
];

const CLIENTS = [
  { name: "Grace Mensah",    dob: "12/03/1942", carer: "Sarah Johnson",  last: "Today 10:00", status: "Active", med: true,  risk: "Medium" },
  { name: "Patricia Lane",   dob: "05/07/1938", carer: "Amy Mitchell",   last: "Today 10:15", status: "Active", med: false, risk: "High"   },
  { name: "Robert Turner",   dob: "22/11/1945", carer: "James Osei",     last: "Today 09:30", status: "Active", med: true,  risk: "Low"    },
  { name: "Alan Simmons",    dob: "14/04/1950", carer: "Priya Patel",    last: "Today 11:00", status: "Active", med: true,  risk: "Low"    },
  { name: "Margaret Cole",   dob: "03/09/1940", carer: "Kemi Adeyemi",   last: "Today 10:30", status: "Active", med: false, risk: "Medium" },
  { name: "Frank Novak",     dob: "18/01/1948", carer: "Tom Bridges",    last: "Today 09:00", status: "Active", med: true,  risk: "Low"    },
];

const AUDIT = [
  { time: "10:49", event: "Medication confirmed — Atorvastatin 20mg", carer: "Sarah Johnson", s: "ok"   },
  { time: "10:48", event: "Medication confirmed — Metformin 500mg",   carer: "Sarah Johnson", s: "ok"   },
  { time: "10:47", event: "Medication confirmed — Amlodipine 5mg",    carer: "Sarah Johnson", s: "ok"   },
  { time: "10:33", event: "Lone worker check-in overdue (18 min)",    carer: "Amy Mitchell",  s: "warn" },
  { time: "10:15", event: "Visit started — Patricia Lane",            carer: "Amy Mitchell",  s: "ok"   },
  { time: "10:00", event: "Visit started — Grace Mensah",             carer: "Sarah Johnson", s: "ok"   },
  { time: "09:42", event: "Medication flagged — out of stock note",   carer: "James Osei",    s: "warn" },
  { time: "09:30", event: "Visit started — Robert Turner",            carer: "James Osei",    s: "ok"   },
  { time: "09:00", event: "Visit started — Frank Novak",              carer: "Tom Bridges",   s: "ok"   },
  { time: "07:55", event: "CQC flag — medication gap not documented", carer: "System",        s: "fail" },
];

const ALERTS = [
  { id: 1, sev: "Critical", type: "Lone Worker",
    title: "Amy Mitchell — check-in overdue 18 min",
    detail: "Amy Mitchell has not checked in while lone working at Patricia Lane's home. Immediate supervisor action required.",
    time: "10:33" },
  { id: 2, sev: "High", type: "AI Flag",
    title: "Potential drug interaction — Robert Turner",
    detail: "AI Copilot flagged a possible interaction between Warfarin and Ibuprofen. Review before next visit.",
    time: "10:15" },
  { id: 3, sev: "Medium", type: "CQC",
    title: "Handover note missing — Margaret Cole",
    detail: "No ContinuCare+ handover submitted for Margaret Cole's 08:00 visit. Documentation gap flagged.",
    time: "09:50" },
  { id: 4, sev: "Low", type: "Schedule",
    title: "James Osei 8 min behind schedule",
    detail: "GPS tracking shows James Osei is 8 minutes behind for Robert Turner's visit. Client notified.",
    time: "09:22" },
];

type Section = "carers" | "clients" | "cqc" | "alerts";
type AlertFilter = "All" | "Critical" | "AI Flags";

// StatusChip, RiskChip, SevChip — pill badge components
// Ring — SVG compliance donut chart
// CarerOverview — live shift table + lone worker GPS map
// ClientRoster — full client table with risk ratings
// CQCAuditTrail — audit event log + compliance ring meters

// Feature 6 — Supervisor Acknowledgement Log
function AgencyAlerts() {
  const [filter, setFilter] = useState<AlertFilter>("All");
  const [ackState, setAckState] = useState<Record<number, {
    open: boolean; text: string; done: boolean; time: string
  }>>({});

  const filtered = ALERTS.filter(a =>
    filter === "All" ? true : filter === "Critical" ? a.sev === "Critical" : a.type === "AI Flag"
  );

  function openAck(id: number) {
    setAckState(s => ({ ...s, [id]: { open: true, text: s[id]?.text ?? "", done: false, time: "" } }));
  }

  function submitAck(id: number) {
    const text = ackState[id]?.text?.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setAckState(s => ({ ...s, [id]: { open: false, text, done: true, time } }));
  }

  // Each alert card renders:
  // - ack?.done → green "✓ Acknowledged — HH:MM" + action taken text
  // - ack?.open → textarea + Cancel / "✓ Submit Acknowledgement" button
  // - default   → Call / Escalate / Review buttons + "✓ Acknowledge" button
}

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<Section>("carers");
  // Sidebar nav: Carer Overview | Client Roster | CQC Audit Trail | Agency Alerts
  // Main content area renders the selected section component
}
```

---

## `artifacts/carei-app/src/pages/CAREiApp.tsx`

> **5,201 lines** — complete React prototype. Key sections below.

### Types & Screen Routing

```tsx
type Screen =
  | "otp" | "splash" | "today" | "client-overview" | "active-visit"
  | "medication" | "handover" | "continucare-summary" | "care-plan"
  | "bodymap" | "emergency" | "visit-history" | "incident-report"
  | "rota" | "operations" | "schedule" | "family" | "family-summary"
  | "manager-approvals" | "copilot" | "profile" | "admin" | "admin-dashboard";
```

### Constants — Design System

```tsx
const COLORS = {
  navy: "#1B2A49", darkNavy: "#0F1D34",
  teal: "#4FD1C5", teal2: "#38B2AC",
  amber: "#F6B73C", red: "#FF5A5F", green: "#22C55E",
  g0: "#F8FAFC", g1: "#E2E8F0", g2: "#94A3B8", g3: "#475569", g4: "#64748B",
};
```

### Constants — Client Data (Grace Mensah — standalone flow)

```tsx
const CLIENT = {
  name: "Grace Mensah", age: 83,
  address: "10 Oak Avenue, Reading RG1 4AT",
  conditions: ["Hypertension", "T2 Diabetes", "Mild Cognitive Impairment"],
  allergy: "Penicillin",
  gp: "Dr Sandra Obi",
  meds: [
    { name: "Amlodipine",   dose: "5mg",  time: "10AM", route: "Oral",
      adminNote: "Give with a full glass of water. Monitor for dizziness for 20 mins after." },
    { name: "Metformin",    dose: "500mg", time: "10AM", route: "Oral",
      adminNote: "⚠ Give AFTER meals — never on an empty stomach. Monitor for nausea/vomiting for 30 mins after." },
    { name: "Atorvastatin", dose: "20mg",  time: "10AM", route: "Oral",
      adminNote: "Give at same time each day. Monitor for any muscle pain or weakness after." },
  ],
};
```

### Constants — Schedule Clients (Today's Care flow)

```tsx
const SCHEDULE_CLIENTS = [
  {
    id: "mary", name: "Mary Johnson", age: 82,
    address: "4 Birch Close, Reading RG2 7LN",
    time: "09:00 – 10:00", condition: "Dementia",
    tags: ["Dementia", "Medication Required"],
    emoji: "👩🏼", gp: "Dr A. Patel · Earley Surgery",
    allergy: "None known",
    supportLevel: "Full physical assistance + 1-to-1 supervision throughout",
    framework: "Person-Centred · PBS · Dementia Care Mapping (DCM)",
    communication: "Use simple words and short sentences. Validate feelings — never argue...",
    mobilityNote: "Walking frame required at all times — high fall risk",
    medNote: "Donepezil 10mg after breakfast · Aspirin 75mg with food",
    meds: [
      { name: "Aspirin",    dose: "75mg",  adminNote: "Give with food. Monitor for stomach discomfort." },
      { name: "Donepezil",  dose: "10mg",  adminNote: "Give after breakfast. Monitor for nausea or sleep disturbance." },
    ],
  },
  {
    id: "tom", name: "Tom Adams", age: 75,
    condition: "Post Stroke", tags: ["Post Stroke", "Mobility Support"],
    allergy: "None known",
    meds: [
      { name: "Aspirin",    dose: "75mg",  adminNote: "Give with morning meal. Monitor for dizziness." },
      { name: "Lisinopril", dose: "10mg",  adminNote: "Give with food. Monitor blood pressure. Report above 140/90." },
    ],
    // + full fields: address, time, emoji, gp, supportLevel, framework, communication, mobilityNote, medNote
  },
  {
    id: "aisha", name: "Aisha Khan", age: 69,
    condition: "Diabetes", tags: ["Diabetes", "Nutrition Monitoring"],
    allergy: "Sulfonamides — do not administer",
    meds: [
      { name: "Metformin",  dose: "500mg", adminNote: "⚠ Give AFTER meals only — never on an empty stomach." },
      { name: "Lisinopril", dose: "10mg",  adminNote: "Give with food. Monitor blood pressure above 140/90." },
    ],
    // + full fields
  },
];
```

### Global CSS Animations (injected via `<style>`)

```css
@keyframes waveBar    { 0%, 100% { scaleY: 0.4 } 50% { scaleY: 1 } }
@keyframes pulse-dot  { 0%, 100% { opacity: 1 }  50% { opacity: 0.3 } }
@keyframes fadeIn     { from { opacity: 0; translateY: 8px } to { opacity: 1; translateY: 0 } }
@keyframes slideUp    { from { translateY: 100%; opacity: 0 } to { translateY: 0; opacity: 1 } }
@keyframes sosPulse   { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,90,95,0.7) } 70% { box-shadow: 0 0 0 14px transparent } }
@keyframes sosFlash   { 0%, 100% { background: #FF5A5F } 50% { background: #cc1a20 } }
```

---

### Screen: OTP Login (`OTPScreen`)

- Email input pre-filled with `sarah.johnson@adjoy.co.uk`
- "Send Code" → shows 6-digit OTP input boxes with auto-advance
- Any 6-digit code verifies → animated tick → auto-navigates to `"today"`

---

### Screen: Today's Care (`TodayCareScreen`)

- Time-aware greeting (Good morning/afternoon/evening)
- Stats row: Visits / Hours / Done count
- Schedule cards for Mary Johnson, Tom Adams, Aisha Khan
  - Status badges: Pending (amber) / In Progress (teal) / Completed (green)
  - Tap card → navigates to Client Overview
- Floating ✦ AI Assistant button (bottom-left)
- Floating SOS button with pulse animation (bottom-right)
- Bottom nav: Home / My Rota / Operations / Profile

---

### Screen: Client Overview (`ClientOverviewScreen`)

```tsx
function ClientOverviewScreen({ client, onStartVisit, onBack }) {
  const [handoverRead, setHandoverRead] = useState(false); // Feature 5

  // Renders:
  // - Client header (name, age, address, tags, allergy warning)
  // - Key info card: GP, support level, framework, mobility
  // - Communication Passport card (purple border)
  // - Medications Due card (amber border) with Metformin warning
  // - Feature 5: Handover read receipt card
  //   → shows previous carer's handover note
  //   → "✓ I confirm I have read this handover" button
  //   → Start Visit button DISABLED until handoverRead === true
}
```

**Feature 5 — Handover Read Receipt:**
- Previous handover note shown per client (client-specific content for mary/tom/aisha)
- "Start Visit →" button locked with `disabled` + greyed style until confirmed
- On confirm: card turns green, shows confirmation timestamp, button unlocks

---

### Screen: Active Visit (`ActiveVisitScreen`)

```tsx
function ActiveVisitScreen({ client, onComplete, onBack, onSOS,
  onAssistant, onBodyMap, onCarePlan, onEmergency, onIncident }) {

  // State
  const [activeTab, setActiveTab] = useState<"tasks"|"notes"|"medication"|"history">("tasks");
  const [tasks, setTasks] = useState([false, false, false]);
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [medStatus, setMedStatus] = useState<Record<string, "taken"|"refused"|undefined>>({});
  const [isLone, setIsLone] = useState(false);
  const [loneElapsed, setLoneElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Feature 1 — Vitals
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [o2sat, setO2sat] = useState("");
  const [vitalsSaved, setVitalsSaved] = useState(false);

  // Feature 3 — Fluid & Nutrition
  const [fluidGlasses, setFluidGlasses] = useState(0);
  const [mealStatus, setMealStatus] = useState<""|"Full"|"Half"|"Refused">("");
}
```

**Tab: Tasks**
- 3 checkboxes: "Prepare breakfast", "Assist with mobility", "Record mood"
- Quick-access action buttons: AI Copilot, Body Map, Care Plan, Emergency, Incident Report

**Tab: Notes (Care Notes) — Features 1, 3**

*Vital Signs card (teal border):*
- 4 number inputs: Systolic, Diastolic, Pulse, O₂ Sat
- Auto-alert if BP > 140/90 mmHg (red warning banner)
- "Save Vitals" button → green "✓ Recorded" badge on save

*Fluid & Nutrition card (amber border):*
- +/− glass counter (0–12), progress bar toward 8-glass target
- Turns green at ≥6 glasses
- Meal selector: 🍽 Full / 🍴 Half / ✗ Refused (colour-coded)

*Care Notes:*
- Dictate button (simulated recording with 1.5s delay)
- Textarea with quick-insert chips: + Mood / + Appetite / + Mobility

**Tab: Medication**
- Per-client medication cards with confirm/flag buttons
- Refusal logging modal (reason + what client said + action taken)

**Tab: History**
- Last 3 visit summaries with dates

---

### Screen: Medication (`MedicationScreen`)

```tsx
function MedicationScreen({ onNext }) {
  const [medStatus, setMedStatus] = useState<Record<string, string>>({});
  // Feature 2 — Post-medication monitoring timer
  const [monitoringElapsed, setMonitoringElapsed] = useState(0);
  const [monitoringConfirmed, setMonitoringConfirmed] = useState(false);
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
}
```

**Feature 2 — Monitoring Timer UI:**
- Live `MM:SS` countdown with monospace font
- Teal progress bar fills over 30 minutes, turns green when complete
- "Confirm early (not recommended)" available any time (greyed)
- "✓ I confirm I observed the client for 30 minutes" — green button, only enabled after 30 min
- "Continue to Summary →" locked until `allActioned && monitoringConfirmed`

---

### Screen: Body Map (`BodyMapScreen`)

```tsx
function BodyMapScreen({ clientName, onBack }) {
  const [view, setView]       = useState<"front"|"back">("front");
  const [markType, setMarkType] = useState("Pressure Sore");
  const [marks, setMarks]     = useState<BodyMark[]>([]);
  const [saved, setSaved]     = useState(false);
  // Feature 4 — Photo capture
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  }
}
```

**SVG Body Map:**
- Front view: 14 zones (head, neck, shoulders, chest, abdomen, arms, thighs, shins, feet)
- Back view: 13 zones (head, neck, upper/lower back, sacrum, buttocks, thighs, calves, heels)
- Tap zone → adds mark of selected type; zone highlights in mark colour
- Mark types: Pressure Sore (red) / Bruising (purple) / Mark (amber) / Redness (orange)

**Feature 4 — Photo Capture:**
- Appears after first mark is placed
- Hidden `<input type="file" accept="image/*" capture="environment">` triggered via ref
- Opens device camera directly on mobile
- Photo previews as thumbnail (max 140px height) with "📷 Photo attached" badge
- Remove button clears photo and resets input
- Save confirmation shows: marks count · Photo attached/No photo · timestamp

---

### Screen: Visit History (`VisitHistoryScreen`)

- Client-name-aware (accepts `clientName` prop)
- 5 historical visits with date, time, carer, tasks, and notes
- Notes personalised using client's first name

---

### Screen: Care Plan (`CarePlanScreen`)

```tsx
function buildCarePlan(client: typeof SCHEDULE_CLIENTS[0]) {
  // Returns per-client data object with:
  // - objectives[]       — 6 care objectives
  // - risks[]            — 6 risk statements (allergy, mobility, medication)
  // - preventive[]       — 6 preventive strategies
  // - postMed[]          — 4 post-medication monitoring notes
  // - pbsCalmSigns[]     — PBS: green zone indicators
  // - pbsCalmActions[]   — PBS: green zone responses
  // - pbsAnxiousSigns[]  — PBS: amber zone indicators
  // - pbsAnxiousActions[]— PBS: amber zone responses
  // - pbsRiskSigns[]     — PBS: red zone indicators
  // - pbsRiskActions[]   — PBS: red zone responses (de-escalation)
  // - lastReview[]       — review dates, care package, framework
}
```

Sections rendered: Objectives · Risk Register · Preventive Strategies ·
Post-Med Monitoring · PBS (Positive Behaviour Support) with 3-zone colour coding ·
Plan Details

---

### Screen: Handover / ContinuCare+ Summary

```tsx
function SummaryScreen({ onDone }) {
  // Calls POST /api/anthropic/summary with client data
  // Falls back to hardcoded summary if API unavailable
  // Editable textarea for carer to amend AI draft
  // Submit → Handover Read Receipt screen
  //   Next carer confirms "✓ I've Read This Handover"
  //   → "Handover Complete · Chain of custody recorded ✓"
  //   → CQC AUDIT TRAIL — COMPLETE badge
}
```

---

### Screen: AI Copilot (`CopilotScreen`)

```tsx
function CopilotScreen({ onBack }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function sendMessage(text: string) {
    // POST /api/anthropic/chat with messages array + systemContext
    // systemContext includes client name, age, conditions, allergy, GP, meds
    // Falls back to OFFLINE_RESPONSES map if API unavailable
  }
}
```

Quick chips: "Paracetamol safe?" / "Fall risk?" / "What did she eat?" / "Medications"

---

### Screen: Emergency Contacts (`EmergencyContactsScreen`)

- 3 contacts: Next of kin (James Mensah, Son, 07700 900123)
- GP: Dr Sandra Obi · Caversham Surgery
- Adjoy On-Call: 0118 496 0001
- Each card: Call / Message buttons
- NHS 111 and 999 emergency buttons

---

### Screen: Incident Report (`IncidentReportScreen`)

- Incident type selector: Fall / Medication Error / Skin Change / Behaviour / Other
- Severity: Low / Medium / High
- Description textarea
- Submit → confirmation with Datix reference number

---

### Screen: My Rota (`RotaScreen`)

- Week / Month toggle
- 7-day week view: each day shows shifts with client and time
- "Swap" button per shift → opens Swap Request modal
  - Lists available carers (Amy Mitchell, James Osei, Priya Patel, Kemi Adeyemi)
  - Sends swap request → confirmation with carer name
- "Flag Unavailability" → date picker + reason selector (Holiday / Sick / Personal / etc.)
- Flagged days shown as list with Remove option
- Month view: calendar grid + monthly summary (42 shifts, 63h, avg 2.1/day)

---

### Screen: Operations (`OperationsScreen`)

- 4 KPI cards: Active Visits, Pending Alerts, Hours Today, Coverage %
- Visit status table for all 3 clients (Pending / In Progress / Completed)
- "View Full Schedule" → Schedule screen
- Recent activity feed

---

### Screen: Schedule (`ScheduleScreen`)

- All 3 SCHEDULE_CLIENTS listed with time windows, conditions, and tags
- Per-client carer assignment dropdown (Sarah Johnson / Amy Mitchell / James Osei / Auto-assign)
- "Confirm Schedule" button

---

### Screen: Family Portal (`FamilyPortalScreen`)

- Today's summary card for Grace Mensah
- Recent visits with carer names and dates
- "View Full Summary" → FamilySummaryScreen

### Screen: Family Summary (`FamilySummaryScreen`)

- Full visit summary display (read-only for family)
- "I've read this update" confirmation
- Approval status for manager review

### Screen: Manager Approvals (`ManagerApprovalsScreen`)

- Pending handover summary for review
- "✓ Approve & Sign Off" button → approval timestamp recorded

---

### Screen: Profile (`ProfileScreen`)

- Sarah Johnson · Adjoy Healthcare · Senior Care Worker · Reading, Berkshire
- DBS Checked / GPS Enabled / AI Enabled badges
- Settings and Sign Out buttons

---

### Screen: Admin Teaser (`AdminTeaserScreen`)

- "Open Admin Dashboard →" button → navigates to full AdminDashboard
- Feature summary cards: Live Carer Tracking, CQC Audit Trail, Agency Alerts

---

### Global Overlays

**SOS Overlay (`SOSOverlay`):**
- Full-screen flashing red overlay
- "999 Emergency", "Adjoy On-Call", "Nearest Hospital" buttons
- GPS coordinates display
- Dismiss button

**CAREi Assistant Modal (`CAREiAssistantModal`):**
- Slide-up modal over any screen
- Full chat interface with Claude API
- Client-contextualised system prompt
- Quick-chip suggestions

---

### Main Router (`CAREiApp` default export)

```tsx
export default function CAREiApp() {
  const [screen, setScreen] = useState<Screen>("otp");
  const [activeClientId, setActiveClientId] = useState<string>("mary");
  const [visitStatuses, setVisitStatuses] = useState<Record<string, string>>({});
  const [visitReturnScreen, setVisitReturnScreen] = useState<Screen>("active-visit");
  const [showSOS, setShowSOS] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [assignedCarers, setAssignedCarers] = useState<Record<string, string>>({});
  const [summaryApproval, setSummaryApproval] = useState<"pending"|"approved">("pending");
  const [summaryReadAt, setSummaryReadAt] = useState<string | null>(null);

  // Session persistence via sessionStorage (restores screen on refresh, except "splash")
  // Offline detection via window online/offline events
  // renderScreen() — switch/case over Screen type → returns correct screen component
  // admin-dashboard renders full-width (no phone frame)
  // All other screens render inside 393×852 phone frame with notch
}
```

---

## `artifacts/api-server/src/routes/anthropic.ts`

```typescript
import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

// POST /api/anthropic/chat
// Body: { messages: ChatMessage[], systemContext?: string }
// Uses claude-sonnet-4-6, max_tokens: 1024
// systemContext includes client name, conditions, meds, allergy, GP
router.post("/anthropic/chat", async (req, res) => {
  try {
    const { messages, systemContext } = req.body;
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemContext || "You are a helpful care assistant.",
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
    const content = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ content });
  } catch (err) {
    console.error("Anthropic chat error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// POST /api/anthropic/summary
// Body: { client: ClientObject, visitDate: string }
// Generates 150-200 word ContinuCare+ handover note
// Format: overall impression + 4 bullet points (Mood/Appetite/Mobility/Skin) + next carer note
router.post("/anthropic/summary", async (req, res) => {
  try {
    const { client, visitDate } = req.body;
    const prompt = `Generate a concise, professional ContinuCare+ handover note...
Client: ${client.name}, Age ${client.age}
Conditions: ${client.conditions.join(", ")}
Medications: ${client.meds.map((m: any) => `${m.name} ${m.dose}`).join(", ")}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ summary: response.content[0].type === "text" ? response.content[0].text : "" });
  } catch (err) {
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
```

---

## `artifacts/api-server/src/app.ts`

```typescript
import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
```

---

## `artifacts/api-server/src/index.ts`

```typescript
import app from "./app";

const port = Number(process.env["PORT"]);
if (!port || isNaN(port)) throw new Error("PORT environment variable required");

app.listen(port, () => console.log(`Server listening on port ${port}`));
```

---

## `artifacts/carei-app/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: process.env.BASE_PATH,
  plugins: [react(), tailwindcss(), runtimeErrorOverlay(), ...replitPlugins],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: Number(process.env.PORT),
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
```

---

## `artifacts/carei-app/package.json` — Key Dependencies

```json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "framer-motion": "catalog:",
    "wouter": "^3.3.5",
    "recharts": "^2.15.2",
    "lucide-react": "catalog:",
    "@tanstack/react-query": "catalog:",
    "@radix-ui/react-*": "^1.x – ^2.x",
    "tailwindcss": "catalog:",
    "zod": "catalog:",
    "react-hook-form": "^7.55.0"
  }
}
```

---

## CQC Compliance Features

| Feature | Screen | CQC Relevance |
|---------|--------|---------------|
| Handover Read Receipt | Client Overview | Safe continuity of care |
| Medication Monitoring Timer | Medication | Safe administration evidence |
| Vital Signs Logging | Active Visit → Notes | Health monitoring records |
| Body Map + Photo Capture | Body Map | Skin integrity audit trail |
| Fluid & Nutrition Logging | Active Visit → Notes | Nutrition & hydration records |
| Supervisor Acknowledgement | Admin Dashboard | Management oversight log |
| ContinuCare+ Handover (AI) | Visit Summary | Chain of custody documentation |
| Incident Report | Active Visit | Datix-style adverse event logging |
| Lone Worker Check-in | Active Visit | Staff safety monitoring |
| PBS Care Plans | Care Plan | Person-centred behaviour support |
| Allergy Banners | Client Overview, Medication | Medication safety |
| Audit Trail | Admin Dashboard → CQC | Full event log with timestamps |

---

*End of CAREi Source Code Document*
*Repository: https://github.com/ManLikeLight/CAREi*
