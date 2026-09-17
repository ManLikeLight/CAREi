import { and, eq, lte, sql } from "drizzle-orm";
import { db, familyUpdateConsents, familyUpdateDeliveries, visitRecords } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { extractFamilySafeFacts, availableFactIds, validateFactSelection, renderFamilySummary } from "./family-safe-summary";

let draining = false;
async function generate(visit: typeof visitRecords.$inferSelect): Promise<string> {
  const facts = extractFamilySafeFacts(visit);
  const factIds = availableFactIds(facts);
  const result = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 220,
    system: "Return JSON only: {\"factIds\": string[], \"tone\": \"reassuring\"}. Select an ordered subset of supplied fact IDs. Never invent IDs, duplicate IDs, or add prose.",
    messages: [{ role: "user", content: `Allowed fact IDs: ${JSON.stringify(factIds)}` }],
  });
  const raw = result.content.find((part) => part.type === "text")?.text?.trim();
  if (!raw) throw new Error("Empty generated selection");
  const selected = JSON.parse(raw) as { factIds?: unknown; tone?: unknown };
  if (selected.tone !== "reassuring") throw new Error("Invalid generated selection");
  const ids = validateFactSelection(selected, facts);
  const summary = renderFamilySummary(facts, ids);
  if (summary.split(/\s+/).length > 120) throw new Error("Summary exceeded 120 words");
  return summary;
}

export async function drainFamilyUpdates(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    await db.update(familyUpdateDeliveries).set({ status: "pending", nextAttemptAt: new Date(), updatedAt: new Date() })
      .where(and(eq(familyUpdateDeliveries.status, "processing"), lte(familyUpdateDeliveries.updatedAt, new Date(Date.now() - 5 * 60_000))));
    const jobs = await db.select().from(familyUpdateDeliveries).where(
      and(eq(familyUpdateDeliveries.status, "pending"), lte(familyUpdateDeliveries.attempts, 3), lte(familyUpdateDeliveries.nextAttemptAt, new Date())),
    ).limit(10);
    for (const job of jobs) {
      const [claimed] = await db.update(familyUpdateDeliveries).set({
        status: "processing", attempts: sql`${familyUpdateDeliveries.attempts} + 1`, updatedAt: new Date(),
      }).where(and(eq(familyUpdateDeliveries.id, job.id), eq(familyUpdateDeliveries.status, "pending"))).returning();
      if (!claimed) continue;
      try {
        const consent = (await db.select().from(familyUpdateConsents).where(and(eq(familyUpdateConsents.clientId, job.clientId), eq(familyUpdateConsents.familyMemberId, job.familyMemberId))).limit(1))[0];
        if (!consent?.optedIn) {
          await db.update(familyUpdateDeliveries).set({ status: "cancelled", updatedAt: new Date(), error: "Consent withdrawn" }).where(eq(familyUpdateDeliveries.id, job.id));
          continue;
        }
        const visit = (await db.select().from(visitRecords).where(eq(visitRecords.visitKey, job.visitKey)).limit(1))[0];
        if (!visit) throw new Error("Visit record missing");
        const summary = await generate(visit);
        await db.transaction(async (tx) => {
          const latestConsent = (await tx.select().from(familyUpdateConsents)
            .where(and(eq(familyUpdateConsents.clientId, job.clientId), eq(familyUpdateConsents.familyMemberId, job.familyMemberId)))
            .for("update").limit(1))[0];
          if (!latestConsent?.optedIn) {
            await tx.update(familyUpdateDeliveries).set({ status: "cancelled", updatedAt: new Date(), error: "Consent withdrawn" }).where(eq(familyUpdateDeliveries.id, job.id));
            return;
          }
          await tx.update(familyUpdateDeliveries).set({ status: "sent", summary, sentAt: new Date(), updatedAt: new Date(), error: null }).where(and(eq(familyUpdateDeliveries.id, job.id), eq(familyUpdateDeliveries.status, "processing")));
        });
      } catch (error) {
        const terminal = claimed.attempts >= 3;
        const delay = claimed.attempts === 1 ? 15_000 : claimed.attempts === 2 ? 60_000 : 300_000;
        const message = error instanceof Error ? error.message : "Generation failed";
        console.warn(JSON.stringify({ event: "family_update_delivery_failed", deliveryId: job.id, attempt: claimed.attempts, terminal }));
        await db.update(familyUpdateDeliveries).set({ status: terminal ? "failed" : "pending", nextAttemptAt: new Date(Date.now() + delay), error: message, updatedAt: new Date() }).where(eq(familyUpdateDeliveries.id, job.id));
      }
    }
  } finally { draining = false; }
}