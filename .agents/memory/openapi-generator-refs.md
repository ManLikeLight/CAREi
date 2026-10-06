---
name: OpenAPI generator external path references
description: Orval 8 external path-item references failed despite URI encoding
---

Prefer inline path items in the main OpenAPI document when using the current Orval 8 generator.

**Why:** External path-item references first failed URI validation for braces, then failed resolution under Orval's internal x-ext namespace after encoding; inline path definitions generated successfully.

**How to apply:** Do not assume external path-item references work merely because they are valid OpenAPI. For future splits, verify generation before depending on the split contract.
