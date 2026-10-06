# Recipient access

Family access is separate from staff authentication. Send recipients to `/family`.
Staff tokens cannot read delivered updates or confirm/withdraw recipient consent.
Only approved server summaries are displayed; local staff visit data is never used.

## Issue an invite

A trusted operator must verify the intended recipient's identity and their relationship
to the client using the organisation's established process **before** issuing a code.
This initial release supports the James/Mary mapping only. Do not issue codes for
other people or share them with staff acting as the recipient.

From the workspace, run:

```sh
pnpm --filter @workspace/api-server exec tsx src/scripts/invite-family.ts --recipient-verified
```

Deliver the resulting code privately to the verified recipient through an approved
channel. Treat it as a password. Do not put it in URLs, tickets, shared chat, screenshots,
or application logs. It expires after 24 hours and can be redeemed exactly once.
The recipient enters it on `/family`. A lost/expired session requires a newly verified
invite. There is deliberately no staff HTTP endpoint for issuing invites.

The session lasts eight hours, survives reloads through a separate HttpOnly,
SameSite=Strict cookie, and is revoked server-side on sign-out. Credentials are stored
only as digests in PostgreSQL. Apply the additive `family_access` schema before
running this release in another environment using the project's existing schema process.

The external development-preview proxy rewrites cookies to `SameSite=None; Secure`
for its iframe. The server's direct response still uses Strict. Do not rely on
SameSite alone: mutations require a custom header and JSON (except bodyless sign-out),
reject non-same-origin browser fetch metadata, and recipient responses disable
cross-origin credential access.

Withdrawal prevents future delivery; previously delivered updates remain available
to the same authenticated recipient. Neither staff nor a different recipient can
read or change that client's/member's consent.
