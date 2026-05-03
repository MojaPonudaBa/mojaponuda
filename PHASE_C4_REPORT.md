# Phase C.4 Report - High-Risk Pages

## Scope

Ported and stabilized the Phase C.4 high-risk dashboard areas:

- `/dashboard/tenders`
- `/dashboard/ponude`
- `/dashboard/bids`
- `/dashboard/bids/[id]`
- `/dashboard/settings`

The implementation intentionally avoided SQL migrations and preserved the existing Supabase/API mutation model.

## Files changed for C.4

- `app/(dashboard)/dashboard/tenders/page.tsx`
- `app/(dashboard)/dashboard/ponude/page.tsx`
- `app/(dashboard)/dashboard/bids/page.tsx`
- `app/(dashboard)/dashboard/bids/[id]/page.tsx`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `app/actions/bids.ts`
- `app/actions/user-settings.ts`
- `components/bids/kanban-board.tsx`
- `components/bids/bids-table.tsx`
- `components/bids/workspace/bid-workspace-client.tsx`
- `components/settings/recommendation-weights-settings.tsx`

## What changed

### `/dashboard/tenders`

- Added redesigned tender browsing UI with list, table, and grid view modes.
- Preserved existing SSR tender loading, filtering, sorting, pagination, recommendation enrichment, and agency multi-client aggregation.
- Added AI insight presentation and richer score/metadata cards without replacing existing recommendation logic.
- Kept URL-driven view mode state so filters and navigation remain shareable.

### `/dashboard/ponude`

- Added redesigned pipeline hero, operational side rail, and AI focus summary.
- Preserved the existing `bids` query and `tenders` join.
- Kept the existing database-backed statuses: `draft`, `in_review`, `submitted`, `won`, `lost`.
- Did not add a sixth pipeline stage because that would require a `bid_status` enum migration.
- Kanban drag/drop now persists through `updateBidFieldsAction` with `status` and `kanban_position`.
- Dragging a card to `won` opens an outcome dialog for final status and final value before saving.
- No `localStorage` fallback was added.

### `/dashboard/bids`

- Added redesigned hero and KPI strip for total, active, submitted, won, and overdue bids.
- Preserved the existing personal/agency branching and access model.
- Updated table status/delete interactions to use server actions instead of direct client fetch for those two mutations.
- Kept optimistic UI rollback behavior on action failure.

### `/dashboard/bids/[id]`

- Added a tabbed bid workspace shell:
  - Pregled
  - Dokumenti
  - Zadaci
  - Tim
  - Komentari
- Preserved existing mutation components:
  - `ChecklistPanel`
  - `DocumentsPanel`
  - `TenderDocViewer`
  - `TenderDocFullViewer`
  - `BidComments`
  - `NotesSection`
- Comments are now rendered through the workspace `commentsSection` tab and still submit via existing server actions.
- Checklist and document upload/attach/remove flows continue to use the existing API routes.

### `/dashboard/settings`

- Added algorithm weights settings inside the notifications settings area.
- Reads existing `user_settings.recommendation_weights`.
- Saves via `updateRecommendationWeightsAction`.
- Enforces:
  - each slider: 0-50%
  - total sum: exactly 100%
- Added live re-rank preview using recent tenders loaded from Supabase.
- Preserved profile, team, notification, eJN credentials, and danger-zone settings tabs.

## Mutation mapping

### Bid status changes

- Table status changes: `components/bids/bids-table.tsx` -> `updateBidFieldsAction`
- Kanban drag/drop: `components/bids/kanban-board.tsx` -> `updateBidFieldsAction`
- Bid workspace top bar remains on the existing `/api/bids/[id]` `PATCH` flow.

### Kanban persistence

- `status` is saved to `bids.status`.
- `kanban_position` is saved to `bids.kanban_position`.
- Server action scopes updates through `resolveBidAccess` and `company_id`.

### Bid deletion

- Table deletion now uses `deleteBidAction`.
- Existing workspace delete remains through `/api/bids/[id]` `DELETE`.

### Comments

- Add comment: `addBidCommentAction`
- Delete comment: `deleteBidCommentAction`
- Delete comment is now scoped by `bid_id` and `user_id` after resolving bid access.

### Documents

Preserved existing document mutation routes:

- Attach/upload: `/api/bids/[id]/documents`
- Remove: `/api/bids/[id]/documents/[bidDocId]`

### Checklist

Preserved existing checklist mutation routes:

- List/create: `/api/bids/[id]/checklist`
- Update/delete item: `/api/bids/[id]/checklist/[itemId]`

### Settings algorithm weights

