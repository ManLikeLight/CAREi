import { db, securityEvents } from "@workspace/db";

export type SecurityEventInput = {
  eventType: string;
  actorEmail?: string;
  subjectEmail?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Security events are deliberately append-only from application code.
 * Callers should not include PINs, tokens, or care-note content in metadata.
 */
export async function recordSecurityEvent(
  input: SecurityEventInput,
): Promise<void> {
  await db.insert(securityEvents).values({
    eventType: input.eventType,
    actorEmail: input.actorEmail?.toLowerCase().trim() || null,
    subjectEmail: input.subjectEmail?.toLowerCase().trim() || null,
    deviceId: input.deviceId || null,
    metadata: input.metadata,
  });
}