import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// No plaintext credentials or destination addresses; supports durable resend limits.
export const ctpInviteDeliveryState = pgTable("ctp_invite_delivery_state", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id").notNull(),
  trustedPersonId: text("trusted_person_id").notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
}, t => [uniqueIndex("ctp_delivery_person_idx").on(t.agencyId, t.trustedPersonId)]);
