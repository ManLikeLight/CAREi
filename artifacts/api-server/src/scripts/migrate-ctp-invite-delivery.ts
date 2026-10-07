import { pool } from "@workspace/db";

try {
  await pool.query(`
    ALTER TABLE ctp_invite ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
    ALTER TABLE ctp_invite ADD COLUMN IF NOT EXISTS recipient_email_hash text;
    ALTER TABLE ctp_trusted_person ADD COLUMN IF NOT EXISTS login_email_hash text;
    CREATE TABLE IF NOT EXISTS ctp_invite_delivery_state (
      id text PRIMARY KEY, agency_id text NOT NULL, trusted_person_id text NOT NULL,
      last_attempt_at timestamptz NOT NULL, last_sent_at timestamptz
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ctp_delivery_person_idx
      ON ctp_invite_delivery_state(agency_id, trusted_person_id);
  `);
} finally { await pool.end(); }
