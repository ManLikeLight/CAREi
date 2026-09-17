---
name: Care assistant trust boundaries
description: Durable authorization and offline-draft rules for CAREi's guidance assistant.
---

Assistant audit identity must come from a short-lived, server-signed carer session rather than request-body identity. Client care-plan retrieval must reject IDs and names outside the clients legitimately exposed by CAREi.

**Why:** Caller-supplied carer and client fields allow false audit attribution and unauthorised retrieval of persisted care-plan context.

**How to apply:** Issue the assistant token only after successful authentication, verify carer role and expiry on every assistant call, derive audit identity from the token, and validate client scope before database access.

Encrypted assistant drafts must hydrate strictly and writes must be serialised per draft key.

**Why:** Treating unreadable ciphertext as an empty draft or allowing asynchronous keystroke saves to complete out of order can silently erase a carer's offline question.

**How to apply:** Block autosave after strict-read failure, preserve visible input, order encrypted writes, and clear the stored draft only after a successful assistant response.