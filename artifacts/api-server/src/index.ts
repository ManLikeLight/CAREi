import app from "./app";
import { drainFamilyUpdates } from "./family-update-processor";
import { migrateLegacyPins } from "./routes/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  const migration = await migrateLegacyPins();
  console.log(
    `PIN migration verified: scanned ${migration.scanned}, migrated ${migration.migrated}; no plaintext PINs remain.`,
  );

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    const timer = setInterval(() => void drainFamilyUpdates(), 15_000);
    timer.unref();
    void drainFamilyUpdates();
  });
}

void start().catch((error) => {
  console.error("API startup blocked by security migration failure:", error);
  process.exitCode = 1;
});
