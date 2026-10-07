---
name: OpenAPI generator external path references
description: Orval 8 path-reference and boolean-const validation limitations
---

Prefer inline path items in the main OpenAPI document when using the current Orval 8 generator.

**Why:** External path-item references first failed URI validation for braces, then failed resolution under Orval's internal x-ext namespace after encoding; inline path definitions generated successfully.

**How to apply:** Do not assume external path-item references work merely because they are valid OpenAPI. For future splits, verify generation before depending on the split contract.

Explicitly enforce security-sensitive boolean confirmations at the server boundary.

**Why:** The current Orval 8 generator emitted `zod.boolean()` for an OpenAPI boolean `const: true`; generated validation accepted false even though the specification required true.

**How to apply:** For verification/consent confirmations that must be true, check the parsed value is exactly true rather than relying only on generated-schema success. Verify generated output before removing this semantic check.
