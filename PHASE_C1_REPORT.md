# PHASE C.1 REPORT

Generated on 2026-04-29.

## 1. Page Port Status

| Page | Vite source | Next.js target | Status | Adapter |
| --- | --- | --- | --- | --- |
| Trziste / analytics | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\analytics-page.tsx` | `app/(dashboard)/dashboard/trziste/page.tsx` | Ported | `lib/dashboard-trziste.ts` |
| Competition | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\competition-page.tsx` | `app/(dashboard)/dashboard/intelligence/competitors/page.tsx` | Ported | Inline mapping over existing `getCompetitorAnalysis`, `getCompetitors`, `getSimilarTenders`, `getUserBidStats` |
| Buyer detail | `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\buyers-page.tsx` (`BuyerDetailPage`) | `app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx` | Ported | Existing page data fetching preserved and reshaped in page |

## 2. Shared Components Used

- `StatCard`
- `CircularProgressScore`
- `DonutChart`
- `LineAreaChart`
- `AIInsightBox`
- `EmptyState`
- `StatusBadge`
- `WatchButton`

Additional client islands added:

- `components/dashboard/analytics-insights-cards.tsx` fetches `/api/analytics/insights`.
- `components/dashboard/authority-narrative-box.tsx` fetches `/api/analytics/authority/[jib]/narrative`.

## 3. Data Sources Used

- `lib/market-intelligence.ts` -> `getMarketOverview()`, `getCompetitorAnalysis()`
- `lib/user-bid-analytics.ts` -> `getUserBidStats()`
- `lib/tender-area-report.ts` -> `getTenderAreaGapReport()`
- `lib/competitor-intelligence.ts` -> `getCompetitors()`, `getSimilarTenders()`
- `lib/watchlist.ts` -> `isWatched()`
- Existing Supabase tables already queried in the app: `tenders`, `award_decisions`, `companies`, `contracting_authorities`, `authority_stats`, `company_authority_stats`, `authority_requirement_patterns`
- Existing API routes: `/api/analytics/insights`, `/api/analytics/authority/[jib]/narrative`

No mock data was added.

## 4. Missing Data / TODO Items

| Page | UI element | Current behavior | TODO |
| --- | --- | --- | --- |
| Trziste | Reports library | Renders empty state | Add table/storage index for generated PDF/CSV market reports. |
| Trziste | Interactive BiH map | Uses simplified SVG and real tender-area gap items when available | Add geocoded canton/entity aggregation or a real geo map library in a later phase. |
| Competition | Lost tenders table with gap % | Renders empty state | Link user `bids` records to `award_decisions` so gap vs winning price is real. |
| Competition | Top 3 competitor monthly line chart | Renders user bid trend or empty state | Add monthly aggregation by competitor JIB from `award_decisions`. |
| Competition | Win rate by tender size bucket | Renders explanatory AI insight | Add aggregation combining bid outcomes, estimated values, and award values. |
| Buyer detail | Typical timing analysis | Shows active deadlines or empty state | Add authority-level average days from publication to deadline. |
| Buyer detail | Peer benchmarking | Uses `company_authority_stats` when present | Backfill/refresh stats where missing. |

## 5. Navigation Update

`components/dashboard-sidebar.tsx` was minimally updated:

- `/dashboard/trziste` remains visible.
- `/dashboard/intelligence/competitors` is now visible under a new `Analize` section.
- Sidebar structure was not replaced wholesale.

## 6. Verification Results

TypeScript:

```text
& 'C:\Program Files\nodejs\npx.cmd' tsc --noEmit --pretty false
Result: pass, zero errors.
```

Build:

```text
& 'C:\Program Files\nodejs\npm.cmd' run build
Result: pass.
```

Lint:

```text
& 'C:\Program Files\nodejs\npm.cmd' run lint
Result: fails on existing repo lint debt.
```

Full lint remains blocked by pre-existing errors in tests, generated/minified files, React purity warnings in unrelated pages, and other existing lint debt. Focused lint on C.1 files passed with zero errors and one existing sidebar hook dependency warning:

```text
& 'C:\Program Files\nodejs\npx.cmd' eslint "app/(dashboard)/dashboard/trziste/page.tsx" "app/(dashboard)/dashboard/intelligence/competitors/page.tsx" "app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx" "components/dashboard/analytics-insights-cards.tsx" "components/dashboard/authority-narrative-box.tsx" "lib/dashboard-trziste.ts" "components/dashboard-sidebar.tsx"
Result: pass, zero errors, one warning in components/dashboard-sidebar.tsx.
```

