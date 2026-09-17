---
name: Family update delivery safety
description: Durable consent, sync, privacy, and idempotency rules for automated family updates.
---

Family update outbox entries must be created transactionally with a newly synced canonical visit, only when an active per-client/per-member consent exists and the signed carer identity matches the visit.

**Why:** Client-side completion, unauthenticated ingestion, or non-transactional side effects can send updates from unsynced, fabricated, or duplicate visit data.

**How to apply:** Keep offline visits queued locally, enqueue once after authenticated server persistence, use a visit/member uniqueness key, and recheck consent atomically when publishing.

AI output must not become family-visible free-form prose. The model may select or order approved fact IDs, but the server renders the final summary exclusively from validated structured visit facts.

**Why:** Prompt instructions alone cannot guarantee that generated prose will avoid inventions or leak internal notes, medication details, staff identity, or clinical context.

**How to apply:** Exclude raw notes and staff/medication data from the model input, validate every returned fact ID, and render only fixed family-safe sentence templates.