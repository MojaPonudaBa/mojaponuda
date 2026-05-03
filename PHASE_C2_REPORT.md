# PHASE C.2 REPORT

Generated on 2026-04-29.

## 1. Summary

Phase C.2 added four new dashboard routes and one new detail route:

- `/dashboard/cpv`
- `/dashboard/pracenje`
- `/dashboard/alerti`
- `/dashboard/intelligence/upcoming`
- `/dashboard/intelligence/upcoming/[id]`

All pages use real Supabase-backed data through the new adapter module `lib/dashboard-c2.ts`. No mock data was added. The pages render empty states or documented TODOs where the live schema does not yet expose the requested source data.

## 2. Page Port Status

| Page | Source | Target | Status | Adapter |
| --- | --- | --- | --- | --- |
| CPV Market Opportunity Explorer | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\cpv-page.tsx` | `app/(dashboard)/dashboard/cpv/page.tsx` | Created | `getCpvDashboardData()` |
| Tracking | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\tracking-page.tsx` | `app/(dashboard)/dashboard/pracenje/page.tsx` | Created | `getTrackingDashboardData()` |
| Alerts | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\alerts-page.tsx` | `app/(dashboard)/dashboard/alerti/page.tsx` | Created | `getAlertsDashboardData()` |
| Rano upozorenje list | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\early-warning-page.tsx` | `app/(dashboard)/dashboard/intelligence/upcoming/page.tsx` | Replaced placeholder | `getUpcomingDashboardData()` |
| Rano upozorenje detail | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\early-warning-page.tsx` | `app/(dashboard)/dashboard/intelligence/upcoming/[id]/page.tsx` | Created | `getUpcomingDetailData()` |

## 3. Navigation Update

Updated `components/dashboard-sidebar.tsx` in place:

- Added `/dashboard/pracenje` under Glavno with an active tracking count badge.
- Added `/dashboard/cpv` under Analize.
- Added `/dashboard/intelligence/upcoming` under Analize.
- Added `/dashboard/alerti` under Obavijesti with an enabled-alert count badge.
- Kept the existing sidebar structure and memoized the section list to avoid a hook dependency warning.

## 4. Data Sources Used

CPV:

- `cpv_stats`
- `company_cpv_stats`
- `company_stats`
- `tenders`
- `watchlist_items`
- `cpv_opportunity_ai_cache`

Tracking:

- `companies`
- `bids`
- `tenders`
- `bid_checklist_items`
- `bid_documents`
- `getTenderDecisionInsights()`

Alerts:

- `saved_alerts`
- `alert_parse_cache`
- `notifications`
- `notification_preferences`
- Existing `/api/alerts/parse` endpoint via `components/dashboard/alert-creator-client.tsx`

Rano upozorenje:

- `planned_procurements`
- `contracting_authorities`
- `award_decisions`

## 5. Missing Data / TODOs

- `cpv_codes` table is not present in the regenerated public schema. CPV labels use a static prefix label map plus the real CPV codes from `cpv_stats`.
- `user_tracked_planned_procurements` is not present in the regenerated public schema. The upcoming list/detail pages render the "Prati" control disabled and do not write tracking rows.
- CPV growth and CPV time-series charts cannot be derived from the current `cpv_stats` aggregate table. The page renders an empty state with TODO comments until a historical CPV stats source exists.
- CPV AI recommendation is read from `cpv_opportunity_ai_cache` when present. If no cached recommendation exists, the page shows a heuristic derived from real CPV statistics rather than calling `/api/cpv/[code]/opportunity` during server render, because that API route writes cache rows.

## 6. Conflict Resolution

`app/(dashboard)/dashboard/intelligence/layout.tsx` still redirected every `/dashboard/intelligence/*` child route back to `/dashboard`. This prevented `/dashboard/intelligence/upcoming` from rendering after the page was created.

Resolution:

- Replaced the redirecting layout with a pass-through layout that renders `children`.
- This was necessary for the requested C.2 route and also restores reachability for the C.1 intelligence child routes.

## 7. Verification

TypeScript:

- `npx tsc --noEmit --pretty false`
- Result: pass, zero errors.

Build:

- `npm run build`
- Result: pass.
- Route manifest includes:
  - `/dashboard/cpv`
  - `/dashboard/pracenje`
  - `/dashboard/alerti`
  - `/dashboard/intelligence/upcoming`
  - `/dashboard/intelligence/upcoming/[id]`

Lint:

- `npm run lint`
- Result: fails on existing repo-wide lint debt.
- Focused lint on all C.2 files passes with zero errors and zero warnings:
  - `app/(dashboard)/dashboard/cpv/page.tsx`
  - `app/(dashboard)/dashboard/pracenje/page.tsx`
  - `app/(dashboard)/dashboard/alerti/page.tsx`
  - `app/(dashboard)/dashboard/intelligence/upcoming/page.tsx`
  - `app/(dashboard)/dashboard/intelligence/upcoming/[id]/page.tsx`
  - `app/(dashboard)/dashboard/intelligence/layout.tsx`
  - `lib/dashboard-c2.ts`
  - `components/dashboard/alert-creator-client.tsx`
  - `components/dashboard-sidebar.tsx`

## 8. Screenshots

Captured locally using the provided `test1@tendersistem.com` account:

- `phase-c2-cpv.png`
- `phase-c2-pracenje.png`
- `phase-c2-alerti.png`
- `phase-c2-upcoming.png`

## 9. Files Added / Modified In C.2

Added:

- `PHASE_C2_REPORT.md`
- `app/(dashboard)/dashboard/cpv/page.tsx`
- `app/(dashboard)/dashboard/pracenje/page.tsx`
- `app/(dashboard)/dashboard/alerti/page.tsx`
- `app/(dashboard)/dashboard/intelligence/upcoming/[id]/page.tsx`
- `components/dashboard/alert-creator-client.tsx`
- `lib/dashboard-c2.ts`
- `phase-c2-cpv.png`
- `phase-c2-pracenje.png`
- `phase-c2-alerti.png`
- `phase-c2-upcoming.png`

Modified:

- `app/(dashboard)/dashboard/intelligence/upcoming/page.tsx`
- `app/(dashboard)/dashboard/intelligence/layout.tsx`
- `components/dashboard-sidebar.tsx`

## 10. Issues For Phase C.3+

- Decide whether to add a real `cpv_codes` taxonomy table, or keep prefix labels as UI-only taxonomy.
- Decide whether to add `user_tracked_planned_procurements` for per-plan tracking.
- Add CPV historical/time-series aggregation if growth charts are required.
- Consider adding a server action for saved alerts if the natural-language alert creator should persist alerts directly after parsing.
