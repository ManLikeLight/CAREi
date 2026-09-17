import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const securityEvents = pgTable(
  "security_events",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type").notNull(),
    actorEmail: text("actor_email"),
    subjectEmail: text("subject_email"),
    deviceId: text("device_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("security_events_actor_created_idx").on(
      table.actorEmail,
      table.createdAt,
    ),
    index("security_events_subject_created_idx").on(
      table.subjectEmail,
      table.createdAt,
    ),
    index("security_events_type_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
  ],
);

export const insertSecurityEventSchema = createInsertSchema(
  securityEvents,
).omit({
  id: true,
  createdAt: true,
});

export type SecurityEvent = typeof securityEvents.$inferSelect;