- Save action: `updateRecommendationWeightsAction`
- Table: `user_settings`
- Column: `recommendation_weights`
- No migration added.

## Access-control notes

- `updateBidStatusAction`, `updateBidFieldsAction`, `deleteBidAction`, `addBidCommentAction`, and `deleteBidCommentAction` resolve bid access before mutating bid-scoped data.
- `updateBidFieldsAction` additionally scopes the update by `company_id`.
- Existing API route access checks were not removed.

## Validation performed

### Production Next build

```bash
npx next build
```

Result: passed. The target routes were included in the successful route manifest:

- `/dashboard/tenders`
- `/dashboard/ponude`
- `/dashboard/bids`
- `/dashboard/bids/[id]`
- `/dashboard/settings`

### TypeScript

```bash
npx tsc --noEmit --pretty false
```

Result: passed.

### Targeted ESLint

```bash
npx eslint "app/(dashboard)/dashboard/tenders/page.tsx" "app/(dashboard)/dashboard/ponude/page.tsx" "app/(dashboard)/dashboard/bids/page.tsx" "app/(dashboard)/dashboard/bids/[id]/page.tsx" "app/(dashboard)/dashboard/settings/page.tsx" "app/actions/bids.ts" "app/actions/user-settings.ts" "components/bids/kanban-board.tsx" "components/bids/bids-table.tsx" "components/bids/workspace/bid-workspace-client.tsx" "components/settings/recommendation-weights-settings.tsx"
```

Result: passed.

### Browser verification performed

Authenticated browser screenshots were captured locally through a temporary Supabase SSR session cookie generated for the existing verification user. No SQL migrations were applied and no test rows were inserted.

Captured:

- `phase-c4-tenders.png`
- `phase-c4-ponude.png`
- `phase-c4-bids.png`
- `phase-c4-settings-algorithm.png`

Observed:

- `/dashboard/tenders` rendered behind auth with the redesigned tender radar shell, view toggles, filters, empty recommended state, and quick actions.
- `/dashboard/ponude` rendered behind auth with the redesigned pipeline shell and empty-state CTA.
- `/dashboard/bids` rendered behind auth with the redesigned bid cockpit, KPI strip, filters, and empty-state CTA.
- `/dashboard/settings` rendered behind auth with the redesigned settings shell and tabs.

Limitations:

- The verification user currently has no bid rows, so `/dashboard/bids/[id]` screenshots and live checklist/document/comment mutations could not be exercised without inserting test data.
- Kanban drag/drop persistence could not be live-tested for the same reason.
- Settings algorithm slider save behavior was validated at code/action level; the browser screenshot captured the settings shell/profile tab rather than a completed slider mutation.

## Manual verification checklist

### `/dashboard/tenders`

- Status: partially verified in authenticated browser.
- Filtering controls, view toggle UI, empty-state behavior, and page shell rendered.
- Data-rich tender links/recommendations require a user with matching tender data for final live confirmation.

### `/dashboard/ponude`

- Status: code verified and empty-state browser verified.
- Live drag/drop persistence requires at least one existing bid for the verification user.
- The persistence path is wired through `KanbanBoard` -> `updateBidFieldsAction` -> `bids.status`/`bids.kanban_position`.

### `/dashboard/bids`

- Status: code verified and empty-state browser verified.
- Live status/delete mutation requires a disposable test bid.
- Table mutations are wired through `updateBidFieldsAction` and `deleteBidAction`.

### `/dashboard/bids/[id]`

- Status: code verified; browser screenshot not captured because the verification user has no existing bid.
- Existing mutation components and API routes are preserved in the tabbed workspace shell.
- Final live verification should be run against a real or disposable bid before production release.

### `/dashboard/settings`

- Status: browser shell verified and code/action verified.
- Profile/settings tabs rendered in browser.
- Algorithm weights component enforces 100% total client-side and saves through `updateRecommendationWeightsAction`.
- Final live slider save should be performed manually with the desired account before release.

## Screenshot checklist

- `phase-c4-tenders.png` - captured.
- `phase-c4-ponude.png` - captured.
- `phase-c4-bids.png` - captured.
- `phase-c4-settings-algorithm.png` - captured, but shows the settings shell/profile tab.
- `phase-c4-bid-detail-overview.png` - not captured; no bid exists for the verification user.
- `phase-c4-bid-detail-tasks.png` - not captured; no bid exists for the verification user.

## Constraints honored

- No SQL migrations were added.
- No git push was performed.
- Existing document/checklist/comment API flows were preserved.
- Existing agency gating and Supabase SSR flow were preserved.
- Database enum statuses were not expanded without explicit migration approval.
