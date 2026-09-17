import { atomicEncryptedBatch, loadEncryptedStrict, saveEncrypted } from "./careStore";

export type VoiceContext = { taskLabels: string[]; currentVisitFacts: { notes: string; mood: string; mealStatus: string; completedTasks: string[] }; client: Record<string, unknown> };
export type VoiceStructuredDraft = {
  rawTranscript: string; careNotes: string; mood: string; mealStatus: "" | "Full" | "Half" | "Refused";
  completedTasks: string[]; warnings: string[]; clientId: string; clientName: string; capturedAt: string;
  status: "pending" | "ready"; queueItemId: string; context?: VoiceContext;
  revision: number;
};
export type VoiceQueueItem = VoiceStructuredDraft;
const prefix = "voice-documentation:";
export const voiceDraftKey = (email: string, clientId: string) => `${prefix}draft:${email.trim().toLowerCase()}:${clientId}`;
export const voiceQueueKey = (email: string) => `${prefix}queue:${email.trim().toLowerCase()}`;
const chains = new Map<string, Promise<unknown>>();

async function withVoiceLock<T>(email: string, work: () => Promise<T>): Promise<T> {
  const normalized = email.trim().toLowerCase();
  const previous = chains.get(normalized) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(async () => {
    const locks = (navigator as Navigator & { locks?: { request: <R>(name: string, cb: () => Promise<R>) => Promise<R> } }).locks;
    if (locks) return locks.request(`carei-voice:${normalized}`, work);
    return work();
  });
  chains.set(normalized, run);
  try { return await run as T; } finally { if (chains.get(normalized) === run) chains.delete(normalized); }
}

export async function readVoiceState(email: string, key: CryptoKey, clientId: string) {
  return withVoiceLock(email, async () => ({
    draft: await loadEncryptedStrict<VoiceStructuredDraft>(key, voiceDraftKey(email, clientId)),
    queue: await loadEncryptedStrict<VoiceQueueItem[]>(key, voiceQueueKey(email)),
  }));
}

export async function queueVoiceTranscript(email: string, key: CryptoKey, item: VoiceQueueItem) {
  return withVoiceLock(email, async () => {
    const queue = (await loadEncryptedStrict<VoiceQueueItem[]>(key, voiceQueueKey(email))) ?? [];
    await saveEncrypted(key, voiceQueueKey(email), [...queue.filter((q) => q.queueItemId !== item.queueItemId), item]);
  });
}

export async function savePendingVoice(email: string, key: CryptoKey, item: VoiceQueueItem) {
  return withVoiceLock(email, async () => {
    const queue = (await loadEncryptedStrict<VoiceQueueItem[]>(key, voiceQueueKey(email))) ?? [];
    await atomicEncryptedBatch(key, [
      { type: "put", key: voiceQueueKey(email), value: [...queue.filter((q) => q.queueItemId !== item.queueItemId), item] },
      { type: "put", key: voiceDraftKey(email, item.clientId), value: item },
    ]);
  });
}
export async function saveVoiceDraft(email: string, key: CryptoKey, draft: VoiceStructuredDraft) {
  return withVoiceLock(email, async () => {
    const current = await loadEncryptedStrict<VoiceStructuredDraft>(key, voiceDraftKey(email, draft.clientId));
    if (current?.status === "ready" && current.queueItemId !== draft.queueItemId) return false;
    await saveEncrypted(key, voiceDraftKey(email, draft.clientId), draft);
    return true;
  });
}

export async function removeVoiceQueueItem(email: string, key: CryptoKey, id: string) {
  return withVoiceLock(email, async () => {
    const queue = (await loadEncryptedStrict<VoiceQueueItem[]>(key, voiceQueueKey(email))) ?? [];
    await saveEncrypted(key, voiceQueueKey(email), queue.filter((q) => q.queueItemId !== id));
  });
}

export async function discardVoiceDraft(email: string, key: CryptoKey, clientId: string, id: string) {
  return withVoiceLock(email, async () => {
    const queue = (await loadEncryptedStrict<VoiceQueueItem[]>(key, voiceQueueKey(email))) ?? [];
    await atomicEncryptedBatch(key, [
      { type: "put", key: voiceQueueKey(email), value: queue.filter((q) => q.queueItemId !== id) },
      { type: "delete", key: voiceDraftKey(email, clientId) },
    ]);
  });
}

