import {
  ingestMedicationConfirmation,
  ingestVisitRecord,
  type MedicationConfirmationInput,
  type VisitRecordInput,
  type VisitRecordInputCompletedActivitiesItem,
  type VisitRecordInputMealStatus,
  type VisitRecordInputMood,
} from "@workspace/api-client-react";
import { loadEncrypted, saveEncrypted } from "./careStore";

export type CareMedication = {
  name: string;
  dose?: string;
  dueTime?: string;
};

/**
 * This is deliberately kept structurally compatible with CAREiApp's VisitData.
 * Keeping the ingestion boundary independent means the care-record queue never
 * needs to know about the screen component that collected the data.
 */
export type CompletedVisitData = {
  notes: string;
  confirmedMeds: string[];
  skippedMeds: string[];
  visitStartTime: string;
  visitEndTime: string;
  medTakenAt: Record<string, string>;
  medRefusalReason: Record<string, string>;
  mood: string;
  mealStatus: string;
  fluidGlasses: number;
  completedActivities: string[];
};

export type CareRecordIdentity = {
  carerName: string;
  carerEmail: string;
  agency: string;
};

export type CompletedVisitClient = {
  id: string;
  name: string;
  scheduledAt?: string | null;
  meds: CareMedication[];
};

export type CareRecordJob = {
  visit: VisitRecordInput;
  medications: MedicationConfirmationInput[];
};

export type CareRecordSyncResult = {
  sent: boolean;
  queued: boolean;
  visitKey: string;
  error?: string;
};

export type DrainCareRecordQueueResult = {
  sent: number;
  remaining: number;
  error?: string;
};

const QUEUE_PREFIX = "care-records-queue:";
const MOODS = ["Good", "Neutral", "Low", "Anxious", "Tired"] as const;
const MEALS = ["Full", "Half", "Refused"] as const;
const ACTIVITIES = ["Prepare breakfast", "Assist with mobility", "Record mood"] as const;

function normalizeMood(value: string): VisitRecordInputMood {
  return (MOODS as readonly string[]).includes(value.trim())
    ? value.trim() as VisitRecordInputMood
    : null;
}

function normalizeMealStatus(value: string): VisitRecordInputMealStatus {
  return (MEALS as readonly string[]).includes(value.trim())
    ? value.trim() as VisitRecordInputMealStatus
    : null;
}

function normalizeActivities(values: string[]): VisitRecordInputCompletedActivitiesItem[] {
  return values.filter((value): value is VisitRecordInputCompletedActivitiesItem =>
    (ACTIVITIES as readonly string[]).includes(value)
  );
}

function hasNavigatorOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function queueKey(userEmail: string): string {
  return `${QUEUE_PREFIX}${userEmail.trim().toLowerCase()}`;
}

function reportQueueError(message: string): void {
  // This is intentionally explicit. A missing key must never silently lose
  // completed care data or fall back to writing an unencrypted queue.
  console.error(`[CAREi care records] ${message}`);
}

function stableVisitKey(identity: CareRecordIdentity, client: CompletedVisitClient, data: CompletedVisitData): string {
  return [
    "visit",
    identity.agency.trim(),
    identity.carerEmail.trim().toLowerCase(),
    client.id.trim(),
    data.visitStartTime.trim(),
    data.visitEndTime.trim(),
  ]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

export function createVisitKey(
  identity: CareRecordIdentity,
  client: CompletedVisitClient,
  data: CompletedVisitData,
): string {
  return stableVisitKey(identity, client, data);
}

function localDateTimeToIso(value: string, referenceDate = new Date()): string {
  const trimmed = value.trim();
  if (!trimmed) return referenceDate.toISOString();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.valueOf()) ? referenceDate.toISOString() : parsed.toISOString();
  }
  const clock = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!clock) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.valueOf()) ? referenceDate.toISOString() : parsed.toISOString();
  }
  const date = new Date(referenceDate);
  date.setHours(Number(clock[1]), Number(clock[2]), Number(clock[3] ?? 0), 0);
  return date.toISOString();
}

