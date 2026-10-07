# Encrypted offline storage browser regressions

Run from the repository root:

```sh
pnpm --filter @workspace/carei-app test:browser
pnpm --filter @workspace/carei-app typecheck:browser
```

On a machine without Chromium, first run `pnpm --filter @workspace/carei-app exec playwright install chromium`. A custom system browser can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

The suite starts an isolated Vite server on port 5179. It uses fresh browser contexts, synthetic accounts/visits, and intercepted API responses. It never accesses the real care-record API or database. Web Crypto, IndexedDB, browser offline mode, PIN unlock, and the app's reconnect/wipe listeners are real production implementations.

Covered: no-signal capture; inspection of ciphertext on disk; recovery across a real reload and offline PIN unlock; automatic reconnect drain; partial upload failure/retry; expiry scoping; remote wipe via the actual status/acknowledgement flow; preservation of unrelated localStorage, sessionStorage and IndexedDB.

The capture is performed through the production ingestion boundary, not by navigating the visit form. These are browser integration regressions, not a full visit-form or backend authorization test. The reload temporarily permits loading the app shell while ingestion remains unavailable: CAREi does not currently have a service worker/offline shell cache. This test proves queued care data survives reload; it does not claim the app can cold-start without a network connection.

Failures retain a trace and screenshot in `test-results/`; the HTML report is in `playwright-report/`. These generated directories are ignored by Git.
