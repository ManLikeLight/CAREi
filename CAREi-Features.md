# CAREi — Full Feature Overview

---

## 🏠 Landing / Splash Screen
- CAREi logo with animated "i" accent in teal
- Tagline: *"Built for the carer, by a carer"*
- Three feature badges: **AI Powered · GDPR Ready · Built for UK care compliance**
- Sub-tagline: *"Intelligent Care. Every Visit."*
- Two entry points: **Sign Up** and **Log In**

---

## 👤 Sign Up / Log In

**Sign Up**
- Full name, agency/organisation name, email address
- OTP (one-time passcode) verification flow before access is granted

**Log In**
- Email + OTP verification
- Returns carer to their named profile and agency

Both flows feed `carerName` and `carerAgency` into every screen — fully multi-agency, not hardcoded to any organisation.

---

## 📅 Today's Dashboard
The home screen after login. Shows the carer's day at a glance.

- Date header with carer name and agency
- **Today's schedule** — list of clients with name, emoji avatar, time window, condition tags, and address
- **Start Visit** button per client → navigates to Active Visit
- **Compliance Score ring** (overall %)
- **Live alerts panel** — e.g. lone worker overdue, missed medications, incidents
- **Quick-action tiles**: AI Copilot, Rota, Operations, Schedule, Family Portal, Profile

---

## 👁 Client Overview Screen
Shown before starting a visit. Full pre-visit brief for the selected client.

- Client name, age, condition, pronouns, GP, address
- **Allergy banner** (red, prominent) — e.g. "Sulfonamides: do not administer"
- **Choking risk banner** with full protocol (for clients with dysphagia)
- Support level and care framework (PBS, Person-Centred, Stroke Rehab, Trauma-Informed, etc.)
- Communication guidance tailored per client
- Mobility note
- Medication summary note
- Last handover bullets from previous carer
- **Contextual care cues** — guidance that surfaces at the right moment during a visit
- Condition tags (e.g. Dementia, Post Stroke, Diabetes, Medication Required)
- **Start Active Visit** button

---

## 🟢 Active Visit Screen
The core working screen during a visit.

### Header
- **"Active Visit"** title with live elapsed timer (⏱ 00:02:15)
- **Clocked in HH:MM** — clock-in time captured at screen mount, shown in teal, fixed throughout the visit
- **SOS button** (red, top right) — one-tap emergency
- Client card: name, age, condition, AI Copilot shortcut button

### Persistent Controls Row
- **Lone Worker Safety** — auto-activates on clock-in; shows elapsed time since last check-in; turns full red and shows "Check-in overdue!" after 25 minutes; "Check In ✓" resets the timer; can be manually toggled if working with a colleague
- **Fluid intake counter** — quick +1 glass, colour shifts green at 6 glasses
- **Offline banner** — appears if device loses connectivity; confirms data will sync on reconnect

---

### Section 1 — Care Tasks
Three contextual tasks per client (e.g. Prepare breakfast / Assist with mobility / Record mood):
- Tap to complete; timestamp recorded and clamped to clock-in time (numeric comparison — never earlier than clock-in)
- Contextual care cue card auto-surfaces when a task is ticked (client-specific guidance)
- Meal prompt appears when the breakfast task is ticked (if meal status not yet set)

---

### Section 2 — Medications Due

**Drug Interaction Alert** — shown at the top of the medication list if two or more interacting medications are both scheduled. Advisory only, never blocks. Example: *"Aspirin may reduce Lisinopril's blood pressure-lowering effect — monitor BP closely after both are given."*

**Medication Due-Time Alert Banners** (live, driven by real clock):

| Banner | Trigger | Dismissible |
|--------|---------|-------------|
| 🔔 Amber — "Due in X min" | Unactioned med within 5 min of due time | Yes |
| ⚡ Teal — "Due NOW — give within 5 min of due time" | Time-sensitive med in its ±5 min window | Yes |
| 🚨 Red — "Window passed — supervisor notified" | Time-sensitive med, window closed, not yet given | No |
| Red — "Overdue" | Non-time-sensitive med >30 min past due, not given | Yes |