function medicationForLabel(client: CompletedVisitClient, label: string): CareMedication | undefined {
  const normalized = label.trim().toLowerCase();
  return client.meds.find((med) => {
    const full = `${med.name} ${med.dose ?? ""}`.trim().toLowerCase();
    return full === normalized || med.name.trim().toLowerCase() === normalized;
  }) ?? client.meds.find((med) => normalized.startsWith(med.name.trim().toLowerCase()));
}

function capturedTime(
  times: Record<string, string>,
  medication: CareMedication,
  label: string,
  fallback: string,
): string {
  return times[medication.name] ?? times[label] ?? fallback;
}

function buildJob(
  identity: CareRecordIdentity,
  client: CompletedVisitClient,
  data: CompletedVisitData,
): CareRecordJob {
  const visitKey = stableVisitKey(identity, client, data);
  const completedAt = localDateTimeToIso(data.visitEndTime);
  const completedDate = new Date(completedAt);
  const visit: VisitRecordInput = {
    visitKey,
    clientId: client.id,
    clientName: client.name,
    carerName: identity.carerName,
    carerEmail: identity.carerEmail,
    agency: identity.agency,
    scheduledAt: client.scheduledAt ? localDateTimeToIso(client.scheduledAt, completedDate) : null,
    completedAt,
    status: "completed",
    notes: data.notes?.trim() || null,
    mood: normalizeMood(data.mood),
    mealStatus: normalizeMealStatus(data.mealStatus),
    fluidGlasses: Number.isFinite(data.fluidGlasses) ? data.fluidGlasses : null,
    completedActivities: normalizeActivities(data.completedActivities ?? []),
  };

  const medicationLabels = [...data.confirmedMeds, ...data.skippedMeds];
  const medications: MedicationConfirmationInput[] = [];
  const seen = new Set<string>();
  for (const label of medicationLabels) {
    const medication = medicationForLabel(client, label);
    if (!medication) continue;
    const isRefused = data.skippedMeds.includes(label);
    const identityLabel = `${medication.name}:${medication.dose ?? ""}:${medication.dueTime ?? ""}`;
    if (seen.has(`${identityLabel}:${isRefused ? "refused" : "given"}`)) continue;
    seen.add(`${identityLabel}:${isRefused ? "refused" : "given"}`);
    const fallbackRecordedAt = isRefused ? data.visitEndTime : data.visitEndTime;
    const recordedAt = localDateTimeToIso(
      isRefused
        ? data.visitEndTime
        : capturedTime(data.medTakenAt, medication, label, fallbackRecordedAt),
      completedDate,
    );
    medications.push({
      confirmationKey: `${visitKey}:med:${encodeURIComponent(identityLabel)}`,
      visitKey,
      clientId: client.id,
      clientName: client.name,
      medicationName: medication.name,
      dose: medication.dose ?? null,
      dueAt: medication.dueTime ? localDateTimeToIso(medication.dueTime, completedDate) : null,
      recordedAt,
      status: isRefused ? "refused" : "given",
      carerName: identity.carerName,
      carerEmail: identity.carerEmail,
      agency: identity.agency,
      reason: isRefused ? data.medRefusalReason[medication.name] ?? data.medRefusalReason[label] ?? null : null,
    });
  }

  return { visit, medications };
}

async function enqueue(userEmail: string, key: CryptoKey, job: CareRecordJob): Promise<void> {
  const existing = (await loadEncrypted<CareRecordJob[]>(key, queueKey(userEmail))) ?? [];
  // The visit key is deterministic, so completing the same visit twice does
  // not create duplicate local jobs before the server's idempotent ingest.
  const withoutJob = existing.filter((queued) => queued.visit.visitKey !== job.visit.visitKey);
  await saveEncrypted(key, queueKey(userEmail), [...withoutJob, job]);
}

