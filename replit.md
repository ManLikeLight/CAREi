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

### Screens (15 total)

| Screen | Key | Notes |
|---|---|---|
| Splash | `splash` | Brand entry |
| OTP Login | `otp` | Any 6-digit code |
| Dashboard | `dashboard` | Quick-action strip: Family, History, Admin |
| Live Visit | `visit` | Timer, lone worker, tasks, body map, care plan, emergency contacts, signature capture |
| Body Map | `bodymap` | SVG body outline, tap to mark pressure sores/bruising/marks |
| AI Copilot | `copilot` | Anthropic claude-sonnet-4-6 with offline fallback |
| Medication | `medication` | Per-med confirm/defer with allergy banner |
| Summary | `summary` | Editable AI-generated handover + read receipt flow |
| Family Portal | `family` | Live visit timeline + agency contact buttons |
| Visit History | `visit-history` | Last 30 days of visits |
| Care Plan | `care-plan` | Objectives, preferences, risks, review dates |
| Emergency Contacts | `emergency` | Next of kin, GP, agency, 999/111 |
| Profile | `profile` | Carer profile + SOS overlay |
| Admin Teaser | `admin` | Manager metrics + carer strip + CQC meters (in phone frame) |
| Admin Dashboard | `admin-dashboard` | **Full-page desktop view** — Carer Overview, Client Roster, CQC Audit Trail, Agency Alerts |

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
