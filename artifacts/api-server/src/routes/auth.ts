/**
 * Auth routes — PIN signup / login with bcrypt hashing
 * Includes remote-wipe / deactivation endpoints.
 *
 * PIN storage:  bcrypt hash (cost factor 12) — raw PIN is never stored.
 * Migration:    Records with a legacy plain-text `pin` field are migrated
 *               on first successful login (hash stored, plain field removed).
 */

import { Router, type IRouter, type Request } from "express";
import Database from "@replit/database";
import bcrypt from "bcryptjs";
import {
  issueAssistantSession,
  verifyAssistantSession,
  type AssistantSession,
} from "../assistant-session";
import { recordSecurityEvent } from "../security-events";
import { clearSession, establishSession } from "../auth-session";

const db = new Database();
const router: IRouter = Router();
const BCRYPT_ROUNDS = 12;

// ── Types ────────────────────────────────────────────────────────────────────

type CarerRecord = {
  name: string;
  email: string;
  agency: string;
  role?: "carer" | "manager" | "admin";
  /** bcrypt hash of the PIN */
  pinHash: string;
  /** Legacy field read only by the startup migration, never by login. */
  pin?: string;
  /** Legacy account-wide wipe flag retained for one-way compatibility. */
  wipeRequested?: boolean;
  /** Account has been deactivated (also triggers wipe on next device check-in) */
  deactivated?: boolean;
  /** Device-specific wipe requests keyed by random device id. */
  deviceWipes?: Record<string, { requestedAt: string; requestedBy: string }>;
  /** Devices that have authenticated for this account. */
  devices?: Record<string, { firstSeenAt: string; lastSeenAt: string }>;
};

// ── DB helpers ───────────────────────────────────────────────────────────────

function makeKey(email: string): string {
  return `carer_${email.toLowerCase().trim()}`;
}

async function dbGet(key: string): Promise<CarerRecord | null> {
  const result = await db.get(key);
  if (result.ok) return (result.value as CarerRecord | null) ?? null;
  const err = result.error as { statusCode?: number; message?: string };
  if (err?.statusCode === 404) return null;
  throw new Error(`DB get failed: ${err?.message ?? JSON.stringify(err)}`);
}

async function dbSet(key: string, value: CarerRecord): Promise<void> {
  const result = await db.set(key, value);
  if (!result.ok) throw new Error(`DB set failed: ${JSON.stringify(result.error)}`);
}

async function audit(input: Parameters<typeof recordSecurityEvent>[0]): Promise<void> {
  try {
    await recordSecurityEvent(input);
  } catch (error) {
    console.error("Security audit event failed:", error);
  }
}

function bearerSession(req: Request): AssistantSession | null {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  return token ? verifyAssistantSession(token) : null;
}

function safeRecord(record: CarerRecord): CarerRecord {
  if (record.pin !== undefined) {
    throw new Error("Legacy plaintext PIN remains after startup migration.");
  }
  if (!record.pinHash) {
    throw new Error("Account has no PIN hash.");
  }
  return record;
}

/**
 * Migrate every legacy carer record before the server accepts traffic.
 * This is intentionally fail-closed: a migration error must not leave an
 * account with a plaintext PIN while the API is serving requests.
 */
export async function migrateLegacyPins(): Promise<{
  scanned: number;
  migrated: number;
}> {
  const listed = await db.list("carer_");
  if (!listed.ok) {
    throw new Error(`Could not list carer records: ${JSON.stringify(listed.error)}`);
  }

  let migrated = 0;
  for (const key of listed.value) {
    const result = await db.get(key);
    if (!result.ok || !result.value) continue;
    const record = result.value as CarerRecord;
    if (record.pin === undefined) continue;

    const pinHash = record.pinHash ?? await bcrypt.hash(record.pin, BCRYPT_ROUNDS);
    const { pin: _plaintextPin, ...withoutPlaintextPin } = record;
    await dbSet(key, {
      ...withoutPlaintextPin,
      pinHash,
      wipeRequested: record.wipeRequested ?? false,
      deactivated: record.deactivated ?? false,
    });
    migrated += 1;
  }

  // Verify the invariant after the writes, not just the intended code path.
  for (const key of listed.value) {
    const result = await db.get(key);
    if (result.ok && result.value && (result.value as CarerRecord).pin !== undefined) {
      throw new Error(`Plaintext PIN migration incomplete for ${key}.`);
    }
  }

  return { scanned: listed.value.length, migrated };
}

