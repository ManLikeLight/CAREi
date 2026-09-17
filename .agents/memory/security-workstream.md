---
name: CAREi security workstream
description: Durable security decisions for PIN migration, encrypted offline storage, sessions, remote wipe, and audit records.
---

CAREi must fail closed before serving traffic if any carer record still contains a plaintext PIN; migration verification is part of startup safety, not a best-effort login side effect.

**Why:** Existing authentication records are stored separately from care data, so a successful login alone cannot prove the whole account set is safe.

**How to apply:** Preserve the split storage boundary, use signed sessions for identity and manager/admin actions, keep remote wipe scoped to a registered device, and record security events without putting PINs, tokens, or care content in metadata.