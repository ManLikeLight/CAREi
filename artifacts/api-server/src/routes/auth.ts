import { Router, type IRouter } from "express";
import Database from "@replit/database";

const db = new Database();
const router: IRouter = Router();

type CarerRecord = {
  name: string;
  email: string;
  agency: string;
  pin: string;
};

function makeKey(email: string) {
  // Underscore prefix avoids colon (reserved in some KV implementations)
  return `carer_${email.toLowerCase().trim()}`;
}

/** Returns the stored record or null if the key doesn't exist. Throws on real errors. */
async function dbGet(key: string): Promise<CarerRecord | null> {
  const result = await db.get(key);
  if (result.ok) {
    return (result.value as CarerRecord | null) ?? null;
  }
  const err = result.error as { statusCode?: number; message?: string };
  if (err?.statusCode === 404) {
    return null; // key simply doesn't exist
  }
  throw new Error(`DB get failed: ${err?.message ?? JSON.stringify(err)}`);
}

/** Stores a record. Throws on error. */
async function dbSet(key: string, value: CarerRecord): Promise<void> {
  const result = await db.set(key, value);
  if (!result.ok) {
    throw new Error(`DB set failed: ${JSON.stringify(result.error)}`);
  }
}

router.post("/auth/signup", async (req, res) => {
  const { name, email, agency, pin } = req.body as {
    name?: string;
    email?: string;
    agency?: string;
    pin?: string;
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
    const record: CarerRecord = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      agency: agency.trim(),
      pin,
    };
    await dbSet(key, record);
    res.json({ success: true, name: record.name, email: record.email, agency: record.agency });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

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
    if (record.pin !== pin) {
      res.status(401).json({ error: "Incorrect PIN. Please try again." });
      return;
    }
    res.json({ success: true, name: record.name, email: record.email, agency: record.agency });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

export default router;
