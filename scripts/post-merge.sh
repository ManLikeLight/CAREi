#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm exec tsc -b lib/db lib/api-zod lib/api-client-react
pnpm --filter db push
pnpm --filter @workspace/api-server exec tsx src/scripts/migrate-ctp-invite-delivery.ts
