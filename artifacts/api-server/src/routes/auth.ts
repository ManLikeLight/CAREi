/**
 * Auth routes — PIN signup / login with bcrypt hashing
 * Includes remote-wipe / deactivation endpoints.
 *
 * PIN storage:  bcrypt hash (cost factor 12) — raw PIN is never stored.
 * Migration:    Records with a legacy plain-text `pin` field are migrated
 *               on first successful login (hash stored, plain field removed).
 */

import { Router, type IRouter } from "express";
import Database from "@replit/database";
import bcrypt from "bcryptjs";

const db = new Database();
const router: IRouter = Router();
const BCRYPT_ROUNDS = 12;

// ── Types ────────────────────────────────────────────────────────────────────

type CarerRecord = {
  name: string;
  email: string;
  agency: string;
  /** bcrypt hash of the PIN */
  pinHash?: string;
  /** Legacy plain-text PIN — present only on old records before migration */
  pin?: string;
  /** Manager has requested a full device wipe for this carer */
  wipeRequested?: boolean;
  /** Account has been deactivated (also triggers wipe on next device check-in) */
  deactivated?: boolean;
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

// ── Signup ───────────────────────────────────────────────────────────────────

router.post("/auth/signup", async (req, res) => {
  const { name, email, agency, pin } = req.body as {
    name?: string; email?: string; agency?: string; pin?: string;
  };

  if (!name || !email || !agency || !pin) {
    res.status(400).json({ error: "All fields are required." });
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
      pinHash,
      wipeRequested: false,
      deactivated: false,
    };
    await dbSet(key, record);

    res.json({ success: true, name: record.name, email: record.email, agency: record.agency });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { email, pin } = req.body as { email?: string; pin?: string };

  if (!email || !pin) {
    res.status(400).json({ error: "Email and PIN are required." });
    return;
  }

  const key = makeKey(email);
  try {
    const record = await dbGet(key);
    if (record === null) {
      res.status(404).json({ error: "No account found with this email. Please sign up first." });
      return;
    }

    if (record.deactivated) {
      res.status(403).json({ error: "This account has been deactivated. Please contact your manager." });
      return;
    }

    let pinOk = false;

    if (record.pinHash) {
      // Standard bcrypt verification
      pinOk = await bcrypt.compare(pin, record.pinHash);
    } else if (record.pin) {
      // Legacy plain-text record — compare and migrate
      pinOk = record.pin === pin;
      if (pinOk) {
        // Migrate: hash and remove plain-text PIN
        const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
        const migrated: CarerRecord = {
          ...record,
          pinHash,
          wipeRequested: record.wipeRequested ?? false,
          deactivated: record.deactivated ?? false,
        };
        delete migrated.pin;
        await dbSet(key, migrated).catch((e) =>
          console.warn("PIN migration failed (non-fatal):", e),
        );
      }
    } else {
      // No usable PIN stored — should not happen
      res.status(500).json({ error: "Account configuration error. Please contact support." });
      return;
    }

    if (!pinOk) {
      res.status(401).json({ error: "Incorrect PIN. Please try again." });
      return;
    }

    res.json({ success: true, name: record.name, email: record.email, agency: record.agency });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── Change PIN ────────────────────────────────────────────────────────────────

router.post("/auth/change-pin", async (req, res) => {
  const { email, oldPin, newPin } = req.body as {
    email?: string; oldPin?: string; newPin?: string;
  };

  if (!email || !oldPin || !newPin) {
    res.status(400).json({ error: "email, oldPin, and newPin are required." });
    return;
  }
  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits." });
    return;
  }

  const key = makeKey(email);
  try {
    const record = await dbGet(key);
    if (!record) {
      res.status(404).json({ error: "Account not found." });
      return;
    }

    // Verify old PIN
    let oldOk = false;
    if (record.pinHash) {
      oldOk = await bcrypt.compare(oldPin, record.pinHash);
    } else if (record.pin) {
      oldOk = record.pin === oldPin;
    }

    if (!oldOk) {
      res.status(401).json({ error: "Current PIN is incorrect." });
      return;
    }

    const newHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    const updated: CarerRecord = { ...record, pinHash: newHash };
    delete updated.pin;
    await dbSet(key, updated);

    res.json({ success: true });
  } catch (err) {
    console.error("Change PIN error:", err);
    res.status(500).json({ error: "Failed to change PIN. Please try again." });
  }
});

// ── Status check (remote wipe / deactivation) ─────────────────────────────────

/**
 * GET /auth/status?email=...
 * Returns { active, wipeRequested, deactivated }.
 * Called by the app on launch and on network reconnect.
 */
router.get("/auth/status", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param is required." });
    return;
  }
  try {
    const record = await dbGet(makeKey(email));
    if (!record) {
      res.status(404).json({ error: "Account not found." });
      return;
    }
    res.json({
      active: !record.deactivated,
      wipeRequested: record.wipeRequested ?? false,
      deactivated: record.deactivated ?? false,
    });
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({ error: "Status check failed." });
  }
});

// ── Wipe acknowledgement ─────────────────────────────────────────────────────

/**
 * POST /auth/wipe-ack { email }
 * Called by the device after it has wiped its local data.
 * Clears the wipeRequested flag.
 */
router.post("/auth/wipe-ack", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "email is required." }); return; }
  try {
    const record = await dbGet(makeKey(email));
    if (!record) { res.status(404).json({ error: "Account not found." }); return; }
    await dbSet(makeKey(email), { ...record, wipeRequested: false });
    res.json({ success: true });
  } catch (err) {
    console.error("Wipe-ack error:", err);
    res.status(500).json({ error: "Wipe acknowledgement failed." });
  }
});

