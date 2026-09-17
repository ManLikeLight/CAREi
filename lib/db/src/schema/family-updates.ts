import { index, pgTable, serial, text, boolean, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const familyUpdateConsents = pgTable("family_update_consents", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  familyMemberId: text("family_member_id").notNull(),
  familyMemberName: text("family_member_name").notNull(),
  recordedByName: text("recorded_by_name").notNull(),
  recordedByEmail: text("recorded_by_email").notNull(),
  optedIn: boolean("opted_in").notNull().default(false),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("family_update_consents_client_member_idx").on(table.clientId, table.familyMemberId),
  index("family_update_consents_client_idx").on(table.clientId),
]);

export const familyUpdateDeliveries = pgTable("family_update_deliveries", {
  id: serial("id").primaryKey(),
  visitKey: text("visit_key").notNull(),
  clientId: text("client_id").notNull(),
  familyMemberId: text("family_member_id").notNull(),
  familyMemberName: text("family_member_name").notNull(),
  channel: text("channel").notNull().default("in_app"),
  status: text("status").notNull().default("pending"),
  summary: text("summary"),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("family_update_deliveries_visit_member_idx").on(table.visitKey, table.familyMemberId),
  index("family_update_deliveries_pending_idx").on(table.status, table.createdAt),
  index("family_update_deliveries_client_member_idx").on(table.clientId, table.familyMemberId, table.createdAt),
]);

export const insertFamilyUpdateConsentSchema = createInsertSchema(familyUpdateConsents).omit({ id: true, createdAt: true, updatedAt: true });
export type FamilyUpdateConsent = typeof familyUpdateConsents.$inferSelect;
export type FamilyUpdateDelivery = typeof familyUpdateDeliveries.$inferSelect;