---
name: Workspace dependency installation
description: Missing declared packages and the generic installer's workspace-root limitation
---

Do not add a duplicate dependency at the workspace root to fix a missing installed package in an artifact.

**Why:** The generic package installer invoked `pnpm add` at the repository root, which pnpm correctly rejected; it could not target the artifact whose already-declared dependency was missing. The tracked manifests and lockfile were correct, but installed dependencies were incomplete.

**How to apply:** Check the artifact manifest and lockfile first. Follow the package-management skill; when its installer cannot scope an already-declared workspace dependency, restore the workspace from the frozen lockfile rather than disabling pnpm's root guard or adding another declaration.
