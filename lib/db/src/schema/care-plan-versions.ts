import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const carePlanVersions = pgTable(
  "care_plan_versions",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull(),
    version: integer("version").notNull(),
    assessmentInput: text("assessment_input").notNull(),
    plan: jsonb("plan").notNull(),
    confirmedBy: text("confirmed_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("care_plan_versions_client_version_idx").on(
      table.clientId,
      table.version,
    ),
  ],
);

export const insertCarePlanVersionSchema = createInsertSchema(
  carePlanVersions,
).omit({
  id: true,
  createdAt: true,
});

export type CarePlanVersion = typeof carePlanVersions.$inferSelect;
export type InsertCarePlanVersion = z.infer<
  typeof insertCarePlanVersionSchema
>;