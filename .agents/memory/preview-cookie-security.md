---
name: Preview cookie security
description: External development preview rewrites cookie attributes; CSRF must be independent of SameSite.
---

The external Replit development-preview proxy rewrites `SameSite=Strict` cookies to `SameSite=None; Secure`. Direct API and local preview responses preserve Strict.

**Why:** A browser test reported None despite the server's Strict configuration; comparing redacted Set-Cookie headers across all three paths confirmed the rewrite.

**How to apply:** Do not treat a preview browser reporting None as evidence the server omitted Strict. Use independent CSRF controls for recipient mutations (custom header, fetch metadata, and no credentialed cross-origin access). Never weaken these controls on the assumption that cookie attributes alone provide protection.
