# CAREi — Feature List
**Version:** June 2026 prototype  
**Stack:** React + TypeScript (Vite), mobile-first phone frame (393 × 852 px)  
**Target market:** UK domiciliary care — multi-tenant SaaS (comparable to Birdie / Log My Care)  
**Source:** `CAREiApp.tsx` (7,573 lines) + `AdminDashboard.tsx` (466 lines) = **8,039 lines total**

---

## 1. Authentication & Onboarding

| Feature | Detail |
|---|---|
| Splash screen | Tagline, Sign Up and Log In CTAs |
| Multi-step sign-up | Name → Agency → Role select → PIN creation → personalised avatar reveal |
| Avatar reveal | Shows user's initials, first name, agency, and role badge before routing in |
| PIN login | 4-digit auto-submit; individual digit boxes with keyboard navigation |
| Demo account tiles | Care Worker listed first (teal highlight, primary); Agency Manager below |
| Manual email + PIN login | Defaults to carer flow; role persists in sessionStorage |
| Role select screen | Post-signup prompt to choose Manager or Carer |
| Role switching | "Switch to Manager View / Carer View" button in Profile — no re-login required |

---

## 2. Carer Flow

### 2.1 Today's Care Dashboard
- Daily client schedule with time slots, condition badges, and emoji avatars
- **AI audio briefing** button per client — plays contextual care cues
- **CAREi Assistant** modal — inline AI chat anchored to the current client
- Start / Resume visit per client
- Bottom nav: Today, Copilot, SOS, History, Profile

### 2.2 Client Overview
- Demographics: name, age, address, pronouns
- Condition tags, GP, allergy banner
- Support level, care framework, communication guidance, mobility notes
- Vital-signs threshold display
- Last handover bullets (3 bullet summary from previous carer)
- Contextual care cues per trigger (Breakfast, Mobility, Record Mood)
- Launch points: Active Visit, Care Plan, Emergency Contacts, Body Map

### 2.3 Active Visit
- **Live visit timer** (running clock from check-in)
- Structured task checklist: Personal Care, Nutrition, Mobility, Medication, Wellbeing
- Per-task completion toggle with free-text notes
- **Voice mic** button for hands-free note appending
- PBS/risk context bar (Green / Amber / Red status)
- Quick links: Care Plan, Emergency Contacts
- In-visit navigation: Body Map, Medication, Handover, ContinuCare, Incident Report, Visit History
- **SOS overlay** — full-screen emergency alert with dismiss

### 2.4 Medication Administration
- Client-specific medication list (drug name, dose, due time, dosing gap)
- Time-sensitive flag and admin notes
- **Drug interaction warnings** between co-administered medications
- **Possible duplicate dose alerts** (confirms once-daily medications)
- **Allergy banner** tied to the active client's allergy record
- Controlled drug flag
- Confirm / record administration flow

### 2.5 Body Map
- Interactive front-and-back body silhouette
- Tap to mark a concern; category selector (Wound, Bruise, Redness, Swelling, Rash)
- Severity rating (Mild / Moderate / Severe)
- Free-text description per mark
- Review and delete existing marks

### 2.6 Care Plan Viewer
- Full client care plan (needs, preferences, risk management)
- PBS risk actions tailored to client condition (Dementia / Stroke / Diabetes)
- Safety plan checklist
- Support level and framework display

### 2.7 Visit History
- Per-client visit log with dates and times
- Carer names vary per client (name-seeded logic — not always the same person)
- Status indicators: completed, in-progress

### 2.8 Handover Notes
- Structured form: mood, tasks completed, concerns, key observations
- Pre-populated last-handover bullets per client for continuity
- Free-text with voice mic support

### 2.9 ContinuCare Summary (AI-Generated)
- AI-written visit narrative — client-specific, condition-aware language
- Approval status (pending / approved)
- Actionable follow-up items for next carer

### 2.10 Emergency Contacts
Client-specific family and clinical contacts, always followed by universal services:

| Client | Primary NOK | Secondary | GP |
|---|---|---|---|
| Mary Johnson | Robert Johnson (Son) | Susan Johnson (Daughter) | Dr A. Patel · Earley Surgery |
| Tom Adams | Patricia Adams (Wife) | James Adams (Son) | Dr M. Clarke · Castle Hill Surgery |
| Aisha Khan | Imran Khan (Son) | Yasmin Khan (Daughter) | Dr F. Hassan · Woodley Health Centre |

Universal appended contacts: Agency on-call line, Care Manager on-call, **999**, **111**

