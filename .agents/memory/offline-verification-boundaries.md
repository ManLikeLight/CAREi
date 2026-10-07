---
name: Offline verification boundaries
description: Distinguish encrypted queue durability from offline app startup and real server integration.
---

Encrypted offline queue verification must distinguish data durability, app-shell availability, and server acceptance. A browser test that permits shell loading during reload and intercepts API responses proves queue recovery and reconnect behavior, not offline cold-start or real backend authorization.

**Why:** Combining these claims can hide a missing offline shell or a client/server contract mismatch while the encrypted storage test passes.

**How to apply:** Keep storage regressions isolated from live care data; state which boundaries are real versus doubled. Add separate offline-start and backend-integration coverage when those capabilities are delivered. API doubles must return correct response shapes, and browser regressions must fail on uncaught page errors.

Concurrent Vite servers using different React modes must not share an optimization cache.

**Why:** A production-mode browser harness can overwrite the development preview's optimized React dependencies, producing a missing JSX development runtime even though the tests pass.

**How to apply:** Isolate test-server dependency caches from managed preview-server caches whenever running them concurrently.

Network-reconnection regressions must isolate development-only page reloads from actual app reconnect behavior.

**Why:** Vite's development client reloaded the test page on reconnect and erased its in-memory harness; the production static build has no such client. This caused a failed test despite durable encrypted data.

**How to apply:** Use production-equivalent reload behavior in the browser harness, while continuing to exercise real offline events, PIN unlock and IndexedDB. Do not hide failures by accepting an absent harness or weakening queue assertions.
