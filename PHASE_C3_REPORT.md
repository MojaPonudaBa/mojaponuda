# Phase C.3 Report — Vault & Agency Redesign

## Scope

Phase C.3 ports the redesigned document hub and agency CRM surfaces into the production Next.js + Supabase app while preserving existing data flows, authentication checks, ownership checks, and mutation endpoints.

## Changed files

- `lib/dashboard-c3.ts`
  - Added shared serializable data helpers for vault and agency KPI/chart/risk derivations.
- `components/dashboard/vault-hub-client.tsx`
  - Added client island for redesigned `/dashboard/vault` with tabs, filters, KPI strip, 3-panel layout, risk view, document table/card switch, right rail, and existing upload modal integration.
- `components/dashboard/document-templates-client.tsx`
  - Added UI-only generic templates library for `/dashboard/vault/sabloni` without schema changes or persisted mock records.
- `app/(dashboard)/dashboard/vault/page.tsx`
  - Rewired server data loading into the new vault client island.
  - Preserved normal user onboarding checks and agency-plan branch.
  - Added real `bid_documents` usage aggregation for reuse counts and tender grouping.
- `app/(dashboard)/dashboard/vault/sabloni/page.tsx`
  - Added new templates subroute with auth/subscription/onboarding-safe access.
- `components/agency/agency-crm-dashboard.tsx`
  - Added portfolio-health section and status donut while preserving `AddClientModal`, existing filters, alerts, grants, and client navigation.
- `components/agency/agency-client-detail.tsx`
  - Added redesigned overview blocks for recommendations, performance chart, status donut, right rail, and next-step guidance.
  - Preserved CRM save and note creation mutation flows.
- `app/(dashboard)/dashboard/agency/clients/[id]/documents/page.tsx`
  - Redesigned client documents page with hero, KPI strip, document grid, type donut, recent documents, and mutation-preservation notice.
- Agency route gating updates:
  - `app/(dashboard)/dashboard/agency/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/home/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/tenders/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/tenders/[tenderId]/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/bids/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/bids/[bidId]/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/documents/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/intelligence/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/intelligence/upcoming/page.tsx`
  - `app/(dashboard)/dashboard/agency/clients/[id]/prilike/page.tsx`
  - Replaced hard `plan.id !== "agency"` checks with `isAgencyPlan(plan)` so complimentary/agency variants continue to work.

## Data sources preserved

- Vault documents:
  - `documents` scoped by authenticated user's `companies.id` for regular users.
  - `documents` scoped by agency-owned client company IDs for agency users.
- Vault reuse/tender grouping:
  - `bid_documents` joined through `bids` and `tenders`.
- Agency client list:
  - Existing `agency_clients` ownership query by `agency_user_id`.
  - Existing aggregate queries for bids, documents, alerts, and grants remain in place.
- Agency detail:
  - Existing company, bids, documents, notes, and tender recommendation queries remain in place.
- Agency client subroutes:
  - Existing client ownership checks remain on `agency_clients.agency_user_id`.

## Mutation flows preserved

- `AddDocumentModal` is reused on vault and agency documents surfaces.
- `DocumentCard` / `DocumentGrid` are reused for existing signed URL/download/delete flows.
- `AddClientModal` remains the client creation entry point on agency dashboard.
- `AgencyClientDetail` keeps:
  - `PATCH /api/agency/clients/[id]` for CRM data.
  - `POST /api/agency/notes` for notes.
- No `/api/agency/*` route was changed.
- No `/api/documents/*` route was changed.

## Known data/schema limitations

- Shared/archive document tabs are visible in the redesigned vault UI but intentionally show empty-state behavior because the current `documents` table does not expose shared/archive fields.
- `/dashboard/vault/sabloni` is UI-only because there is no template table or generation backend in the current schema.
- Agency client document upload still uses the existing production upload API, which resolves `company_id` from the logged-in user's own company. It was not changed in C.3 to avoid altering mutation semantics without a dedicated agency-client upload contract.
- The performance chart on agency client detail is derived from existing bid counts and values, not from a historical analytics table.

## RSC serialization audit

- New interactive vault UI lives in `components/dashboard/vault-hub-client.tsx` with `"use client"`.
- Server page `app/(dashboard)/dashboard/vault/page.tsx` passes only serializable arrays, strings, numbers, booleans, and nullable fields to `VaultHubClient`.
- `/dashboard/vault/sabloni` renders a dedicated client island and passes no functions from server to client.
- `AgencyClientDetail` additions are inside an existing client component.
- Agency documents page avoids passing JSX/component references as props to client components. KPI cards are rendered as server markup; chart data passed to `DonutChart` is serializable.
- `npx tsc --noEmit --pretty false` passed after changes.

## Verification performed

- `npx tsc --noEmit --pretty false`
  - Result: passed.
- Targeted ESLint over C.3 changed files
  - Result: passed.
- Full `npm run lint -- --max-warnings=0`
  - Result: failed on pre-existing unrelated warnings/errors in `scripts`, `sync`, generated/large scraper outputs, and utility files outside Phase C.3 scope.
- RSC prop audit via code search:
  - No server-to-client function props introduced in new C.3 server pages.
- Gating audit:
  - Agency routes now use `isAgencyPlan(plan)` instead of direct `plan.id` checks.
- Git status/diff:
  - Not available because this workspace folder does not contain a `.git` directory.

## Manual test checklist

Run with an agency test user and a regular company user before proceeding to C.4.

- [ ] Regular user can open `/dashboard/vault` after onboarding.
- [ ] Regular user can upload a document through the existing modal.
- [ ] Newly uploaded document appears in vault table/card view.
- [ ] Existing document preview/download/delete still works through existing document components.
- [ ] `/dashboard/vault/sabloni` loads and template UI actions do not persist data.
- [ ] Agency user can open `/dashboard/agency`.
- [ ] Non-agency user is gated away from agency routes.
- [ ] Agency user only sees clients where `agency_clients.agency_user_id` matches the current user.
- [ ] `/dashboard/agency/clients/[id]` stays detail/CRM mode, not full client dashboard sidebar mode.
- [ ] `/dashboard/agency/clients/[id]/home` still opens full client dashboard mode.
- [ ] Agency client CRM save still persists via `/api/agency/clients/[id]`.
- [ ] Agency client note creation still persists via `/api/agency/notes`.
- [ ] `/dashboard/agency/clients/[id]/documents` shows documents scoped to that client's company.
- [ ] Bid-document linking remains visible in bid workspace and vault reuse counts.

## Screenshot checklist

Screenshots still need to be captured manually from the running app:

- [ ] `phase-c3-vault.png`
- [ ] `phase-c3-vault-sabloni.png`
- [ ] `phase-c3-agency.png`
- [ ] `phase-c3-agency-client-detail.png`
- [ ] `phase-c3-agency-client-documents.png`
