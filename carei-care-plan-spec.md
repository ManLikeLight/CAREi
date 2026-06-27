# CAREi — Care Plan Feature Specification
**Version:** 1.0  
**Date:** June 2026  
**Prepared for:** App Development Team  

---

## 1. Overview

The Care Plan feature is a core part of the CAREi platform. It allows **care managers** to author, edit, and publish structured care plans against individual client profiles. Once published, the care plan is immediately visible to **carers** assigned to that client — both before and during an active visit.

CAREi is a multi-tenant SaaS platform for UK domiciliary care agencies (similar to Birdie or Log My Care). Each agency has managers and carers operating in the same tenant.

---

## 2. User Roles Involved

| Role | Permission on Care Plans |
|---|---|
| **Manager** | Create, read, update, publish, archive care plans |
| **Care Worker (Carer)** | Read-only. View the plan before and during a visit |
| **Agency Admin** | Same as Manager + can delete and export |
| **Family Member** | Read-only summary view (future scope) |

---

## 3. Care Plan Data Model

### 3.1 Care Plan Object

```json
{
  "id": "uuid",
  "clientId": "string (FK → Client)",
  "agencyId": "string (FK → Agency/Tenant)",
  "createdBy": "string (FK → User)",
  "createdAt": "ISO8601 timestamp",
  "updatedBy": "string (FK → User)",
  "updatedAt": "ISO8601 timestamp",
  "status": "draft | published | archived",
  "version": "integer (auto-increment on each save)",

  "objectives":      ["string"],
  "preventive":      ["string"],
  "risks":           ["string"],
  "postMed":         ["string"],
  "lastReview":      ["string"],
  "pbsTriggers":     ["string"],
  "safetyPlan":      ["string"],

  "pbsCalmSigns":       ["string"],
  "pbsCalmActions":     ["string"],
  "pbsAnxiousSigns":    ["string"],
  "pbsAnxiousActions":  ["string"],
  "pbsRiskSigns":       ["string"],
  "pbsRiskActions":     ["string"]
}
```

### 3.2 Client Object (relevant fields)

```json
{
  "id": "uuid",
  "agencyId": "string",
  "name": "string",
  "dob": "date",
  "address": "string",
  "primaryCondition": "string",
  "conditions": ["string"],
  "allergy": "string",
  "chokingRisk": "boolean",
  "chokingHistory": "string",
  "gpName": "string",
  "emergencyContacts": [
    { "name": "string", "relation": "string", "phone": "string" }
  ],
  "assignedCarerIds": ["string"],
  "activePlanId": "string (FK → CarePlan)"
}
```

---

## 4. Manager Flow — Creating & Attaching a Care Plan

### Step 1: Log in as Manager
- Manager logs into CAREi with manager credentials.
- Lands on the **Manager Portal** (dashboard with team stats, alerts, and navigation tiles).

### Step 2: Navigate to Client Management
- Taps **Clients** tile on Manager Portal.
- Sees the full client list for their agency.
- Each client card shows: name, age/condition, assigned carer, visit time, address, status badge.

### Step 3: Open Care Plan Editor
- Each client card has an **"Edit Care Plan"** button.
- Tapping it navigates to the `ManagerCarePlanEditScreen` for that client.
- The editor pre-populates with the **current saved plan** (or sensible condition-based defaults for new clients).

### Step 4: Edit Sections
The care plan editor is a scrollable accordion form with 10 collapsible sections:

| Section | Content | Format |
|---|---|---|
| Care Objectives | What the carer should achieve each visit | Bullet list |
| Preventive Strategies | Risk mitigation steps | Bullet list |
| Risks & Precautions | Active risks with severity context | Bullet list |
| Post-Medication Monitoring | Per-drug monitoring instructions | Bullet list |
| PBS Triggers | What causes distress or behaviour escalation | Bullet list |
| PBS — Calm State | Signs + Staff actions (Green) | 2 × bullet list |
| PBS — Anxious State | Signs + Staff actions (Amber) | 2 × bullet list |
| PBS — Risk State | Signs + Staff actions (Red) | 2 × bullet list |
| Safety Plan | Escalation steps for unsafe situations | Bullet list |
| Review Details | Last reviewed, next review, care package, framework | Bullet list |

Each section is a **textarea** where the manager types one item per line. On save, each line becomes one bullet point in the carer-facing view.

### Step 5: Save
- Manager taps **Save** button (top-right of editor screen).
- The plan is saved and immediately applied to that client's profile.
- A "Last saved [timestamp] by [manager name]" badge appears confirming the author and time.

### Step 6: Plan goes live
- No separate "publish" step in the prototype. In production, optionally add a **Draft → Publish** workflow for manager sign-off before carers can see changes.

---

## 5. Carer Flow — Viewing the Care Plan on Shift