- Primary NOK highlighted with teal badge
- One-tap "Call" button per contact

### 2.11 Incident Report
- Incident type, location, description, witnesses
- Severity selection
- Submit with confirmation

### 2.12 Family Portal
- Client-specific family summary view
- Task list varies by client condition (Stroke / Diabetes / Dementia)
- Approval flow — family can read and acknowledge visit summary
- Carer name and agency attribution

### 2.13 CAREi Copilot
- Dedicated AI chat screen
- Context-aware (client name injected where applicable)
- Pre-populated prompt suggestions

### 2.14 Rota
- Weekly rota view with shift cards
- Carer assignment per time slot

### 2.15 Schedule
- Full daily / weekly schedule screen

### 2.16 Operations / Admin Teaser
- Read-only live metrics: Carers on Shift, Active Alerts, Compliance Score
- Carer status cards (Active / Late / Break / Done)
- Visit status overview
- Quick links to Schedule and Manager Approvals

### 2.17 Profile
- User card: initials avatar, name, email, agency, role badge
- **Switch to Manager View / Carer View** toggle
- Settings button (routes managers to Agency Settings)
- Sign Out

---

## 3. Manager Portal

### 3.1 Manager Portal Home
- KPI cards: Active Carers, Visits Today, Compliance %, Open Alerts
- Pending approvals badge (live count)
- Quick-links: Team, Clients, Approvals, Dashboard, Agency Settings, Sign Out

### 3.2 Team Management
- Full carer roster: name, email, role, status, last active, visit count, DBS expiry, compliance %
- Toggle active ↔ suspended per carer
- Invite new carer button

### 3.3 Invite Carer
- Multi-step invite flow (name → email → role → send)
- Confirmation / success state

### 3.4 Client Management
- Client list with assigned carer (cycles through active team — not always the same person)
- Condition badges, address, visit frequency
- Add / edit client entries

### 3.5 Manager Approvals
- Visit summary approval queue
- Approve / Request Revision actions
- Pending count surfaced on Manager Portal home

### 3.6 Agency Settings
- **Profile & Branding** — agency name, logo placeholder
- **Team & Permissions** — role management configuration
- **Notification Preferences** — toggleable notification channels
- **Billing & Subscription** — plan overview
- **Security & Data Privacy:**
  - Change PIN — bottom sheet with 4-digit input, confirm, and save (with toast confirmation)
  - Data export, audit log access, two-factor auth — all with toast feedback on tap

---

## 4. Full Admin Dashboard (`AdminDashboard.tsx`)

| Panel | Content |
|---|---|
| Carer Overview | Status, compliance score, visit count per carer |
| Client Roster | Risk level, condition, assigned carer |
| Audit Trail | Timestamped action log (who did what, when) |
| Agency Alerts | Severity-graded risk items requiring attention |
| Ring Charts | Visual compliance % and visit completion rate |
| Navigation | "Switch to Carer View" entry point |

---

## 5. Design System & Cross-Cutting

| Element | Value |
|---|---|
| Primary colour | Teal `#4FD1C5` / `#38B2AC` |
| Background | Dark Navy `#0F1D34` / Navy `#1B2A49` |
| Accent | Amber `#F6B73C`, Red `#FF5A5F`, Green `#22C55E` |
| Typography | DM Serif Display (headings), DM Sans (body) |
| Animations | CSS dot loaders, fade-in AuthSuccess, smooth opacity transitions |
| Scroll areas | Custom phone-frame scrollbars (`phone-scroll` class) |
| Notifications | In-screen toast system used throughout |
| Role-aware UI | Conditional rendering for manager vs. carer views throughout all screens |
| Data consistency | Client condition, meds, allergy, contacts, and care plan are all consistent across every screen for the same client |
| Voice input | `VoiceMicButton` component available on note fields across multiple screens |

---

## 6. Demo Data

**Care Worker demo account:** Sarah O'Brien · sarah@adjoy.co.uk · Adjoy Healthcare  
**Agency Manager demo account:** Alex Morgan · alex@adjoy.co.uk · Adjoy Healthcare

**Clients on the schedule:**
1. Mary Johnson, 82 — Dementia, Osteoporosis, Hypothyroidism · 09:00–10:00
2. Tom Adams, 75 — Post-Stroke, Hypertension, Dysphagia Risk · 10:30–11:00
3. Aisha Khan, 69 — Type 2 Diabetes, Hypertension, Peripheral Neuropathy · 12:00–13:00
