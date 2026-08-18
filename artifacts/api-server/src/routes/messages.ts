/**
 * Messages routes — carer ↔ manager messaging with server-side persistence.
 * Messages are stored in @replit/database (keyed by ID).
 * The client layer handles encryption-at-rest on device.
 */

import { Router, type IRouter } from "express";
import Database from "@replit/database";

const db = new Database();
const router: IRouter = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageReply {
  id: string;
  fromName: string;
  fromRole: "manager" | "carer";
  body: string;
  timestamp: string;
}

export interface StoredMessage {
  id: string;
  fromCarerId: string;
  fromCarerName: string;
  body: string;
  subject?: string;
  tags: string[];
  timestamp: string;
  read: boolean;
  replies: MessageReply[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAllIds(): Promise<string[]> {
  try {
    const val = await db.get("msgs_index");
    return Array.isArray(val) ? (val as string[]) : [];
  } catch {
    return [];
  }
}

async function saveIds(ids: string[]): Promise<void> {
  await db.set("msgs_index", ids);
}

async function getMsg(id: string): Promise<StoredMessage | null> {
  try {
    const raw = await db.get(`msg_${id}`);
    if (!raw) return null;
    return JSON.parse(raw as unknown as string) as StoredMessage;
  } catch {
    return null;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /messages  — carer sends a message
router.post("/messages", async (req, res) => {
  try {
    const { fromCarerId, fromCarerName, body, subject, tags } = req.body as {
      fromCarerId?: string;
      fromCarerName?: string;
      body?: string;
      subject?: string;
      tags?: string[];
    };

    if (!fromCarerId?.trim() || !fromCarerName?.trim() || !body?.trim()) {
      return res
        .status(400)
        .json({ error: "fromCarerId, fromCarerName, and body are required" });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const msg: StoredMessage = {
      id,
      fromCarerId: fromCarerId.trim(),
      fromCarerName: fromCarerName.trim(),
      body: body.trim(),
      subject: subject?.trim() || undefined,
      tags: Array.isArray(tags) ? tags : [],
      timestamp: new Date().toISOString(),
      read: false,
      replies: [],
    };

    await db.set(`msg_${id}`, JSON.stringify(msg));
    const ids = await getAllIds();
    ids.push(id);
    await saveIds(ids);

    return res.status(201).json(msg);
  } catch (err) {
    console.error("[messages] POST /messages:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /messages?carerId=xxx  — carer fetches own threads; no param = manager gets all
router.get("/messages", async (req, res) => {
  try {
    const { carerId } = req.query as { carerId?: string };
    const ids = await getAllIds();

    const all: StoredMessage[] = [];
    for (const id of ids) {
      const msg = await getMsg(id);
      if (msg) all.push(msg);
    }

    // Newest first
    const sorted = all.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

    if (carerId) {
      return res.json(sorted.filter((m) => m.fromCarerId === carerId.trim()));
    }
    return res.json(sorted);
  } catch (err) {
    console.error("[messages] GET /messages:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /messages/:id/reply  — manager replies to a thread
router.post("/messages/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { fromName, body } = req.body as { fromName?: string; body?: string };

    if (!fromName?.trim() || !body?.trim()) {
      return res.status(400).json({ error: "fromName and body are required" });
    }

    const msg = await getMsg(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const reply: MessageReply = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromName: fromName.trim(),
      fromRole: "manager",
      body: body.trim(),
      timestamp: new Date().toISOString(),
    };

    msg.replies.push(reply);
    msg.read = true;
    await db.set(`msg_${id}`, JSON.stringify(msg));

    return res.json(msg);
  } catch (err) {
    console.error("[messages] POST /messages/:id/reply:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /messages/:id/read  — mark a thread as read
router.patch("/messages/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await getMsg(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    msg.read = true;
    await db.set(`msg_${id}`, JSON.stringify(msg));

    return res.json(msg);
  } catch (err) {
    console.error("[messages] PATCH /messages/:id/read:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
