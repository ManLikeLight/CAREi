---
name: Voice documentation safety
description: Durable data-safety rules for asynchronous and offline visit-note dictation.
---

Finalized speech must be durably encrypted before any processing-ownership check or network structuring. Async results and visit-completion cleanup must use exact draft identity and revision checks rather than boolean applied state.

**Why:** Structuring, edits, repeat dictation, offline queueing, and visit completion can overlap. A generic processing guard or unconditional cleanup can otherwise lose a newer transcript or resurrect an older applied one.

**How to apply:** Preserve pending captures first, compare immutable draft identity plus revision/full snapshot before committing structured output, remove only the exact applied queue item, and delete a current draft only when its identity matches.