// ── Signup ───────────────────────────────────────────────────────────────────

router.post("/auth/signup", async (req, res) => {
  const { name, email, agency, pin, role, deviceId } = req.body as {
    name?: string; email?: string; agency?: string; pin?: string;
    role?: "carer" | "manager"; deviceId?: string;
  };

  if (!name || !email || !agency || !pin) {
    res.status(400).json({ error: "All fields are required." });
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits." });
    return;
  }
  if (deviceId && !/^[a-f0-9-]{20,80}$/i.test(deviceId)) {
    res.status(400).json({ error: "Invalid deviceId." });
    return;
  }

  const key = makeKey(email);
  try {
    const existing = await dbGet(key);
    if (existing !== null) {
      res.status(409).json({
        error: "An account with this email already exists. Please log in instead.",
      });
      return;
    }

    const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    const record: CarerRecord = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      agency: agency.trim(),
      role: role === "manager" ? "manager" : "carer",
      pinHash,
      wipeRequested: false,
      deactivated: false,
      devices: deviceId
        ? { [deviceId]: { firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() } }
        : {},
    };
    await dbSet(key, record);
    await audit({
      eventType: "auth.signup.success",
      actorEmail: record.email,
      subjectEmail: record.email,
      metadata: { role: record.role },
    });

    establishSession(res, { name: record.name, email: record.email, agency: record.agency, role: record.role ?? "carer" });
    res.json({
      success: true, name: record.name, email: record.email, agency: record.agency,
      role: record.role, assistantSessionToken: issueAssistantSession({
        name: record.name, email: record.email, agency: record.agency, role: record.role ?? "carer",
      }),
    });
  } catch (err) {
    console.error("Signup error:", err);
    await audit({ eventType: "auth.signup.failure", subjectEmail: email });
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { email, pin, deviceId } = req.body as {
    email?: string; pin?: string; deviceId?: string;
  };

  if (!email || !pin) {
    res.status(400).json({ error: "Email and PIN are required." });
    return;
  }
  if (deviceId && !/^[a-f0-9-]{20,80}$/i.test(deviceId)) {
    res.status(400).json({ error: "Invalid deviceId." });
    return;
  }

  const key = makeKey(email);
  try {
    const record = await dbGet(key);
    if (record === null) {
      await audit({ eventType: "auth.login.failure", subjectEmail: email, metadata: { reason: "account_not_found" } });
      res.status(404).json({ error: "No account found with this email. Please sign up first." });
      return;
    }

    if (record.deactivated) {
      await audit({ eventType: "auth.login.blocked", subjectEmail: email, metadata: { reason: "deactivated" } });
      res.status(403).json({ error: "This account has been deactivated. Please contact your manager." });
      return;
    }

    let pinOk = false;
    try {
      pinOk = await bcrypt.compare(pin, safeRecord(record).pinHash);
    } catch {
      res.status(500).json({ error: "Account configuration error. Please contact support." });
      return;
    }

    if (!pinOk) {
      await audit({ eventType: "auth.login.failure", subjectEmail: email, metadata: { reason: "invalid_pin" } });
      res.status(401).json({ error: "Incorrect PIN. Please try again." });
      return;
    }

    if (deviceId) {
      const now = new Date().toISOString();
      const previous = record.devices?.[deviceId];
      await dbSet(key, {
        ...record,
        devices: {
          ...(record.devices ?? {}),
          [deviceId]: { firstSeenAt: previous?.firstSeenAt ?? now, lastSeenAt: now },
        },
      });
    }

    await audit({ eventType: "auth.login.success", actorEmail: record.email, subjectEmail: record.email });
    establishSession(res, { name: record.name, email: record.email, agency: record.agency, role: record.role ?? "carer" });
    res.json({
      success: true, name: record.name, email: record.email, agency: record.agency,
      role: record.role ?? "carer", assistantSessionToken: issueAssistantSession({
        name: record.name, email: record.email, agency: record.agency, role: record.role ?? "carer",
      }),
    });
  } catch (err) {
    console.error("Login error:", err);
    await audit({ eventType: "auth.login.failure", subjectEmail: email, metadata: { reason: "server_error" } });
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ success: true });
});

