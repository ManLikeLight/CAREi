---
name: Messaging architecture
description: How carer↔manager in-app messaging is implemented across server, client lib, and UI.
---

## Server (`artifacts/api-server/src/routes/messages.ts`)
- Mounted at `/api/messages` via `routes/index.ts`
- Storage: `@replit/database` — key `msg_<id>` per message, `msgs_index` = string[] of all IDs
- Routes: `POST /messages`, `GET /messages?carerId=xxx`, `POST /messages/:id/reply`, `PATCH /messages/:id/read`
- No carerId param on GET = manager sees all; with param = carer sees own

## Client lib (`artifacts/carei-app/src/lib/messaging.ts`)
- Types: `Message`, `QueuedMessage`, `MessageReply`
- `MESSAGE_TAGS` catalogue: running-late, overstay, client-concern, urgent, update
- API helpers: `apiFetchMessages`, `apiSendMessage`, `apiReplyToMessage`, `apiMarkRead` — all use `/api/...` paths
- `formatRelativeTime`, `tagLabel`, `tagEmoji` formatting utils

## UI component (`artifacts/carei-app/src/components/MessagingScreen.tsx`)
- Props: `role`, `carerId`, `carerName`, `cryptoKey?`, `onBack`
- Three views: inbox/thread list → compose modal → thread detail
- Quick-send templates (5 pre-written messages with auto-tags)
- Tag chips for: running-late 🏃, overstay ⏰, client-concern ⚠️, urgent 🚨, update 📋

## Encryption at rest
- `saveEncrypted(cryptoKey, "msgs_<carerId>", messages)` — full thread cache
- `saveEncrypted(cryptoKey, "msgqueue_<carerId>", queue)` — offline outbox
- Both keyed per-carer so different logins don't share IDB blobs

## Offline-first queue
- On send: try `apiSendMessage`; if offline/error → push `QueuedMessage` to `queue` state + save encrypted
- On `online` event → drain queue: send each queued item, on success remove from queue
- Queued messages render with amber "Pending" badge in the thread list

## CAREiApp.tsx wiring
- `serverMessages`, `messageQueue`, `msgUnreadCount` state
- Load from encrypted IDB in the existing `encryptedDataLoadedRef` effect
- 60s poll via `setInterval(apiFetchMessages, 60_000)` — no poll carerId for manager
- `msgUnreadCount` shown as red badge on the 💬 Messages bottom nav button (carer view)
- `case "messages"` navigates to `<MessagingScreen ...>`; back → `manager-portal` or `today` by role
- Manager portal has a "Team Messages 💬" row in the MANAGE section

**Why:** Messages contain care-sensitive personal data; IDB encryption ensures at-rest protection consistent with the rest of the app's security posture.