export async function discardVoiceDraftIfMatches(email: string, key: CryptoKey, clientId: string, id: string) {
  return withVoiceLock(email, async () => {
    const draft = await loadEncryptedStrict<VoiceStructuredDraft>(key, voiceDraftKey(email, clientId));
    const queue = (await loadEncryptedStrict<VoiceQueueItem[]>(key, voiceQueueKey(email))) ?? [];
    const draftMatches = !!draft && draft.queueItemId === id;
    await atomicEncryptedBatch(key, [
      { type: "put", key: voiceQueueKey(email), value: queue.filter((q) => q.queueItemId !== id) },
      ...(draftMatches ? [{ type: "delete" as const, key: voiceDraftKey(email, clientId) }] : []),
    ]);
    return draftMatches;
  });
}

async function structure(item: VoiceQueueItem, context: VoiceContext): Promise<VoiceStructuredDraft> {
  const response = await fetch("/api/anthropic/structure-visit-note", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: item.rawTranscript, client: context.client, taskLabels: context.taskLabels, currentVisitFacts: context.currentVisitFacts, capturedAt: item.capturedAt }),
  });
  if (!response.ok) throw new Error(`Structure request failed (${response.status})`);
  const data = await response.json() as Partial<VoiceStructuredDraft> & { notes?: string };
  return { ...item, status: "ready", careNotes: data.notes ?? item.rawTranscript, mood: data.mood ?? "", mealStatus: data.mealStatus ?? "", completedTasks: data.completedTasks ?? [], warnings: data.warnings ?? [] };
}

/** Structure outside the lock, then compare-and-commit under it. */
export async function structureAndCommitVoice(email: string, key: CryptoKey, item: VoiceQueueItem, context: VoiceContext) {
  const result = await structure(item, context);
  return withVoiceLock(email, async () => {
    const queueKey = voiceQueueKey(email);
    const queue = (await loadEncryptedStrict<VoiceQueueItem[]>(key, queueKey)) ?? [];
    const current = queue.find((q) => q.queueItemId === item.queueItemId);
    const currentDraft = await loadEncryptedStrict<VoiceStructuredDraft>(key, voiceDraftKey(email, item.clientId));
    if (!current || current.queueItemId !== item.queueItemId || current.rawTranscript !== item.rawTranscript || !currentDraft || currentDraft.status !== "pending" || currentDraft.queueItemId !== item.queueItemId || currentDraft.revision !== item.revision || currentDraft.rawTranscript !== item.rawTranscript || currentDraft.careNotes !== item.careNotes || currentDraft.mood !== item.mood || currentDraft.mealStatus !== item.mealStatus || currentDraft.completedTasks.join("\u0000") !== item.completedTasks.join("\u0000") || currentDraft.warnings.join("\u0000") !== item.warnings.join("\u0000")) return undefined;
    await atomicEncryptedBatch(key, [
      { type: "put", key: voiceDraftKey(email, item.clientId), value: result },
      { type: "put", key: queueKey, value: queue.filter((q) => q.queueItemId !== item.queueItemId) },
    ]);
    return result;
  });
}

export async function structureVoiceTranscript(item: VoiceQueueItem, context: VoiceContext) {
  return structure(item, context);
}

export async function processVoiceQueue(email: string, key: CryptoKey, context: VoiceContext, activeDraftId?: string) {
  const clientId = String(context.client.id);
  const state = await readVoiceState(email, key, clientId);
  const queue = state.queue ?? [];
  for (const queued of queue) {
    if (queued.queueItemId === activeDraftId && !state.draft) continue;
    const existing = queued.clientId === context.client.id ? state.draft : undefined;
    if (existing?.status === "ready" && existing.queueItemId !== queued.queueItemId) continue;
    if (existing?.status === "ready" && existing.queueItemId === queued.queueItemId) {
      await removeVoiceQueueItem(email, key, queued.queueItemId);
      continue;
    }
    const source = existing?.status === "pending" && existing.queueItemId === queued.queueItemId ? { ...queued, rawTranscript: existing.rawTranscript, careNotes: existing.careNotes } : queued;
    const committed = await structureAndCommitVoice(email, key, source, queued.context ?? context);
    if (committed) return { remaining: ((await readVoiceState(email, key, clientId)).queue ?? []).length, ready: committed };
  }
  return { remaining: queue.length, ready: undefined };
}