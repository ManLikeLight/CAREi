import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generatedDocuments = pgTable(
  "generated_documents",
  {
    id: serial("id").primaryKey(),
    documentType: text("document_type").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    status: text("status").notNull(),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    userRole: text("user_role").notNull(),
    clientId: text("client_id"),
    clientName: text("client_name"),
    sourceDetails: jsonb("source_details").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("generated_documents_user_created_idx").on(
      table.userEmail,
      table.createdAt,
    ),
    index("generated_documents_client_created_idx").on(
      table.clientId,
      table.createdAt,
    ),
  ],
);

export const insertGeneratedDocumentSchema = createInsertSchema(
  generatedDocuments,
).omit({ id: true, createdAt: true, updatedAt: true });

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type InsertGeneratedDocument = z.infer<
  typeof insertGeneratedDocumentSchema
>;