**Per-medication cards:**
- Drug name, dose, due time, administration note
- **CONTROLLED** badge (purple) + "Witness required at administration" prompt
- **Two-person sign-off flow** for controlled drugs: carer taps "Both Signed, Confirm" → enters witness name → confirmed with "👥 Witnessed: [name]" badge
- **✓ Given** button → overdose safeguard check for flagged medications (asks carer to confirm dose not already given) → time picker (rounds to nearest 5 min) → confirmed with timestamp badge
- **✗ Not Given** → structured refusal form: reason, what the carer said to the client, action taken, free-text note
- All timestamps clamped to clock-in time

---

### Section 3 — Care Notes

**Vital Signs** (shown for any client with a personal BP baseline, or where vitals are clinically required):

Individual baselines per client:
| Client | Condition | Baseline |
|--------|-----------|---------|
| Mary Johnson | Dementia, Osteoporosis, Hypothyroidism | 125/78 mmHg |
| Tom Adams | Post-Stroke, Hypertension, Dysphagia | 130/82 mmHg |
| Aisha Khan | Type 2 Diabetes, Hypertension, Peripheral Neuropathy | 138/85 mmHg |

- Baseline displayed in the card header
- Client-specific threshold advisory shown in red where applicable
- Fields: Systolic, Diastolic, Pulse, O₂ Sat
- On entry, BP is compared against the client's **personal baseline**:
  - 🔴 **Elevated** — >15 sys or >10 dia above personal baseline: *"BP elevated above [name]'s personal baseline — advisory: notify your office immediately"*
  - 🔴 **Low** — systolic <90 or diastolic <60: *"BP is low — advisory: monitor for dizziness, do not leave unattended. Notify office."*
  - All alerts are advisory only; the carer always decides

**Fluid & Nutrition:**
- Fluid glasses counter (0–12), turns green at 6
- Meal status: Full / Half / Refused
- Nutrition notes field

**Mood & Wellbeing:**
- Mood selector: Happy / Calm / Anxious / Distressed / Tired / In Pain
- Free-text wellbeing note

**Incident Reporting (inline):**
- Quick inline log: severity (Low / Medium / High), incident type, free-text note
- Submits without leaving the visit screen

**Voice Memo:**
- Tap-to-record; live recording timer; playback

### Complete Visit Button
- Disabled until all medications are acknowledged (given or documented as not given)
- Triggers completion with full visit data payload: tasks, medications, times, notes, mood, fluid, vitals, witness names

---

## 📋 Handover Screen
Post-visit screen before the summary is generated.

- Client name and visit time range
- Carer's written handover note
- Summary of what was completed
- Submit Handover → moves to ContinuCare+ Summary

---

## ✨ ContinuCare+ Summary Screen
The permanent, timestamped visit record — structured for clinical handover.

- Visit timeline: clock-in, tasks with timestamps, medications, vitals save, clock-out
- Tasks completed with individual times
- Medications:
  - Given: drug name, dose, time given
  - Controlled drugs: "👥 Witnessed by: [witness name]"
  - Not given: drug name + documented reason
- Vitals recorded (if taken)
- Fluid intake and meal status
- Mood and wellbeing
- Carer's handover note
- Incident flag (if raised)
- **Audit Trail Complete** badge

---

## 🗺 Body Map Screen
- Interactive anterior and posterior body diagram
- Tap to mark skin integrity changes, injuries, pressure areas
- Each mark: type selector and notes field
- **Audit** badge — body map logged with timestamp

---

## 📖 Care Plan Screen
Full care plan for the selected client, split into tabs:
- **Overview** — conditions, allergy, support level, communication guidance, mobility
- **PBS / Framework** — behaviour support strategies, anxiety signs, green/amber/red states, de-escalation steps
- **Medications** — full medication list with doses and notes
- **History** — previous visit summaries

---

## 🚑 Emergency Contacts Screen
- Client's GP
- NHS 111 / 999 quick-dials
- Agency office number (dynamic, uses `carerAgency`)
- DNAR / advance directive notice if applicable

---

## 🕐 Visit History Screen
- Chronological list of previous visits for the selected client
- Each entry: date, carer name, summary, mood, medication status
- Tap to expand the full visit summary

---

## 🗓 Rota Screen
- Weekly rota view for the logged-in carer
- Days with scheduled visits highlighted
- Client name, time slot, address per entry

---

