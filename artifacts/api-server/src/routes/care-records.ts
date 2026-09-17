import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  medicationConfirmationRecords,
  visitRecords,
  familyUpdateConsents,
  familyUpdateDeliveries,
} from "@workspace/db";
import {
  IngestMedicationConfirmationBody,
  IngestMedicationConfirmationResponse,
  IngestVisitRecordBody,
  IngestVisitRecordResponse,
} from "@workspace/api-zod";
import type {
  MedicationConfirmationInput,
  VisitRecordInput,
} from "@workspace/api-zod";
import { drainFamilyUpdates } from "../family-update-processor";
import { verifyAssistantSession } from "../assistant-session";
import { isSupportedClient } from "../family-mapping";
import { eligibleFamilyConsent } from "../family-consent";

const router: IRouter = Router();
function authenticatedVisit(req: Request, visit: VisitRecordInput): boolean {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7).trim() : "";
  const session = verifyAssistantSession(token);
  return !!session && session.role === "carer" && session.email === visit.carerEmail &&
    session.name === visit.carerName && session.agency === visit.agency &&
    isSupportedClient(visit.clientId, visit.clientName);
}

function withDates(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const body = { ...(value as Record<string, unknown>) };
  for (const key of ["scheduledAt", "completedAt", "dueAt", "recordedAt"]) {
    if (typeof body[key] === "string") {
      const date = new Date(body[key]);
      if (!Number.isNaN(date.valueOf())) body[key] = date;
    }
  }
  return body;
}

function sameDate(left: Date | null | undefined, right: Date | null): boolean {
  const leftTime = left == null ? null : left.getTime();
  const rightTime = right == null ? null : right.getTime();
  return leftTime === rightTime;
}

function visitPayloadMatches(
  row: typeof visitRecords.$inferSelect,
  payload: VisitRecordInput,
): boolean {
  return (
    row.visitKey === payload.visitKey &&
    row.clientId === payload.clientId &&
    row.clientName === payload.clientName &&
    row.carerName === payload.carerName &&
    row.carerEmail === payload.carerEmail &&
    row.agency === payload.agency &&
    sameDate(payload.scheduledAt, row.scheduledAt) &&
    sameDate(payload.completedAt, row.completedAt) &&
    row.status === payload.status &&
    (payload.notes ?? null) === row.notes &&
    (payload.mood ?? null) === row.mood &&
    (payload.mealStatus ?? null) === row.mealStatus &&
    (payload.fluidGlasses ?? null) === row.fluidGlasses &&
    JSON.stringify(payload.completedActivities ?? []) === JSON.stringify(row.completedActivities ?? [])
  );
}

function medicationPayloadMatches(
  row: typeof medicationConfirmationRecords.$inferSelect,
  payload: MedicationConfirmationInput,
): boolean {
  return (
    row.confirmationKey === payload.confirmationKey &&
    (payload.visitKey ?? null) === row.visitKey &&
    row.clientId === payload.clientId &&
    row.clientName === payload.clientName &&
    row.medicationName === payload.medicationName &&
    (payload.dose ?? null) === row.dose &&
    sameDate(payload.dueAt, row.dueAt) &&
    sameDate(payload.recordedAt, row.recordedAt) &&
    row.status === payload.status &&
    row.carerName === payload.carerName &&
    row.carerEmail === payload.carerEmail &&
    row.agency === payload.agency &&
    (payload.reason ?? null) === row.reason
  );
}

router.post("/care-records/visits", async (req, res): Promise<void> => {
  const parsed = IngestVisitRecordBody.safeParse(withDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [inserted] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(visitRecords).values(parsed.data).onConflictDoNothing({
      target: visitRecords.visitKey,
    }).returning();
    if (created?.status === "completed" && authenticatedVisit(req, parsed.data)) {
      const consents = await tx.select().from(familyUpdateConsents).where(eq(familyUpdateConsents.clientId, created.clientId));
      const optedIn = consents.filter((c) => eligibleFamilyConsent(c, created.clientId));
      if (optedIn.length > 0) {
        await tx.insert(familyUpdateDeliveries).values(optedIn.map((c) => ({
          visitKey: created.visitKey, clientId: created.clientId,
          familyMemberId: c.familyMemberId, familyMemberName: c.familyMemberName,
        }))).onConflictDoNothing();
      }
    }
    return [created];
  });
  const row =
    inserted ??
    (
      await db
        .select()
        .from(visitRecords)
        .where(eq(visitRecords.visitKey, parsed.data.visitKey))
        .limit(1)
    )[0];
  if (!row) {
    res.status(500).json({ error: "The visit record could not be read after ingestion" });
    return;
  }
  if (!visitPayloadMatches(row, parsed.data)) {
    res.status(409).json({
      error:
        "A visit record with this visitKey already exists with different business data; the existing clinical evidence was not changed.",
    });
    return;
  }
  if (inserted) void drainFamilyUpdates();
  res.json(IngestVisitRecordResponse.parse(row));
});

router.post("/care-records/medications", async (req, res): Promise<void> => {
  const parsed = IngestMedicationConfirmationBody.safeParse(withDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [inserted] = await db
    .insert(medicationConfirmationRecords)
    .values(parsed.data)
    .onConflictDoNothing({
      target: medicationConfirmationRecords.confirmationKey,
    })
    .returning();
  const row =
    inserted ??
    (
      await db
        .select()
        .from(medicationConfirmationRecords)
        .where(
          eq(
            medicationConfirmationRecords.confirmationKey,
            parsed.data.confirmationKey,
          ),
        )
        .limit(1)
    )[0];
  if (!row) {
    res
      .status(500)
      .json({ error: "The medication record could not be read after ingestion" });
    return;
  }
  if (!medicationPayloadMatches(row, parsed.data)) {
    res.status(409).json({
      error:
        "A medication confirmation with this confirmationKey already exists with different business data; the existing clinical evidence was not changed.",
    });
    return;
  }
  res.json(IngestMedicationConfirmationResponse.parse(row));
});

export default router;