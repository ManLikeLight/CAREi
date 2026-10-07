import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

const tenant = () => ({
  agencyId: text("agency_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const ctpPeople = pgTable("ctp_trusted_person", {
  id: text("id").primaryKey(), ...tenant(), name: text("name").notNull(), email: text("email").notNull(),
  phone: text("phone"), passwordHash: text("password_hash"), loginEmailHash: text("login_email_hash"), loginStatus: text("login_status").notNull().default("invited"),
}, t => [uniqueIndex("ctp_person_agency_email_idx").on(t.agencyId, t.email)]);
export const ctpClients = pgTable("ctp_sample_client", {
  id: text("id").primaryKey(), ...tenant(), name: text("name").notNull(), sampleOnly: boolean("sample_only").notNull().default(true),
});
export const ctpLinks = pgTable("ctp_client_trusted_person", {
  id: text("id").primaryKey(), ...tenant(), clientId: text("client_id").notNull().references(() => ctpClients.id),
  trustedPersonId: text("trusted_person_id").notNull().references(() => ctpPeople.id),
  relationship: text("relationship").notNull(), authorityType: text("authority_type").notNull().default("none"),
  authorityEvidenceRef: text("authority_evidence_ref"), authorisedBy: text("authorised_by").notNull(),
  authorisedAt: timestamp("authorised_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("active"), statusReason: text("status_reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }), reviewDueAt: timestamp("review_due_at", { withTimezone: true }).notNull(),
}, t => [uniqueIndex("ctp_link_client_person_idx").on(t.agencyId, t.clientId, t.trustedPersonId)]);
export const ctpPermissions = pgTable("ctp_permission", {
  id: text("id").primaryKey(), ...tenant(), clientTrustedPersonId: text("client_trusted_person_id").notNull().references(() => ctpLinks.id),
  category: text("category").notNull(), canView: boolean("can_view").notNull().default(false),
  canContribute: boolean("can_contribute").notNull().default(false), canNotify: boolean("can_notify").notNull().default(false),
  clientRestricted: boolean("client_restricted").notNull().default(false),
}, t => [uniqueIndex("ctp_permission_link_category_idx").on(t.clientTrustedPersonId, t.category)]);
export const ctpPresets = pgTable("ctp_access_preset", {
  id: text("id").primaryKey(), ...tenant(), name: text("name").notNull(), permissions: jsonb("permissions").notNull(),
}, t => [uniqueIndex("ctp_preset_agency_name_idx").on(t.agencyId, t.name)]);
export const ctpCarerPrivacy = pgTable("ctp_carer_privacy", {
  id: text("id").primaryKey(), ...tenant(), carerId: text("carer_id").notNull(), name: text("name").notNull(),
  photo: text("photo"), showName: boolean("show_name").notNull().default(false), showPhoto: boolean("show_photo").notNull().default(false),
});
export const ctpSettings = pgTable("ctp_agency_settings", {
  agencyId: text("agency_id").primaryKey(),
  carerIdentityEnabled: boolean("carer_identity_enabled").notNull().default(false),
  concernAckMinutes: integer("concern_ack_minutes").notNull().default(30),
  concernEscalateMinutes: integer("concern_escalate_minutes").notNull().default(60),
  escalationContacts: jsonb("escalation_contacts").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
// Sample-only verified snapshots; never modify or treat legacy care records as verified.
export const ctpVisits = pgTable("ctp_sample_visit", {
  id: text("id").primaryKey(), ...tenant(), clientId: text("client_id").notNull().references(() => ctpClients.id),
  carerId: text("carer_id").notNull(), status: text("status").notNull(), verificationMethod: text("verification_method"),
  verified: boolean("verified").notNull().default(false), synced: boolean("synced").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(), completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  plannedAt: timestamp("planned_at", { withTimezone: true }).notNull(),
});
export const ctpSources = pgTable("ctp_verified_source", {
  id: text("id").primaryKey(), ...tenant(), visitId: text("visit_id").notNull().references(() => ctpVisits.id),
  sourceType: text("source_type").notNull(), category: text("category").notNull(), value: text("value").notNull(),
});
export const ctpStories = pgTable("ctp_story", {
  id: text("id").primaryKey(), ...tenant(), visitId: text("visit_id").notNull().references(() => ctpVisits.id),
  version: integer("version").notNull(), status: text("status").notNull(), model: text("model").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("ctp_story_visit_version_idx").on(t.visitId, t.version)]);
export const ctpSentences = pgTable("ctp_story_sentence", {
  id: text("id").primaryKey(), ...tenant(), storyId: text("story_id").notNull().references(() => ctpStories.id),
  seq: integer("seq").notNull(), text: text("text").notNull(), category: text("category").notNull(),
});
export const ctpSentenceSources = pgTable("ctp_story_sentence_source", {
  id: text("id").primaryKey(), ...tenant(), sentenceId: text("sentence_id").notNull().references(() => ctpSentences.id),
  sourceType: text("source_type").notNull(), sourceId: text("source_id").notNull().references(() => ctpSources.id),
});
export const ctpConcerns = pgTable("ctp_concern", {
  id: text("id").primaryKey(), ...tenant(), clientId: text("client_id").notNull().references(() => ctpClients.id),
  clientTrustedPersonId: text("client_trusted_person_id").notNull().references(() => ctpLinks.id),
  reasonCode: text("reason_code").notNull(), detail: text("detail"), status: text("status").notNull().default("received"),
  ackDueAt: timestamp("ack_due_at", { withTimezone: true }).notNull(), acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }), escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  secondEscalatedAt: timestamp("second_escalated_at", { withTimezone: true }), resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }), resolutionNote: text("resolution_note"),
});
export const ctpAudit = pgTable("ctp_access_audit", {
  id: text("id").primaryKey(), ...tenant(), actorType: text("actor_type").notNull(), actorId: text("actor_id").notNull(),
  action: text("action").notNull(), target: text("target").notNull(), clientId: text("client_id"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
export const ctpSessions = pgTable("ctp_session", {
  id: text("id").primaryKey(), ...tenant(), trustedPersonId: text("trusted_person_id").notNull().references(() => ctpPeople.id),
  tokenHash: text("token_hash").notNull().unique(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export const ctpInvites = pgTable("ctp_invite", {
  id: text("id").primaryKey(), ...tenant(), trustedPersonId: text("trusted_person_id").notNull().references(() => ctpPeople.id),
  tokenHash: text("token_hash").notNull().unique(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  recipientEmailHash: text("recipient_email_hash"),
});
export const ctpJobs = pgTable("ctp_story_job", {
  id: text("id").primaryKey(), ...tenant(), visitId: text("visit_id").notNull().references(() => ctpVisits.id),
  status: text("status").notNull().default("pending"), regenerate: boolean("regenerate").notNull().default(false),
});
export const ctpNotifications = pgTable("ctp_notification", {
  id: text("id").primaryKey(), ...tenant(), type: text("type").notNull(), recipientType: text("recipient_type").notNull(),
  recipientId: text("recipient_id").notNull(), channel: text("channel").notNull(), status: text("status").notNull().default("sample_only"),
  text: text("text").notNull(), target: text("target").notNull(), dedupeKey: text("dedupe_key").notNull().unique(),
});
