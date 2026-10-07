# Legacy recipient access

Close to Home replaces the old Family Portal. `/family` redirects to
`/close-to-home`; the retired `FamilyView` is not re-enabled.

The terminal command `src/scripts/invite-family.ts` has been removed. Do not issue
new legacy family credentials. Existing legacy records, expiry, atomic single-use
redemption and separate recipient sessions are preserved; they are not converted
into Close to Home credentials or permissions.

For the current browser-based private invitation and recovery workflow, see
[CLOSE-TO-HOME-INVITES.md](CLOSE-TO-HOME-INVITES.md). Staff access does not establish
recipient identity, and a manager must never issue and consume a recipient's code.

Neither legacy credentials nor Close to Home codes belong in URLs, shared chat,
tickets, screenshots or application logs.
