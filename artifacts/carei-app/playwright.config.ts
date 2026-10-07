import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Use Replit's system Chromium when available; elsewhere use Playwright's
// downloaded browser (pnpm exec playwright install chromium).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Cold Vite transforms, Web Crypto and multiple reloads can exceed 30s on
  // shared runners. Keep individual assertion deadlines unchanged.
  timeout: 90_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5179",
    browserName: "chromium",
    launchOptions: { executablePath },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Dedicated shell server, not the live preview. All API traffic is stubbed
  // in fresh browser contexts: no production account or care data is used.
  webServer: {
    command: "pnpm run dev",
    env: { PORT: "5179", BASE_PATH: "/", NODE_ENV: "production", CAREI_BROWSER_TEST: "1" },
    url: "http://127.0.0.1:5179",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