async function sendJob(job: CareRecordJob, sessionToken?: string): Promise<void> {
  await ingestVisitRecord(job.visit, sessionToken ? {
    headers: { Authorization: `Bearer ${sessionToken}` },
  } : undefined);
  for (const medication of job.medications) {
    await ingestMedicationConfirmation(medication);
  }
}

export async function recordCompletedVisit({
  identity,
  client,
  visitData,
  cryptoKey,
  sessionToken,
  isOnline = hasNavigatorOnline(),
}: {
  identity: CareRecordIdentity;
  client: CompletedVisitClient;
  visitData: CompletedVisitData;
  cryptoKey?: CryptoKey | null;
  sessionToken?: string;
  isOnline?: boolean;
}): Promise<CareRecordSyncResult> {
  const job = buildJob(identity, client, visitData);
  const visitKey = job.visit.visitKey;
  if (!isOnline) {
    if (!cryptoKey) {
      const error = "Care record is offline and cannot be queued because no encryption key is available.";
      reportQueueError(error);
      return { sent: false, queued: false, visitKey, error };
    }
    try {
      await enqueue(identity.carerEmail, cryptoKey, job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Encrypted queue write failed.";
      const report = `Care record is offline and could not be saved to the encrypted queue: ${message}`;
      reportQueueError(report);
      return { sent: false, queued: false, visitKey, error: report };
    }
    return { sent: false, queued: true, visitKey };
  }

  try {
    await sendJob(job, sessionToken);
    return { sent: true, queued: false, visitKey };
  } catch (error) {
    if (!cryptoKey) {
      const message = error instanceof Error ? error.message : "Network request failed.";
      const report = `Care record could not be sent and cannot be queued because no encryption key is available: ${message}`;
      reportQueueError(report);
      return { sent: false, queued: false, visitKey, error: report };
    }
    try {
      await enqueue(identity.carerEmail, cryptoKey, job);
      return { sent: false, queued: true, visitKey };
    } catch (queueError) {
      const message = queueError instanceof Error ? queueError.message : "Encrypted queue write failed.";
      const report = `Care record could not be sent or saved to the encrypted queue: ${message}`;
      reportQueueError(report);
      return { sent: false, queued: false, visitKey, error: report };
    }
  }
}

export async function drainCareRecordQueue({
  userEmail,
  cryptoKey,
  sessionToken,
  isOnline = hasNavigatorOnline(),
}: {
  userEmail: string;
  cryptoKey?: CryptoKey | null;
  sessionToken?: string;
  isOnline?: boolean;
}): Promise<DrainCareRecordQueueResult> {
  if (!isOnline) return { sent: 0, remaining: 0 };
  if (!cryptoKey) {
    const error = "Care record queue cannot be drained because no encryption key is available.";
    reportQueueError(error);
    return { sent: 0, remaining: 0, error };
  }

  const key = queueKey(userEmail);
  let queue: CareRecordJob[];
  try {
    queue = (await loadEncrypted<CareRecordJob[]>(cryptoKey, key)) ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Encrypted queue read failed.";
    const report = `Care record queue could not be read: ${message}`;
    reportQueueError(report);
    return { sent: 0, remaining: 0, error: report };
  }
  const remaining: CareRecordJob[] = [];
  let sent = 0;
  for (const job of queue) {
    try {
      await sendJob(job, sessionToken);
      sent += 1;
    } catch {
      // Keep this and every subsequent job. Nothing is removed unless both
      // the visit and all medication confirmations have succeeded.
      remaining.push(job);
    }
  }
  try {
    if (remaining.length > 0) await saveEncrypted(cryptoKey, key, remaining);
    else if (queue.length > 0) await saveEncrypted(cryptoKey, key, []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Encrypted queue write failed.";
    const report = `Care record queue could not be updated after syncing: ${message}`;
    reportQueueError(report);
    return { sent: 0, remaining: queue.length, error: report };
  }
  return { sent, remaining: remaining.length };
}