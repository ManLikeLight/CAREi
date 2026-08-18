/**
 * Messaging types and client helpers.
 *
 * Encryption-at-rest: messages are saved to IndexedDB via careStore helpers
 * (AES-GCM 256-bit, key derived from PIN via PBKDF2). Raw plaintext is never
 * written to disk. The outbox queue is also encrypted the same way.
 *
 * Offline-first: the QueuedMessage type represents unsent messages stored
 * locally. The MessagingScreen drains the queue on reconnect.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MessageReply {
  id: string;
  fromName: string;
  fromRole: "manager" | "carer";
  body: string;
  timestamp: string;
}

export interface Message {
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

/** A message composed offline, not yet confirmed by the server. */
export interface QueuedMessage {
  tempId: string;
  fromCarerId: string;
  fromCarerName: string;
  body: string;
  subject?: string;
  tags: string[];
  timestamp: string;
}

// ── Quick-send tag catalogue ───────────────────────────────────────────────────

export const MESSAGE_TAGS = [
  { id: "running-late",   label: "Running late",       emoji: "🏃" },
  { id: "overstay",       label: "Overstaying visit",  emoji: "⏰" },
  { id: "client-concern", label: "Client concern",     emoji: "⚠️" },
  { id: "urgent",         label: "Urgent",             emoji: "🚨" },
  { id: "update",         label: "General update",     emoji: "📋" },
] as const;

export type MessageTagId = typeof MESSAGE_TAGS[number]["id"];

// ── API helpers (use /api relative to origin, same as auth calls) ──────────────

export async function apiFetchMessages(carerId?: string): Promise<Message[]> {
  const qs = carerId ? `?carerId=${encodeURIComponent(carerId)}` : "";
  const res = await fetch(`/api/messages${qs}`);
  if (!res.ok) throw new Error(`fetchMessages: ${res.status}`);
  return res.json() as Promise<Message[]>;
}

export async function apiSendMessage(
  payload: Omit<QueuedMessage, "tempId">,
): Promise<Message> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`sendMessage: ${res.status}`);
  return res.json() as Promise<Message>;
}

export async function apiReplyToMessage(
  msgId: string,
  fromName: string,
  body: string,
): Promise<Message> {
  const res = await fetch(`/api/messages/${msgId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromName, body }),
  });
  if (!res.ok) throw new Error(`replyToMessage: ${res.status}`);
  return res.json() as Promise<Message>;
}

export async function apiMarkRead(msgId: string): Promise<void> {
  await fetch(`/api/messages/${msgId}/read`, { method: "PATCH" });
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function tagLabel(tagId: string): string {
  return MESSAGE_TAGS.find((t) => t.id === tagId)?.label ?? tagId;
}

export function tagEmoji(tagId: string): string {
  return MESSAGE_TAGS.find((t) => t.id === tagId)?.emoji ?? "📨";
}