// ── Change PIN ────────────────────────────────────────────────────────────────

router.post("/auth/change-pin", async (req, res) => {
  const session = bearerSession(req);
  const { oldPin, newPin } = req.body as {
    oldPin?: string; newPin?: string;
  };

  if (!session) {
    res.status(401).json({ error: "A valid authenticated session is required." });
    return;
  }
  if (!oldPin || !newPin) {
    res.status(400).json({ error: "oldPin and newPin are required." });
    return;
  }
  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits." });
    return;
  }

  const key = makeKey(session.email);
  try {
    const record = await dbGet(key);
    if (!record) {
      res.status(404).json({ error: "Account not found." });
      return;
    }

    const oldOk = await bcrypt.compare(oldPin, safeRecord(record).pinHash);

    if (!oldOk) {
      await audit({
        eventType: "auth.pin_change.failure",
        actorEmail: session.email,
        subjectEmail: session.email,
        metadata: { reason: "invalid_current_pin" },
      });
      res.status(401).json({ error: "Current PIN is incorrect." });
      return;
    }

    const newHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    const updated: CarerRecord = { ...record, pinHash: newHash };
    await dbSet(key, updated);
    await audit({
      eventType: "auth.pin_change.success",
      actorEmail: session.email,
      subjectEmail: session.email,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Change PIN error:", err);
    await audit({
      eventType: "auth.pin_change.failure",
      actorEmail: session.email,
      subjectEmail: session.email,
      metadata: { reason: "server_error" },
    });
    res.status(500).json({ error: "Failed to change PIN. Please try again." });
  }
});

// ── Status check (remote wipe / deactivation) ─────────────────────────────────

/**
 * GET /auth/status?deviceId=...
 * Returns { active, wipeRequested, deactivated } for the authenticated device.
 * Called by the app on launch and on network reconnect.
 */
router.get("/auth/status", async (req, res) => {
  const session = bearerSession(req);
  const deviceId = String(req.query["deviceId"] ?? "");
  if (!session) {
    res.status(401).json({ error: "A valid authenticated session is required." });
    return;
  }
  if (!/^[a-f0-9-]{20,80}$/i.test(deviceId)) {
    res.status(400).json({ error: "A valid deviceId query param is required." });
    return;
  }
  try {
    const record = await dbGet(makeKey(session.email));
    if (!record) {
      res.status(404).json({ error: "Account not found." });
      return;
    }
    const deviceWipeRequested = Boolean(record.deviceWipes?.[deviceId]);
    res.json({
      active: !record.deactivated,
      wipeRequested: deviceWipeRequested || (record.wipeRequested ?? false),
      deactivated: record.deactivated ?? false,
    });
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({ error: "Status check failed." });
  }
});

// ── Wipe acknowledgement ─────────────────────────────────────────────────────

/**
 * POST /auth/wipe-ack { deviceId }
 * Called by the device after it has wiped its local data.
 * Clears the wipeRequested flag.
 */
router.post("/auth/wipe-ack", async (req, res) => {
  const session = bearerSession(req);
  const { deviceId } = req.body as { deviceId?: string };
  if (!session) {
    res.status(401).json({ error: "A valid authenticated session is required." });
    return;
  }
  if (!deviceId || !/^[a-f0-9-]{20,80}$/i.test(deviceId)) {
    res.status(400).json({ error: "A valid deviceId is required." });
    return;
  }
  try {
    const record = await dbGet(makeKey(session.email));
    if (!record) { res.status(404).json({ error: "Account not found." }); return; }
    const deviceWipes = { ...(record.deviceWipes ?? {}) };
    delete deviceWipes[deviceId];
    await dbSet(makeKey(session.email), {
      ...record,
      wipeRequested: false,
      deviceWipes,
    });
    await audit({
      eventType: "security.remote_wipe.completed",
      actorEmail: session.email,
      subjectEmail: session.email,
      deviceId,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Wipe-ack error:", err);
    res.status(500).json({ error: "Wipe acknowledgement failed." });
  }
});

// ── Remote wipe request (manager action) ─────────────────────────────────────

/**
 * POST /auth/request-wipe { targetEmail, deviceId }
 * Sets a device-specific wipe flag for the target carer.
 */
router.post("/auth/request-wipe", async (req, res) => {
  const session = bearerSession(req);
  const { targetEmail, deviceId } = req.body as {
    targetEmail?: string; deviceId?: string;
  };
  if (!session || (session.role !== "manager" && session.role !== "admin")) {
    res.status(403).json({ error: "An authorised manager or admin session is required." });
    return;
  }
  if (!targetEmail || !deviceId || !/^[a-f0-9-]{20,80}$/i.test(deviceId)) {
    res.status(400).json({ error: "targetEmail and a valid deviceId are required." });
    return;
  }
  try {
    const target = await dbGet(makeKey(targetEmail));
    if (!target) { res.status(404).json({ error: "Target carer not found." }); return; }
    if (session.role !== "admin" && target.agency !== session.agency) {
      res.status(403).json({ error: "The target carer is outside your organisation." });
      return;
    }

    await dbSet(makeKey(targetEmail), {
      ...target,
      deviceWipes: {
        ...(target.deviceWipes ?? {}),
        [deviceId]: { requestedAt: new Date().toISOString(), requestedBy: session.email },
      },
    });
    await audit({
      eventType: "security.remote_wipe.requested",
      actorEmail: session.email,
      subjectEmail: target.email,
      deviceId,
      metadata: { reason: "manager_request" },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Request-wipe error:", err);
    res.status(500).json({ error: "Failed to set wipe flag." });
  }
});

// ── Deactivate carer (manager action) ────────────────────────────────────────

/**
 * POST /auth/deactivate { targetEmail }
 * Deactivates the target carer's account and flags for remote wipe.
 */
router.post("/auth/deactivate", async (req, res) => {
  const session = bearerSession(req);
  const { targetEmail } = req.body as {
    targetEmail?: string;
  };
  if (!session || (session.role !== "manager" && session.role !== "admin")) {
    res.status(403).json({ error: "An authorised manager or admin session is required." });
    return;
  }
  if (!targetEmail) {
    res.status(400).json({ error: "targetEmail is required." });
    return;
  }
  try {
    const target = await dbGet(makeKey(targetEmail));
    if (!target) { res.status(404).json({ error: "Target carer not found." }); return; }
    if (session.role !== "admin" && target.agency !== session.agency) {
      res.status(403).json({ error: "The target carer is outside your organisation." });
      return;
    }

    await dbSet(makeKey(targetEmail), {
      ...target,
      deactivated: true,
      wipeRequested: true,
    });
    await audit({
      eventType: "security.account.deactivated",
      actorEmail: session.email,
      subjectEmail: target.email,
      metadata: { wipeOnNextCheckIn: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Deactivate error:", err);
    res.status(500).json({ error: "Failed to deactivate account." });
  }
});

export default router;
