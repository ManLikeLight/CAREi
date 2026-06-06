# SEO Strategy

## In scope
- Public homepage and entry experience served at `/`
- Shared HTML shell metadata, social tags, crawler-facing assets, and branding assets
- Public assets that affect search snippets or link previews

## Out of scope
- Authenticated care workflow screens inside the SPA state machine (`today`, `active-visit`, `medication`, `handover`, `profile`, etc.)
- Admin and manager screens (`admin`, `admin-dashboard`, `manager-approvals`)
- API endpoints under `/api/**`

## Target audience
- UK domiciliary care agencies
- CQC-regulated home care providers
- Care managers and carers evaluating digital care operations software

## Primary keywords
- AI domiciliary care management app
- home care management software
- CQC care software
- domiciliary care app

## Notes
- The frontend is a Vite React SPA. The public SEO surface is primarily the single `/` HTML shell plus any static assets in `public/`.
- The backend is an API only and does not provide SSR marketing pages.

## Dismissed categories
- (None yet)
