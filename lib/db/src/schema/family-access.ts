import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Invite and session credentials are stored only as SHA-256 digests.
export const familyAccess = pgTable("family_access", {
  inviteHash: text("invite_hash").primaryKey(),
  clientId: text("client_id").notNull(),
  familyMemberId: text("family_member_id").notNull(),
  familyMemberName: text("family_member_name").notNull(),
  inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }).notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  sessionHash: text("session_hash").unique(),
  sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
});

export const insertFamilyAccessSchema = createInsertSchema(familyAccess);
export type FamilyAccess = typeof familyAccess.$inferSelect;
