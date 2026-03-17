# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the CAREi AI-powered domiciliary care management app prototype.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude (via Replit AI Integrations)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── carei-app/          # CAREi React + Vite frontend (main app at /)
│   └── api-server/         # Express API server (/api)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-anthropic-ai/ # Anthropic AI client
├── scripts/                # Utility scripts
└── attached_assets/        # Project assets (CAREi logo)
```

## CAREi App

Mobile-first React prototype for UK domiciliary care platform targeting CQC-regulated home care agencies.

### Screens (20 total)

**New flow (default after login):** Today's Care → Active Visit → ContinuCare Summary

| Screen | Key | Notes |
|---|---|---|
| Splash | `splash` | Brand entry |
| OTP Login | `otp` | Logs into **Today's Care** (new default) |
| **Today's Care** | `today` | Visit schedule with status chips, CAREi Assistant FAB, SOS |
| **Active Visit** | `active-visit` | Lone worker banner, tabs (Care Notes / Medications / Info), medication blocker on Complete Visit |
| **ContinuCare Summary** | `continucare-summary` | AI visit handover; marks visit completed, returns to Today's Care |
| **Operations** | `operations` | Compliance alerts, visit status overview, → Schedule |
| **Schedule** | `schedule` | Morning/Afternoon/Evening slots with carer assignment |
| Dashboard (legacy) | `dashboard` | Old quick-action strip |
| Live Visit (legacy) | `visit` | Old timer + lone worker screen |
| Body Map | `bodymap` | SVG body outline — back navigates to caller (active-visit or visit) |
| AI Copilot | `copilot` | Anthropic claude-sonnet-4-6 with offline fallback |
| Medication | `medication` | Per-med confirm/defer with allergy banner |
| Summary (legacy) | `summary` | Old AI-generated handover |
| Family Portal | `family` | Live visit timeline + agency contact buttons |
| Visit History | `visit-history` | Last 30 days of visits |
| Care Plan | `care-plan` | Objectives, preferences, risks — back navigates to caller |
| Emergency Contacts | `emergency` | Next of kin, GP, agency, 999/111 — back navigates to caller |
| Profile | `profile` | Carer profile + SOS overlay |
| Admin Teaser | `admin` | Manager metrics + carer strip + CQC meters (in phone frame) |
| Admin Dashboard | `admin-dashboard` | **Full-page desktop view** — Carer Overview, Client Roster, CQC Audit Trail, Agency Alerts |

### Schedule Clients
- **Mary Johnson** (82, Dementia) — Morning
- **Tom Adams** (75, Post Stroke) — Afternoon
- **Aisha Khan** (69, Diabetes) — Evening

### State added
- `visitStatuses` — `{mary, tom, aisha}` → `"pending" | "in-progress" | "completed"`
- `activeClientId` — which SCHEDULE_CLIENTS entry is being visited
- `assignedCarers` — carer name per client id
- `showAssistant` — controls CAREiAssistantModal slide-up overlay
- `visitReturnScreen` — tracks whether bodymap/care-plan/emergency should return to `"visit"` or `"active-visit"`

### Key architectural notes
- `AdminDashboard.tsx` is a separate file rendered outside the phone frame
- Session storage persists current screen across reloads
- Signature capture uses canvas `ref` with mouse + touch event handlers
- Offline indicator tracks `navigator.onLine` via event listeners
- Summary screen text is editable via `<textarea>` before submission
- Handover read receipt is a 3-state flow: edit → read receipt → success

### Screens
1. **Splash** — CAREi logo, teal gradient tagline, compliance badges
2. **OTP Login** — Email + 6-digit OTP (pre-filled: sarah.johnson@adjoy.co.uk / 123456)
3. **Carer Dashboard** — Stats, visit cards, AI floating button
4. **Live Visit** — Timer, lone worker, tasks, AI Copilot card, incident reports, voice notes
5. **AI Copilot** — Chat UI backed by Anthropic claude-sonnet-4-6 with Grace Mensah's care context
6. **Medication Confirmation** — Per-med confirm/flag workflow
7. **ContinuCare+ Summary** — AI-generated handover note
8. **Profile** — Carer details with sign out
9. **SOSOverlay** — Two-step SOS alert modal

### Client Data
Grace Mensah, 83, Reading. Conditions: Hypertension, T2 Diabetes, Mild Cognitive Impairment. Allergy: Penicillin.

### Design System
- **Fonts**: DM Sans (body), DM Serif Display (logo/headers)
- **Colors**: Navy #1B2A49, Dark Navy #0F1D34, Teal #4FD1C5, Amber #F6B73C, Red #FF5A5F, Green #22C55E
- **Phone frame**: 393×852px, navy border, 52px border-radius

## API Routes

- `GET /api/healthz` — Health check
- `POST /api/anthropic/chat` — AI Copilot chat (uses claude-sonnet-4-6)
- `POST /api/anthropic/summary` — ContinuCare+ visit summary generation
