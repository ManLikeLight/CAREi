import {
  boolean,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const careAssistantAudit = pgTable(
  "care_assistant_audit",
  {
    id: serial("id").primaryKey(),
    carerName: text("carer_name").notNull(),
    carerEmail: text("carer_email").notNull(),
    clientId: text("client_id"),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    emergencyEscalation: boolean("emergency_escalation")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("care_assistant_audit_carer_created_idx").on(
      table.carerEmail,
      table.createdAt,
    ),
    index("care_assistant_audit_client_created_idx").on(
      table.clientId,
      table.createdAt,
    ),
  ],
);

export const insertCareAssistantAuditSchema = createInsertSchema(
  careAssistantAudit,
).omit({
  id: true,
  createdAt: true,
});

export type CareAssistantAuditEntry = typeof careAssistantAudit.$inferSelect;