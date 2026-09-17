import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generatedReports = pgTable(
  "generated_reports",
  {
    id: serial("id").primaryKey(),
    request: text("request").notNull(),
    reportType: text("report_type").notNull(),
    dateFrom: timestamp("date_from", { withTimezone: true }).notNull(),
    dateTo: timestamp("date_to", { withTimezone: true }).notNull(),
    clientId: text("client_id"),
    clientName: text("client_name"),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    narrative: text("narrative").notNull(),
    underlyingData: jsonb("underlying_data").notNull(),
    rowCount: integer("row_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("generated_reports_user_created_idx").on(
      table.userEmail,
      table.createdAt,
    ),
    index("generated_reports_client_created_idx").on(
      table.clientId,
      table.createdAt,
    ),
  ],
);

export const insertGeneratedReportSchema = createInsertSchema(
  generatedReports,
).omit({ id: true, createdAt: true });

export type GeneratedReport = typeof generatedReports.$inferSelect;
export type InsertGeneratedReport = z.infer<
  typeof insertGeneratedReportSchema
>;