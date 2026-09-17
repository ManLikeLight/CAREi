import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visitRecords = pgTable(
  "visit_records",
  {
    visitKey: text("visit_key").notNull(),
    clientId: text("client_id").notNull(),
    clientName: text("client_name").notNull(),
    carerName: text("carer_name").notNull(),
    carerEmail: text("carer_email").notNull(),
    agency: text("agency").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("completed"),
    notes: text("notes"),
    mood: text("mood"),
    mealStatus: text("meal_status"),
    fluidGlasses: integer("fluid_glasses"),
    completedActivities: jsonb("completed_activities").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("visit_records_visit_key_idx").on(table.visitKey),
    index("visit_records_client_completed_idx").on(
      table.clientId,
      table.completedAt,
    ),
    index("visit_records_agency_completed_idx").on(
      table.agency,
      table.completedAt,
    ),
  ],
);

export const medicationConfirmationRecords = pgTable(
  "medication_confirmation_records",
  {
    confirmationKey: text("confirmation_key").notNull(),
    visitKey: text("visit_key"),
    clientId: text("client_id").notNull(),
    clientName: text("client_name").notNull(),
    medicationName: text("medication_name").notNull(),
    dose: text("dose"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    carerName: text("carer_name").notNull(),
    carerEmail: text("carer_email").notNull(),
    agency: text("agency").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex(
      "medication_confirmation_records_confirmation_key_idx",
    ).on(table.confirmationKey),
    index("medication_records_client_recorded_idx").on(
      table.clientId,
      table.recordedAt,
    ),
    index("medication_records_agency_recorded_idx").on(
      table.agency,
      table.recordedAt,
    ),
  ],
);

export const insertVisitRecordSchema = createInsertSchema(visitRecords).omit({
  createdAt: true,
});
export const insertMedicationConfirmationRecordSchema = createInsertSchema(
  medicationConfirmationRecords,
).omit({ createdAt: true });

export type VisitRecord = typeof visitRecords.$inferSelect;
export type InsertVisitRecord = z.infer<typeof insertVisitRecordSchema>;
export type MedicationConfirmationRecord =
  typeof medicationConfirmationRecords.$inferSelect;
export type InsertMedicationConfirmationRecord = z.infer<
  typeof insertMedicationConfirmationRecordSchema
>;