## ⚙️ Operations Screen
- Agency-level operational metrics overview
- Compliance figures, outstanding actions, staffing notes

---

## 📆 Schedule Screen
- Full client schedule list for the carer
- Each client card: name, time, condition tags, address
- Tap → Client Overview → Active Visit flow
- Dynamic `carerAgency` label throughout

---

## 👨‍👩‍👧 Family Portal Screen
Simulates what a family member sees (accessible via carer's app for demo).

- Live visit timeline: carer arrived, tasks in progress, estimated end time
- "Today's summary will be available once approved by the manager"
- Read receipt tracking
- Message the agency (sends a message to the care team)
- Call agency button

---

## 📄 Family Summary Screen
The manager-approved visit summary released to the family.

- Client's first name, today's date
- Carer name and visit duration
- Summary: tasks, meals, medication, mood, any concerns
- Carer's personal note to the family
- "Managed by [Agency]" branding
- Pending / Approved status banner

---

## 🔐 Manager Approvals Screen
The manager review and release workflow.

**Status banner** — ⏳ Awaiting approval / ✅ Released to family

**If no completed shift yet:**
- Placeholder: "No completed shift to review — a summary will appear once a carer submits a visit"

**If a visit has been submitted (live data from the actual shift):**
- Client name + today's date
- Carer name + actual visit time range (e.g. "09:02–10:15")
- Summary table:
  - Tasks completed (e.g. "2 / 3")
  - Medications given (e.g. "2 / 2, all as prescribed" or "1 / 2 — 1 not given")
  - Meal status
  - BP recorded / Not recorded / Not required
  - Concerns raised (flags skipped meds, distressed/anxious mood)
  - Carer's note (truncated preview)
- **Medication Log strip** — each drug: "✓ Given at HH:MM" or "✗ [refusal reason]"
- **Read Receipt** — whether family has opened the summary and at what time
- **Approval Checklist** (pre-release gate):
  - Carer's note is appropriate for family reading
  - No clinical concerns requiring a phone call first
  - Medication log complete and accurate
  - No safeguarding issues flagged
- **✓ Approve & Release to Family** button
- Post-approval: green "Released ✓" confirmation with client's first name

---

## 🤖 AI Copilot Screen
Context-aware AI assistant (OpenAI-powered), available during and outside visits.

- Pre-loaded with carer name, agency, and current client context
- Handles clinical queries: medication interactions, condition-specific guidance, care approach questions
- Suggested prompts tailored to the current client
- Full chat interface with message history
- Understands the current visit context (client name, conditions, medications)

---

## 👤 Profile Screen
- Carer avatar with initials
- Name, email, agency/organisation (all dynamic)
- Stats: visits completed, compliance score, years of service
- Settings tiles: notifications, language, accessibility
- Sign Out

---

## 🛡 Admin / Compliance Dashboard

**Admin Teaser Screen** (carer-facing preview):
- Compliance Score ring
- Today's metrics: Compliance Today %, visits completed, incidents
- "Admin features available for managers" upgrade prompt

**Admin Dashboard** (manager-facing):
- Overall Compliance Score ring with breakdown
- Live alert feed (lone worker overdue, missed medication, incident raised)
- Audit Trail entries with timestamps
- Staff performance table
- Pending approvals count
- Export and reporting actions

---

## 🌐 Cross-Cutting Platform Features

| Feature | Detail |
|---------|--------|
| **Multi-agency** | `carerAgency` prop propagates to every screen — works for any UK care provider |
| **UK-neutral compliance** | No CQC references — "Compliance Score", "Audit Trail", "Built for UK care compliance" |
| **GDPR Ready** | Badge on splash; data framing throughout the app |
| **Offline support** | Offline banner; local data queued and syncs on reconnect |
| **Phone-frame UI** | 393×852px mobile-first frame; all screens scroll within it |
| **Dark theme** | Consistent dark navy (#0F1D34 / #1B2A49) with teal (#4FD1C5) accents |
| **Audit trail** | Every action timestamped and clamped to clock-in; witness names recorded for controlled drugs |
| **Time clamping** | All task, vitals, and medication times use numeric comparison — never earlier than clock-in |
| **Lone worker safety** | Auto-activates on clock-in; 25-minute check-in window; overdue alert escalates visually |
