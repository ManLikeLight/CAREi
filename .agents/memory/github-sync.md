---
name: GitHub sync through the connected integration
description: Terminal authentication and stale remote refs can fail despite a working GitHub connection
---

Do not assume terminal Git credentials work merely because the GitHub integration is connected.

**Why:** Terminal push rejected its credential while the authenticated GitHub proxy worked; a stale remote-reference lock also prevented fetch from updating its tracking ref even though objects were downloaded.

**How to apply:** Resolve the current GitHub connection, preserve the latest remote commit as the parent, upload only committed content, verify the resulting tree equals the tested local tree, and update the branch with force disabled. Never remove locks or force-push to hide a mismatch.