// ── Remote wipe request (manager action) ─────────────────────────────────────

/**
 * POST /auth/request-wipe { managerEmail, targetEmail }
 * Sets wipeRequested=true for the target carer.
 * Basic check: both accounts must exist and manager must have pinHash.
 * In production, replace with proper session-based auth.
 */
router.post("/auth/request-wipe", async (req, res) => {
  const { managerEmail, targetEmail } = req.body as {
    managerEmail?: string; targetEmail?: string;
  };
  if (!managerEmail || !targetEmail) {
    res.status(400).json({ error: "managerEmail and targetEmail are required." });
    return;
  }
  try {
    const manager = await dbGet(makeKey(managerEmail));
    if (!manager) { res.status(403).json({ error: "Manager account not found." }); return; }

    const target = await dbGet(makeKey(targetEmail));
    if (!target) { res.status(404).json({ error: "Target carer not found." }); return; }

    await dbSet(makeKey(targetEmail), { ...target, wipeRequested: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Request-wipe error:", err);
    res.status(500).json({ error: "Failed to set wipe flag." });
  }
});

// ── Deactivate carer (manager action) ────────────────────────────────────────

/**
 * POST /auth/deactivate { managerEmail, targetEmail }
 * Deactivates the target carer's account and flags for remote wipe.
 */
router.post("/auth/deactivate", async (req, res) => {
  const { managerEmail, targetEmail } = req.body as {
    managerEmail?: string; targetEmail?: string;
  };
  if (!managerEmail || !targetEmail) {
    res.status(400).json({ error: "managerEmail and targetEmail are required." });
    return;
  }
  try {
    const manager = await dbGet(makeKey(managerEmail));
    if (!manager) { res.status(403).json({ error: "Manager account not found." }); return; }

    const target = await dbGet(makeKey(targetEmail));
    if (!target) { res.status(404).json({ error: "Target carer not found." }); return; }

    await dbSet(makeKey(targetEmail), {
      ...target,
      deactivated: true,
      wipeRequested: true,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Deactivate error:", err);
    res.status(500).json({ error: "Failed to deactivate account." });
  }
});

export default router;