Whitespace:

```text
git diff --check
Result: pass, only Windows CRLF conversion warnings.
```

## 7. Visual QA / Screenshots

Screenshot capture was attempted with the user-approved client login `test1@tendersistem.com`. The in-app browser plugin could not be used because the local Node runtime is `v22.12.0` and the plugin requires `>= v22.22.0`.

Fallback headless Chrome automation reached the login step, but the local dev server on port `3000` stopped responding to `/login` and had to be stopped. Restarting `next dev` requires sandbox escalation and the automatic approval reviewer rejected the escalation because the current usage limit was reached.

Screenshots not yet produced:

- `phase-c1-trziste.png`
- `phase-c1-competitors.png`
- `phase-c1-buyer-detail.png`

Pending action: restart the local dev server with `npm run dev -- -p 3000`, then rerun screenshot capture.

## 8. Files Modified

- `app/(dashboard)/dashboard/trziste/page.tsx`
- `app/(dashboard)/dashboard/intelligence/competitors/page.tsx`
- `app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx`
- `components/dashboard-sidebar.tsx`
- `components/dashboard/analytics-insights-cards.tsx`
- `components/dashboard/authority-narrative-box.tsx`
- `lib/dashboard-trziste.ts`
- `PHASE_C1_REPORT.md`

## 9. Notes Before Phase C.2

- The three C.1 page routes compile and are included in the successful Next build.
- Several visual sections intentionally render empty states where real production aggregations do not yet exist.
- The agency account requested by the user was not created in this phase. Creating a persistent auth account requires an explicit action-time confirmation immediately before creation.

## C.1 Hotfix — RSC icon serialization

Files modified:

- `components/ui/stat-card.tsx`
- `components/ui/empty-state.tsx`
- `app/(dashboard)/dashboard/trziste/page.tsx`
- `app/(dashboard)/dashboard/intelligence/competitors/page.tsx`
- `app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx`

Call sites updated:

| Page | Count |
| --- | ---: |
| `app/(dashboard)/dashboard/trziste/page.tsx` | 13 |
| `app/(dashboard)/dashboard/intelligence/competitors/page.tsx` | 11 |
| `app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx` | 14 |

Verification:

```text
& 'C:\Program Files\nodejs\npx.cmd' tsc --noEmit --pretty false
Result: pass, zero errors.
```

```text
& 'C:\Program Files\nodejs\npm.cmd' run build
Result: pass.
```

```text
Select-String -Path "app\(dashboard)\dashboard\trziste\page.tsx","app\(dashboard)\dashboard\intelligence\competitors\page.tsx","app\(dashboard)\dashboard\intelligence\authority\[jib]\page.tsx" -Pattern "icon=\{[A-Z][A-Za-z]+\}"
Result: zero matches.
```

## C.1 Hotfix #2 — DonutChart formatValue RSC fix

Files modified:

- `components/ui/donut-chart.tsx`
- `app/(dashboard)/dashboard/trziste/page.tsx`
- `app/(dashboard)/dashboard/intelligence/competitors/page.tsx`
- `app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx`
- `PHASE_C1_REPORT.md`

Per-file replacements:

| File | `formatValue` -> `valueSuffix` |
| --- | ---: |
| `app/(dashboard)/dashboard/trziste/page.tsx` | 2 |
| `app/(dashboard)/dashboard/intelligence/competitors/page.tsx` | 1 |
| `app/(dashboard)/dashboard/intelligence/authority/[jib]/page.tsx` | 1 |
| `app/(dashboard)/dashboard/_dev/ui-kit/ui-kit-demo-client.tsx` | 0 |

Callback prop audit:

```text
Pattern: \w+=\{(\([^)]*\)|\w+)\s*=>
Scope: three C.1 server pages only
Result: no other callback props found.
```

Verification:

```text
& 'C:\Program Files\nodejs\npx.cmd' tsc --noEmit --pretty false
Result: pass, zero errors.
```

```text
& 'C:\Program Files\nodejs\npm.cmd' run build
Result: pass.
```

```text
Select-String -Path "app\(dashboard)\dashboard\trziste\page.tsx","app\(dashboard)\dashboard\intelligence\competitors\page.tsx","app\(dashboard)\dashboard\intelligence\authority\[jib]\page.tsx" -Pattern "formatValue="
Result: zero matches.
```
