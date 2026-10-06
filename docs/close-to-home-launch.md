# Close to Home: sample MVP and pilot checklist

Close to Home replaces the Family Portal. Former `/family` links open `/close-to-home`, outside the staff PIN/offline wrapper. Recipients may be authorised friends or other trusted people, not only relatives. Legacy family records and endpoints are retained without being exposed through the new portal; old access grants and invitation tokens do not automatically grant Close to Home access. Issue a Close to Home invitation through its manager controls.

## What this build does

- Trusted-person portal at `/close-to-home`, separate from CAREi staff login and offline storage.
- Agency manager controls in CAREi → Manager Portal → Close to Home.
- Explicitly create fictional clients, carers, verified visits and sources with **Create sample fixture**.
- Invitations are single-use, expire after seven days, store only a token hash, and set an independent HttpOnly, Secure session cookie lasting 15 minutes.
- New links grant nothing. Three presets copy flags; wishes restrictions remain in place. Relationships and authority never grant permission.
- Each category is checked server-side. View restrictions also remove story sentences and reassurance facts for that category. Requests are no-store.
- Changes invalidate active trusted-person sessions. Suspension/revocation/expiry fail closed without exposing the staff reason.
- Verified completed/synced QR or geofence sample visits queue one background story job. Source corrections hide the old current story immediately, retain it as superseded, and queue an audited new version.
- Stories use verified fact templates unless regional Azure configuration is present. AI output must pass source/type/category validation **and match approved factual renderings**. Unsupported paraphrases fall back instead of relying on source IDs to prove truth.
- Concerns support received → reviewing → resolved with a resolution note. Trusted people receive status and timestamps only.
- Concern deadlines trigger two escalation levels. Staff notices do not go to the assigned carer.

## Deliberately unconfigured, not simulated as delivered

**No real data or email delivery is enabled.** The invitation UI copies a sample link. Notification rows are labelled `sample_only`, including their email channel. They are not delivered emails or push messages. The manager console shows this explicitly.

Only fictional `example.com`, `example.org`, `example.net`, `.example`, and `.test` email addresses are accepted. Names, phone and evidence must also be fictional. Existing CAREi care records are not copied into this portal: legacy records do not carry the verified/synced provenance required by the specification.

Sample carer privacy choices can be exercised by managers on fictional carers only. Before a real pilot, wire the preferences to authenticated carers' own choices; managers must not impersonate a carer's consent.

The developer runtime remains Node 24/PostgreSQL 16 rather than downgrading the whole existing application to Node 22. No platform or database has been replaced.

## Azure configuration

Store credentials in workspace/production secrets; do not put them in git:

- `CTP_AZURE_OPENAI_KEY`
- `CTP_AZURE_OPENAI_ENDPOINT`: HTTPS endpoint ending in `.openai.azure.com`
- `CTP_AZURE_OPENAI_DEPLOYMENT`
- `CTP_AZURE_REGION`: `uksouth`
- `CTP_AZURE_DEPLOYMENT_TYPE`: `Standard`

The CTP worker refuses other regional/type declarations and never calls CAREi's existing Anthropic integration. Verify the actual Azure resource is a regional UK South Standard deployment; environment labels alone do not prove residency. Template fallback remains available.

## Scheduler and deployment

The development/sample server runs a five-minute sweep. Production pilot infrastructure still needs Google Cloud Scheduler:

- POST `/api/ctp/jobs/escalate` every five minutes.
- Authenticate with `Authorization: Bearer <dedicated scheduler secret>` matching `CTP_SCHEDULER_TOKEN`; this endpoint rejects staff and trusted-person credentials.
- Store this separate token in secrets; never share it in invitation URLs.
- Cloud Run should use an always-on/background-capable worker or a separate scheduled worker for queued story generation; request responses never wait for AI.

Schema changes are additive `ctp_*` tables. Replit applies development schema changes when publishing to its managed production database; review that publishing step and confirm the new tables are present before exercising Close to Home. Never wipe or replace existing CAREi tables. The normal app build does not itself apply migrations. If the deployment uses a separately managed database, apply the additive schema through that database's approved migration process instead.

## Pilot gates — all remain mandatory

1. Sample acceptance checks pass, including browser logout/back/refresh and suspension.
2. DPIA completed and consent/authority model reviewed by a data protection adviser.
3. Carer device encryption, app lock and remote wipe are live and verified.
4. Google Cloud London Cloud Run / Cloud SQL deployment is provisioned; automated backups are confirmed.
5. Azure regional UK South Standard deployment and full care-data provider routing are confirmed.
6. Agency names a concern responder and configures deadlines and authorised escalation contacts.
7. Authenticated invitation email and generic notification delivery are connected, with permission checks immediately before delivery.
8. Real carer privacy self-service is connected and live verified-record ingestion is authorised.

Republishing on Replit is a **sample release**, not evidence that Google Cloud London hosting or any pilot gate has been met.

## Verification commands

```sh
pnpm --filter @workspace/api-spec codegen
pnpm exec tsc -b lib/db lib/api-zod lib/api-client-react
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/carei-app typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=18548 BASE_PATH=/ pnpm --filter @workspace/carei-app build
```

The integration test creates an isolated fictional tenant and deletes only that tenant's CTP records afterward. It does not modify production.