### Entry point A: Before the visit (Client Overview Screen)
- Carer taps a client on their **Today** dashboard.
- On the **Client Overview** screen, a **"Care Plan"** quick-link tile is visible alongside Emergency Contacts.
- Tapping opens the full read-only `CarePlanScreen`.

### Entry point B: During the active visit
- Carer clocks in to start the visit.
- On the **Active Visit** screen, a "Care Plan" shortcut is accessible in the task area.
- Tapping it navigates to the care plan without ending the visit (back returns them to the active visit).

### Entry point C: Contextual cues (inline)
- As the carer ticks off tasks in the active visit (e.g. "Assist with mobility"), **contextual care plan prompts** surface automatically — relevant guidance from the plan appears without the carer needing to open it manually.

### What the carer sees (read-only):
1. **Patient Alert card** — allergies, active conditions, choking risk (red banner)
2. **Standard sections** — each rendered as a titled card with bullet points
3. **PBS Support Plan** — colour-coded state cards (Green/Amber/Red) with signs and actions
4. **PBS Triggers** — known triggers for distress
5. **Safety Plan** — escalation steps

---

## 6. API Endpoints Required

### Care Plan CRUD
```
GET    /api/care-plans/:clientId          — Fetch active plan for client
POST   /api/care-plans/:clientId          — Create new plan (sets status = draft)
PUT    /api/care-plans/:planId            — Update plan (bumps version, sets updatedAt)
PATCH  /api/care-plans/:planId/publish    — Publish draft plan
PATCH  /api/care-plans/:planId/archive    — Archive plan
GET    /api/care-plans/:planId/history    — Fetch version history
```

### Client Management
```
GET    /api/clients?agencyId=             — List clients for agency
POST   /api/clients                       — Create new client
PUT    /api/clients/:clientId             — Update client profile
DELETE /api/clients/:clientId             — Soft-delete client
```

### Auth & RBAC
- All routes require Bearer token (JWT)
- `role` claim in JWT determines access: `manager | carer | admin`
- Carers receive 403 on any write operation to `/api/care-plans`

---

## 7. Key Business Rules

1. **One active plan per client** — a client can only have one `published` plan at a time. Saving a new version archives the previous one.
2. **Immediate availability** — once saved/published, the plan is visible to all assigned carers at the next screen load (no cache delay > 60s).
3. **Audit trail** — every save records `updatedBy` and `updatedAt`. Version history must be accessible to managers.
4. **Allergy and choking risk are NOT editable in the care plan editor** — they come from the client's medical profile and are displayed at the top of the care plan automatically. Changes to these must go through the client profile form with GP sign-off.
5. **PBS framework is mandatory** — all three states (Calm / Anxious / Risk) must have at least one sign and one action before the plan can be published.
6. **Offline behaviour** — carers can view their last-fetched care plan offline. No writes while offline. Queue sync on reconnect.

---

## 8. Screen Inventory

| Screen Name | Route / Key | Role | Purpose |
|---|---|---|---|
| Manager Portal | `/manager-portal` | Manager | Dashboard and nav hub |
| Client Management | `/client-management` | Manager | List all clients, access care plan editor |
| Care Plan Editor | `/manager-care-plan-edit` | Manager | Author and save care plan sections |
| Client Overview | `/client-overview` | Carer | Pre-visit briefing; care plan entry point A |
| Active Visit | `/active-visit` | Carer | In-visit screen; care plan entry point B |
| Care Plan (read-only) | `/care-plan` | Carer | Full care plan view |

---

## 9. Prototype vs. Production Delta

| Feature | Prototype | Production |
|---|---|---|
| Care plan editor | ✅ Built (accordion form, all 10 sections) | Same UX, connected to API |
| Carer read-only view | ✅ Full render with PBS + safety plan | Same |
| Contextual task cues | ✅ Per task-step | Same, richer |
| Draft → Publish workflow | ❌ Save is immediate | Add draft state + publish button |
| Version history | ❌ | Full audit log with diff view |
| GP / manager sign-off | ❌ | Digital signature on publish |
| Multi-agency tenancy | ❌ Demo only | Full RBAC + tenant isolation |
| Offline support | ❌ | Cache last plan, sync on reconnect |
| PDF export | ❌ | Export care plan as PDF for CQC compliance |
| Family portal view | ❌ | Summarised read-only view for family members |

---

## 10. Compliance Notes (UK)

- Care plans must comply with **CQC Fundamental Standard 9** (Person-centred care)
- All plans should reference the framework in use: PBS, Person-Centred, Dementia Care Mapping, etc.
- Review cycle is typically 6 months or after a significant health event
- Data must be stored within the **UK/EEA** (UK GDPR compliance)
- Access logs must be retained for audit purposes (ICO requirement)

---

*End of specification. For questions, contact the CAREi product team.*
