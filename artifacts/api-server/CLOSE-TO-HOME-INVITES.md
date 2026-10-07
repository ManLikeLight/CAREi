# Close to Home private invitations

## Release boundary

This is still the fictional-data sample release. These changes do not approve a
real-care pilot, real recipient records, UK hosting, backups, authority/consent,
DPIA or regional AI routing. Keep all existing pilot gates. For an eventual approved
delivery acceptance test, a verified test mailbox may be configured for a fictional
trusted-person record; emails contain only the code, not care data.

The Resend adapter is implemented, but no provider was connected and no live email
was sent during development. Delivery fails closed until an organisation approves
and configures the account. Never replace it with stdout, a sample credential link,
staff-inbox delivery, chat, or an unapproved provider.

## Prepare through the browser, not a terminal

1. An active agency manager creates an access link in **Close to Home: agency
   manager**. This creates the fictional trusted person, authority record and
   permissions but **no sign-in code**. It does not reactivate existing links.
2. A trusted operator independently verifies the recipient's identity, relationship,
   authority and ownership of the delivery address using the organisation's process.
   Staff login or manager approval alone is not identity verification. Record evidence
   in restricted organisational records, never alongside a code.
3. A trusted deployment administrator configures the provider and verified-recipient
   registry using the project's Secrets/environment interface. No HTTP endpoint can
   modify this registry. The approved operator panel shows agency and person IDs
   needed to identify the record; managers cannot change the delivery destination.
4. Only a separately approved, currently active manager/admin can use **Send / resend
   private code**, after confirming private verification and entering the separate
   operator approval key. The result reports provider acceptance only and never
   contains a code or the private destination.

### Configuration

- `CTP_INVITE_DELIVERY_APPROVED=true`: only after the organisation approves Resend,
  its sender/domain, privacy terms and the private email channel.
- Secret `RESEND_API_KEY`: the organisation's approved send-only provider credential.
- `CTP_INVITE_EMAIL_FROM`: a verified sender, e.g. `CAREi <invites@your-domain>`.
- `CTP_INVITE_OPERATORS`: JSON array of separately approved, existing staff accounts,
  scoped to agencies: `[{"agencyId":"agency-reference","email":"operator@example.test"}]`.
  A staff role or an allowlisted email without the separate key cannot send.
- Secret `CTP_INVITE_OPERATOR_KEY`: a cryptographically random secret of 32–256
  characters, shared privately only with trusted operators. It is not a staff PIN.
- Secret `CTP_VERIFIED_INVITE_RECIPIENTS`: JSON array maintained after out-of-band
  verification. Each entry contains `agencyId`, `personId`, `email` (the approved
  delivery address) and `verifiedAt` (the actual ISO verification timestamp).
  The person ID must match the approved fictional record for this sample.
  Example structure with placeholders, not real contacts:
  `[{"agencyId":"agency-reference","personId":"person-id","email":"verified@example.test","verifiedAt":"<actual ISO timestamp>"}]`.

Verification expires after 30 days and cannot be future-dated. Refresh only after
repeating verification. Invalid or ambiguous registry entries fail closed. The
registry is separate from a manager-entered profile email, which cannot redirect
credentials. Agency-scoped verification prevents one agency issuing for another.
Never put provider credentials, operator keys or recipient codes in chat or logs.

Apply the additive `delivered_at` and `recipient_email_hash` columns on `ctp_invite`,
`login_email_hash` on `ctp_trusted_person`, and
`ctp_invite_delivery_state` schema through the existing database release process.
The post-merge setup includes an idempotent additive migration. Production schema
application remains part of the approved release process; this work does not deploy.

## Recipient activation and recovery

The recipient opens `/close-to-home`, selects **Use a private code**, enters the
code from their verified mailbox, and chooses a password. Future email/password
sign-ins use that verified delivery email, independently of the fictional or
manager-entered profile email. Its login digest persists when verification expires;
verification expiry blocks new invites and recovery, not an existing password login.
A code expires after
24 hours and can be redeemed once atomically, including concurrent requests.
Only privately delivered codes can activate/reset access. Old sample credential
links are no longer redeemable; their records are retained and credentials are
not migrated. The portal removes legacy `invite` query parameters and never reads
credentials from URLs.

For lost, expired or used codes, or a forgotten password, open **Need a new private
code?**, enter the agency reference and verified delivery email, then request a
replacement. This produces the same acknowledgement before lookup/provider work,
whether the address is known, unverified, expired, rate-limited, or unavailable.
It does not claim that an email was sent. Check spam; if no email arrives or the
address changes, contact the organisation for private reverification. A restart
during background recovery delivery may prevent sending; retry after five minutes.

## Resend guarantees and limitations

- A durable five-minute limit per agency/person covers operator sends, recovery,
  provider failures, server replicas and restarts.
- Successful replacement delivery expires older unused codes in the same
  transaction. Failed or ambiguous delivery rolls back the new invite and preserves
  old access. An email accepted before a database failure may contain an unusable
  code; recovery is required after the cooldown.
- Provider acceptance is not proof of inbox delivery. Upstream response bodies are
  never logged. No care details, client names, permissions or credential-bearing
  links are sent in the email.
- Only digests are stored. Operators never receive the plaintext code.
- Sending does not change authority, permissions, password, login status or sessions.
  Redemption changes the recipient password and revokes their older sessions
  atomically, without reactivating suspended, expired or revoked access links.
- Recipient cookies and credentials remain separate from staff and legacy family
  sessions. Same-origin custom-header checks protect requests independently of
  SameSite, which the development preview may rewrite.

Before an approved release, verify actual email receipt, sender identity, spam/bounce
handling, operator isolation, expiry, resend and recovery with the real provider.
