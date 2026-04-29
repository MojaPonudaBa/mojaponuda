# PORT PHASE A - INVENTORY AND MAPPING

Generated on 2026-04-29.

Reference app: `C:\Users\marin\Desktop\MojaPonuda`  
Primary runtime app: `C:\Users\marin\Desktop\MojaPonuda\mojaponuda`

## 1. Executive summary

The Vite redesign is a complete authenticated-product shell with React Router pages, a collapsible sidebar, top bar, keyboard shortcuts, mobile bottom nav, shared UI primitives, local mock query hooks, and localStorage persistence bridges. It covers the dashboard, tender discovery, recommendations, execution workflow, documents, early warning, buyers, competitors, clients, CPV, analytics, alerts, settings, onboarding, and AI assistant panel. The redesign currently treats Supabase as the eventual production data source but uses mock data and local persistence in the Vite shell.

The Next.js production app is the correct runtime target and already has much of the real product surface: authenticated `/dashboard` routes, Supabase SSR auth, company/profile/subscription checks, agency client context, tender recommendation pipelines, bid workflows, document vault, market intelligence, watchlist/signals, and the five AI/API routes expected by the redesign. The port should not be a direct file copy. It should adapt the Vite components into the existing Next.js route and data model, preserving server-rendered auth boundaries and production mutations.

The pending migrations are mostly additive and introduce the tables needed for planned procurements, AI narratives, AI caches, saved alerts, user settings, assistant conversations, onboarding, feedback, and analytics events. The notable production-safety flag is `20260428_decision_sample_counts.sql`, which alters existing stats tables. Other migrations include `drop policy if exists`, `drop trigger if exists`, `alter table ... enable row level security`, and `alter type ... add value`; none contains `drop table`, `truncate`, or broad data deletion. Because there is no staging environment, Phase B should start with a database backup, SQL review, type regeneration, and a narrow first port.

## 2. Vite app inventory

### FINAL_AUDIT.md findings

`FINAL_AUDIT.md` confirms the completed redesign scope: foundation shell, tender screens, execution tier, documentation and early-warning tier, intelligence tier, standalone analysis tier, dashboard, decision queue, AI assistant, onboarding checklist, mobile nav, formatting utilities, AI feedback fallback, and analytics fallback.

The audit says these migrations were added during the redesign and should be applied in timestamp order after review:

- `mojaponuda/supabase/migrations/20260429_phase5_planned_procurements.sql`
- `mojaponuda/supabase/migrations/20260429_phase6_buyer_ai_narratives.sql`
- `mojaponuda/supabase/migrations/20260429_phase7_ai_alerts_settings.sql`
- `mojaponuda/supabase/migrations/20260429_phase8_dashboard_assistant_onboarding.sql`

The audit also says these production API foundations were added under `mojaponuda/app/api`: `/api/alerts/parse`, `/api/analytics/insights`, `/api/cpv/[code]/opportunity`, and `/api/assistant/chat`. The actual production repo also contains `/api/analytics/authority/[jib]/narrative`.

### Page files under `src\components\pages`

```text
src\components\pages\alerts-page.tsx
src\components\pages\analytics-page.tsx
src\components\pages\bids-page.tsx
src\components\pages\buyers-page.tsx
src\components\pages\clients-page.tsx
src\components\pages\competition-page.tsx
src\components\pages\components-demo-page.tsx
src\components\pages\cpv-page.tsx
src\components\pages\dashboard-page.tsx
src\components\pages\documentation-page.tsx
src\components\pages\early-warning-page.tsx
src\components\pages\execution-screen-parts.tsx
src\components\pages\pipeline-page.tsx
src\components\pages\placeholder-page.tsx
src\components\pages\recommended-tenders-page.tsx
src\components\pages\settings-page.tsx
src\components\pages\tender-screen-parts.tsx
src\components\pages\tenders-page.tsx
src\components\pages\tracking-page.tsx
```

### Shared UI components under `src\components\ui`

```text
src\components\ui\ai-insight-box.tsx
src\components\ui\avatar.tsx
src\components\ui\badge.tsx
src\components\ui\button.tsx
src\components\ui\circular-progress-score.tsx
src\components\ui\deadline-countdown.tsx
src\components\ui\dialog.tsx
src\components\ui\donut-chart.tsx
src\components\ui\dropdown-menu.tsx
src\components\ui\empty-state.tsx
src\components\ui\index.ts
src\components\ui\input.tsx
src\components\ui\line-area-chart.tsx
src\components\ui\priority-pill.tsx
src\components\ui\separator.tsx
src\components\ui\skeleton.tsx
src\components\ui\stat-card.tsx
src\components\ui\status-badge.tsx
src\components\ui\tabs.tsx
src\components\ui\tooltip.tsx
```

### Layout components under `src\components\layout`

```text
src\components\layout\ai-assistant-panel.tsx
src\components\layout\app-shell.tsx
src\components\layout\keyboard-shortcuts-modal.tsx
src\components\layout\sidebar.tsx
src\components\layout\top-bar.tsx
```

### Utilities, hooks, and store

```text
src\lib\execution-utils.ts
src\lib\mockData.ts
src\lib\phase5-utils.ts
src\lib\phase6-utils.ts
src\lib\phase7-utils.ts
src\lib\phase8-utils.ts
src\lib\routes.ts
src\lib\tender-screen-utils.ts
src\lib\utils.ts
src\hooks\useChartWidth.ts
src\hooks\useExecutionPersistence.ts
src\hooks\useMockData.ts
src\hooks\usePhase5Persistence.ts
src\hooks\usePhase6Persistence.ts
src\hooks\usePhase7Persistence.ts
src\hooks\usePhase8Persistence.ts
src\hooks\useSidebarCounts.ts
src\hooks\useTenderPersistence.ts
src\store\useAppStore.ts
```

Core mock hooks:

- `useTenders()` returns `mockData.tenders`.
- `useBuyers()` returns `mockData.buyers`.
- `useClients()` returns `mockData.clients`.
- `useHistoricalTenderEvents()` returns `mockData.historicalTenderEvents`.

Local persistence hooks:

- `useTenderPersistence()` stores bookmarked tenders, saved searches, and ignored tenders in localStorage.
- `useExecutionPersistence()` stores pipeline stages, movements, outcomes, bid statuses, bid submissions, and bid tasks in localStorage.
- `usePhase5Persistence()` stores tracked planned procurements, recent documents, and template actions in localStorage.
- `usePhase6Persistence()` stores followed buyers and competitors in localStorage.
- `usePhase7Persistence()` stores tracked CPV codes, saved alerts, settings profile, and algorithm weights in localStorage.
- `usePhase8Persistence()` stores onboarding state, skipped decisions, AI feedback, assistant messages, and user analytics in localStorage.
- `useAppStore()` is a Zustand shell store for account type, sidebar collapse, AI panel, shortcuts, and transient shortcut messages.

### Vite routes

`src\App.tsx` routes Vite pages under `AppShell`:

- `/` -> `DashboardPage`
- `/tenderi` -> `TendersPage`
- `/preporuceni` -> `RecommendedTendersPage`
- `/rano-upozorenje` -> `EarlyWarningPage`
- `/rano-upozorenje/:id` -> `EarlyWarningDetailPage`
- `/narucioci` -> `BuyersPage`
- `/narucioci/:id` -> `BuyerDetailPage`
- `/konkurencija` -> `CompetitionPage`
- `/cpv` -> `CpvPage`
- `/klijenti` -> `ClientsPage`
- `/klijenti/:id` -> `ClientDetailPage`
- `/analize` -> `AnalyticsPage`
- `/pracenje` -> `TrackingPage`
- `/pipeline` -> `PipelinePage`
- `/ponude` -> `BidsPage`
- `/ponude/:bidId` -> `BidDetailPage`
- `/dokumentacija` -> `DocumentationPage`
- `/dokumentacija/sabloni` -> `DocumentTemplatesPage`
- `/alerti` -> `AlertsPage`
- `/postavke` -> `SettingsPage`
- `/ui-kit` -> `ComponentsDemoPage`
- `/moje-liste` -> `PlaceholderPage`

### Vite design tokens

`src\globals.css` uses Tailwind v4 `@theme`, Google-hosted Inter, and semantic CSS variables:

- Background/surfaces: `--background #ffffff`, `--surface-1 #ffffff`, `--surface-2 #f8fafc`, `--surface-subtle #eff6ff`.
- Brand: `--primary #2563eb`, `--primary-hover #1d4ed8`, `--primary-soft #dbeafe`, `--primary-strong #1e40af`.
- AI accent: `--accent-ai #7c3aed`, `--accent-ai-soft #ede9fe`, `--accent-ai-strong #6d28d9`.
- Status colors: success `#10b981`, warning `#f59e0b`, danger `#ef4444`, info `#06b6d4`, each with soft/strong variants.
- Text: `--text-primary #0f172a`, `--text-secondary #475569`, `--text-tertiary #94a3b8`.
- Border: `--border-default #e2e8f0`, `--border-hover #cbd5e1`.
- Charts: `chart-1 #2563eb`, `chart-2 #10b981`, `chart-3 #f59e0b`, `chart-4 #7c3aed`, `chart-5 #06b6d4`, `chart-6 #ec4899`.
- Typography: Inter with h1/h2/h3/body/small/micro/stat token sizes.
- Radius/shadow: `--radius-card 12px`, `--radius-input 8px`, `--radius-modal 16px`, `--shadow-card`, `--shadow-card-hover`, `--shadow-modal`.

`tailwind.config.ts` is minimal:

```ts
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
};
```

## 3. Next.js app inventory

### Runtime stack

`package.json` confirms the primary app is Next `16.1.6`, React `19.2.3`, TypeScript, Tailwind v4, shadcn v4, Supabase SSR, Supabase JS, OpenAI, Recharts, Radix, Lucide, Framer Motion, PDF/document tooling, and Vitest.

### All app routes

```text
app\(auth)\layout.tsx
app\(auth)\login\page.tsx
app\(auth)\reset-password\page.tsx
app\(auth)\signup\page.tsx
app\(dashboard)\layout.tsx
app\(dashboard)\dashboard\admin\agencies\page.tsx
app\(dashboard)\dashboard\admin\crm\page.tsx
app\(dashboard)\dashboard\admin\financials\page.tsx
app\(dashboard)\dashboard\admin\leads\page.tsx
app\(dashboard)\dashboard\admin\page.tsx
app\(dashboard)\dashboard\admin\posts\page.tsx
app\(dashboard)\dashboard\admin\prilike\page.tsx
app\(dashboard)\dashboard\admin\scrapers\page.tsx
app\(dashboard)\dashboard\admin\system\page.tsx
app\(dashboard)\dashboard\admin\zakon\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\bids\[bidId]\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\bids\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\documents\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\home\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\intelligence\layout.tsx
app\(dashboard)\dashboard\agency\clients\[id]\intelligence\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\intelligence\upcoming\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\prilike\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\tenders\[tenderId]\page.tsx
app\(dashboard)\dashboard\agency\clients\[id]\tenders\page.tsx
app\(dashboard)\dashboard\agency\page.tsx
app\(dashboard)\dashboard\bids\[id]\page.tsx
app\(dashboard)\dashboard\bids\page.tsx
app\(dashboard)\dashboard\intelligence\authority\[jib]\page.tsx
app\(dashboard)\dashboard\intelligence\company\[jib]\page.tsx
app\(dashboard)\dashboard\intelligence\competitors\page.tsx
app\(dashboard)\dashboard\intelligence\layout.tsx
app\(dashboard)\dashboard\intelligence\page.tsx
app\(dashboard)\dashboard\intelligence\upcoming\page.tsx
app\(dashboard)\dashboard\page.tsx
app\(dashboard)\dashboard\ponude\page.tsx
app\(dashboard)\dashboard\prilike\page.tsx
app\(dashboard)\dashboard\settings\page.tsx
app\(dashboard)\dashboard\subscription\page.tsx
app\(dashboard)\dashboard\subscription\subscription-client-page.tsx
app\(dashboard)\dashboard\tenderi-novi\page.tsx
app\(dashboard)\dashboard\tenders\[id]\page.tsx
app\(dashboard)\dashboard\tenders\geo-report\page.tsx
app\(dashboard)\dashboard\tenders\page.tsx
app\(dashboard)\dashboard\trziste\page.tsx
app\(dashboard)\dashboard\vault\page.tsx
app\(dashboard)\dashboard\watchlist\page.tsx
app\(legal)\privacy\page.tsx
app\(legal)\terms\page.tsx
app\(public)\layout.tsx
app\(public)\prilike\[slug]\page.tsx
app\(public)\prilike\kategorija\[slug]\page.tsx
app\(public)\prilike\page.tsx
app\(public)\zakon\page.tsx
app\auth\callback\route.ts
app\auth\confirm\page.tsx
app\layout.tsx
app\onboarding\page.tsx
app\page.tsx
```

### API routes

```text
app\api\admin\agencies\[userId]\route.ts
app\api\admin\agencies\route.ts
app\api\admin\legal-updates\[id]\route.ts
app\api\admin\legal-updates\route.ts
app\api\admin\opportunities\[id]\route.ts
app\api\admin\opportunities\route.ts
app\api\admin\portal-leads\[jib]\route.ts
app\api\admin\purge-posts\route.ts
app\api\admin\recategorize\route.ts
app\api\admin\regen-content\route.ts
app\api\admin\scraper-logs\route.ts
app\api\admin\scrape-source\route.ts
app\api\admin\system\run-job\route.ts
app\api\admin\system\run-maintenance\route.ts
app\api\admin\system\run-post-sync\route.ts
app\api\admin\system\run-sync\route.ts
app\api\admin\trigger-sync\route.ts
app\api\agency\clients\[id]\route.ts
app\api\agency\clients\route.ts
app\api\agency\notes\route.ts
app\api\alerts\parse\route.ts
app\api\analytics\authority\[jib]\narrative\route.ts
app\api\analytics\authority\[jib]\route.ts
app\api\analytics\company\[jib]\route.ts
app\api\analytics\competitors\route.ts
app\api\analytics\insights\route.ts
app\api\analytics\market\route.ts
app\api\analytics\track\route.ts
app\api\assistant\chat\route.ts
app\api\bids\[id]\checklist\[itemId]\route.ts
app\api\bids\[id]\checklist\route.ts
app\api\bids\[id]\documents\[docId]\route.ts
app\api\bids\[id]\documents\route.ts
app\api\bids\[id]\route.ts
app\api\bids\[id]\tender-documentation\file\route.ts
app\api\bids\[id]\tender-documentation-text\route.ts
app\api\bids\[id]\tender-documentation\route.ts
app\api\bids\[id]\tender-source\[sourceId]\preview\route.ts
app\api\bids\analyze\route.ts
app\api\bids\export\route.ts
app\api\bids\package\route.ts
app\api\bids\route.ts
app\api\cpv\[code]\opportunity\route.ts
app\api\cron\morning-sync\route.ts
app\api\cron\notifications\route.ts
app\api\cron\post-sync\route.ts
app\api\cron\sync\route.ts
app\api\documents\[id]\preview\route.ts
app\api\documents\[id]\route.ts
app\api\documents\signed-url\[id]\route.ts
app\api\documents\upload\route.ts
app\api\lemonsqueezy\create-checkout\route.ts
app\api\lemonsqueezy\customer-portal\route.ts
app\api\onboarding\generate-profile\route.ts
app\api\onboarding\preview-tenders\route.ts
app\api\onboarding\save-embedding\route.ts
app\api\opportunities\[id]\checklist\route.ts
app\api\opportunities\[id]\follow\route.ts
app\api\reports\tender-area-gaps\route.ts
app\api\user\delete\route.ts
app\api\webhooks\lemonsqueezy\route.ts
```

### Server actions

```text
app\actions\analyze-tender.ts: analyzeTenderAction
app\actions\bids.ts: updateBidStatusAction, updateBidFieldsAction, addBidCommentAction, deleteBidCommentAction
app\actions\demo-analyze.ts: demoAnalyzeTender
app\actions\ejn-credentials.ts: saveEjnCredentialsAction, removeEjnCredentialsAction
app\actions\notification-preferences.ts: updateNotificationPreferenceAction
app\actions\watchlist.ts: watchEntityAction, unwatchEntityAction
```

### Supabase-touching library/query exports

```text
lib\admin.ts: getAdminEmails, isAdminEmail, requireAdminUser
lib\admin-operator.ts: findUserByEmail, loadAdminOverviewData, loadAdminFinancialsData, loadAdminSystemData, loadAdminAgenciesData
lib\admin-portal-leads.ts: loadAdminPortalLeadsData
lib\ai\tender-analysis.ts: analyzeTender
lib\ai-profile-enrichment.ts: generateProfileEnrichment, ensureCompanyProfileEnrichment
lib\analytics.ts: trackEvent
lib\bids\access.ts: resolveManagedCompanyAccess, resolveBidAccess
lib\bids\checklist.ts: ensureBidChecklist
lib\competitor-intelligence.ts: getCompetitors, getSimilarTenders
lib\ejn-api.ts: fetchProcurementNotices, fetchProcurementNoticesInDateRange, enrichNoticesWithCpvCodes, fetchAwardNotices, fetchAwardNoticesByIds, fetchAwardedSupplierGroups, fetchSupplierGroupSupplierLinks, fetchContractingAuthorities, fetchSuppliers, fetchSuppliersByIds, fetchPlannedProcurements
lib\ejn-credentials.ts: saveEjnCredentials, getEjnCredentials, hasEjnCredentials, fetchTenderDocumentation
lib\lemonsqueezy.ts: createCheckout, getCustomerPortalUrl, verifyWebhookSignature
lib\market-intelligence.ts: getCompetitorAnalysis, getMarketOverview
lib\notifications\scheduler.ts: runNotificationScheduler
lib\notifications\send.ts: sendNotification, plural
lib\opportunity-filters.ts: advancedFilter
lib\opportunity-recommendations.ts: buildOpportunityRecommendationContext, hasOpportunityRecommendationSignals, getOpportunityLocationScope, scoreOpportunityRecommendation, selectOpportunityRecommendations, fetchPublishedGrantCandidates, getPersonalizedOpportunityRecommendations
lib\personalized-tenders.ts: getPersonalizedTenderRecommendations
lib\preparation-credits.ts: getPreparationBillingCycle, getPreparationUsageSummary, claimPreparationAccess
lib\price-prediction.ts: getPricePrediction
lib\related-opportunities-service.ts: relatedOpportunitiesService
lib\subscription.ts: isAgencyPlan, getSubscriptionStatus
lib\supabase\admin.ts: createAdminClient
lib\supabase\client.ts: createClient
lib\supabase\server.ts: createClient
lib\tender-area-report.ts: getTenderAreaGapReport
lib\tender-decision.ts: computeTenderDecisionInsights, getTenderDecisionInsights, upsertTenderDecisionInsights, buildPreparationPlan
lib\tender-doc\annex-scanner.ts: scanForAnnexes, mergeAnnexesIntoChecklist
lib\tender-doc\extract.ts: extractTextFromPDF, extractTextFromDOCX, extractText
lib\tender-recommendations.ts: matchesCpvPrefixes, matchesPreferredContractTypes, matchesTenderLocationTerms, getTenderLocationScope, selectTenderRecommendations, buildRecommendationContext, buildRecommendationSearchCondition, hasRecommendationSignals, fetchRecommendedTenderCandidates, enrichTendersWithAuthorityGeo, scoreTenderRecommendation, rankTenderRecommendations
lib\tender-relevance.ts: classifyTier, retrieveEmbeddingCandidates, retrieveKeywordCandidates, getRecommendedTenders, embedNewTenders, cleanupOrphanedRelevance
lib\user-bid-analytics.ts: getUserBidStats
lib\watchlist.ts: getWatchlist, isWatched, addToWatchlist, removeFromWatchlist, findWatchersByEntity
lib\win-probability.ts: getWinProbability
```

### Current components under `components`

```text
components\admin\admin-agencies-shell.tsx
components\admin\admin-dashboard-overview.tsx
components\admin\admin-financials-shell.tsx
components\admin\admin-leads-minimal-shell.tsx
components\admin\admin-legal-manager.tsx
components\admin\admin-overview-shell.tsx
components\admin\admin-posts-manager.tsx
components\admin\admin-system-shell.tsx
components\admin\content-quality-dashboard.tsx
components\admin\run-post-sync-button.tsx
components\admin\scraper-sources-list.tsx
components\agency\add-client-modal.tsx
components\agency\agency-client-detail.tsx
components\agency\agency-client-tenders-toggle.tsx
components\agency\agency-crm-dashboard.tsx
components\bids\bid-comments.tsx
components\bids\bid-quick-actions.tsx
components\bids\bids-table.tsx
components\bids\kanban-board.tsx
components\bids\new-bid-modal.tsx
components\bids\preparation-plan-card.tsx
components\bids\workspace\bid-workspace-client.tsx
components\bids\workspace\checklist-panel.tsx
components\bids\workspace\documents-panel.tsx
components\bids\workspace\notes-section.tsx
components\bids\workspace\tender-doc-full-viewer.tsx
components\bids\workspace\tender-doc-upload.tsx
components\bids\workspace\tender-doc-viewer.tsx
components\bids\workspace\top-bar.tsx
components\brand\tender-sistem-logo.tsx
components\dashboard\home-overview.tsx
components\dashboard\legal-update-card.tsx
components\dashboard\opportunity-actions-wrapper.tsx
components\dashboard\opportunity-actions.tsx
components\dashboard\opportunity-dashboard-card.tsx
components\dashboard\recommended-tenders.tsx
components\dashboard\tracked-opportunity-card.tsx
components\dashboard\user-stats-card.tsx
components\dashboard-sidebar.tsx
components\intelligence\category-chart.tsx
components\intelligence\competitor-signal-chart.tsx
components\intelligence\competitors-card.tsx
components\intelligence\monthly-awards-chart.tsx
components\intelligence\price-prediction-card.tsx
components\intelligence\procedure-pie-chart.tsx
components\intelligence\win-probability-card.tsx
components\landing\demo-widget.tsx
components\landing\landing-page.tsx
components\onboarding-form.tsx
components\onboarding-guided-form.tsx
components\onboarding-value-first-form.tsx
components\opportunities\decision-support-card.tsx
components\opportunities\enhanced-cta.tsx
components\opportunities\issuer-history-card.tsx
components\opportunities\related-opportunities-card.tsx
components\opportunities\urgency-banner.tsx
components\public\article-content.tsx
components\public\opportunity-card.tsx
components\public\opportunity-structured-data.tsx
components\public\public-cta.tsx
components\settings\danger-zone.tsx
components\settings\ejn-credentials-form.tsx
components\settings\notification-pref-toggle.tsx
components\settings\notification-settings.tsx
components\settings\profile-settings.tsx
components\settings\team-settings.tsx
components\subscription\paywall-modal.tsx
components\subscription\paywall-overlay.tsx
components\subscription\pricing-table.tsx
components\subscription\pro-gate.tsx
components\subscription\subscription-card.tsx
components\subscription\upgrade-button.tsx
components\tenders\pagination.tsx
components\tenders\start-bid-button.tsx
components\tenders\tender-card.tsx
components\tenders\tender-decision-metrics.tsx
components\tenders\tender-decision-summary.tsx
components\tenders\tender-filters.tsx
components\tenders\tender-timeline.tsx
components\trziste\market-charts.tsx
components\ui\avatar.tsx
components\ui\badge.tsx
components\ui\button.tsx
components\ui\card.tsx
components\ui\command.tsx
components\ui\dialog.tsx
components\ui\dropdown-menu.tsx
components\ui\input-group.tsx
components\ui\input.tsx
components\ui\label.tsx
components\ui\popover.tsx
components\ui\region-multi-select.tsx
components\ui\select.tsx
components\ui\separator.tsx
components\ui\sheet.tsx
components\ui\tabs.tsx
components\ui\textarea.tsx
components\ui\toast.tsx
components\ui\toaster.tsx
components\ui\tooltip.tsx
components\ui\use-toast.ts
components\vault\add-document-modal.tsx
components\vault\agency-document-folders.tsx
components\vault\document-card.tsx
components\vault\document-grid.tsx
components\watchlist\watch-button.tsx
```

### Current design tokens and shadcn setup

There is no `tailwind.config.ts` or `tailwind.config.js` in the primary repo; Tailwind v4 is configured through `app\globals.css`.

`app\globals.css` imports:

- `tailwindcss`
- `tw-animate-css`
- `shadcn/tailwind.css`

Current Next tokens use shadcn-compatible variables:

- Background: `--background #f7f9fc`, foreground `#0f172a`.
- Card/popover: white.
- Primary: `--primary #0b6ff6`, foreground white.
- Secondary: `#e8f1ff`, muted `#eef4fb`, accent `#f8fafc`.
- Border/input: `#dbe4f0`, ring `#0b6ff6`.
- Charts: `#0b6ff6`, `#10b981`, `#f97316`, `#f59e0b`, `#06b6d4`.
- Radius: `--radius 0.5rem`.
- Sidebar tokens: white sidebar, slate text, blue active states.

`app\layout.tsx` uses `next/font/google` for IBM Plex Sans, IBM Plex Serif, and IBM Plex Mono, assigning `--font-sans`, `--font-heading`, and `--font-mono`.

`components.json`:

- shadcn style: `radix-nova`
- RSC enabled: `true`
- TSX enabled: `true`
- CSS: `app/globals.css`
- baseColor: `neutral`
- CSS variables: `true`
- icon library: `lucide`
- aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`

### Auth pattern

The production app uses Supabase SSR clients:

- `lib\supabase\server.ts` exports typed `createClient()` using `createServerClient<Database>()` and Next cookies.
- `lib\supabase\client.ts` exports typed browser `createClient()` using `createBrowserClient<Database>()`.
- `lib\supabase\admin.ts` exports `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`.
- Duplicate untyped helpers exist under `utils\supabase\server.ts`, `utils\supabase\client.ts`, and `utils\supabase\session.ts`.

There is no `middleware.ts` or `proxy.ts` currently present. `utils\supabase\session.ts` defines `updateSession(request)` with redirect logic, but it is not wired into an actual middleware file in this repo. Auth protection is currently enforced by route layouts/pages and API handlers:

- `app\(dashboard)\layout.tsx` calls `supabase.auth.getUser()` and redirects unauthenticated users to `/login`.
- `app\(auth)\layout.tsx` redirects authenticated users to `/dashboard`.
- Most protected pages and API routes call `auth.getUser()` again locally.
- `/auth/callback` exchanges the Supabase auth code and redirects based on profile/subscription state.
- `app\page.tsx` is public landing; it checks auth only to pass `isLoggedIn` to `LandingPage`.

### User/company/agency context propagation

There is no global React context for company/agency state. Context is reloaded per server route:

- User: `supabase.auth.getUser()` in layouts/pages/actions/API routes.
- Company: most single-company pages query `companies` with `.eq("user_id", user.id)`.
- Subscription and account type: `getSubscriptionStatus(user.id, user.email, supabase)` and `isAgencyPlan(plan)`.
- Agency mode: `app\(dashboard)\layout.tsx` checks `plan.id === "agency"`, then loads `agency_clients` for the sidebar.
- Agency client context: client-scoped routes use `/dashboard/agency/clients/[id]`, query `agency_clients.id`, and constrain with `agency_user_id = user.id`; they then use the linked `company_id`.
- Sidebar: `DashboardSidebar` receives `userEmail`, `companyName`, `isAdmin`, `isAgency`, and `agencyClients` from the server layout and uses pathname parsing to switch client-specific nav.

## 4. Pending migrations review

Files reviewed:

```text
supabase\migrations\20260428_decision_sample_counts.sql
supabase\migrations\20260429_phase5_planned_procurements.sql
supabase\migrations\20260429_phase6_buyer_ai_narratives.sql
supabase\migrations\20260429_phase7_ai_alerts_settings.sql
supabase\migrations\20260429_phase8_dashboard_assistant_onboarding.sql
```

### `20260428_decision_sample_counts.sql`

Creates no new tables.

Changes:

- `ALTER TABLE public.authority_stats` adds `price_sample_count`, `discount_sample_count`, `bidders_sample_count`, `unique_winner_count`, each `integer not null default 0`.
- `ALTER TABLE public.cpv_stats` adds the same four columns.
- `ALTER TABLE public.authority_cpv_stats` adds the same four columns.
- Creates indexes:
  - `idx_authority_stats_bidders_samples` on `authority_stats (bidders_sample_count desc)`
  - `idx_cpv_stats_bidders_samples` on `cpv_stats (bidders_sample_count desc)`
  - `idx_auth_cpv_stats_bidders_samples` on `authority_cpv_stats (bidders_sample_count desc)`

Policies: none.

Destructive/extra scrutiny flag: **YES - contains `ALTER TABLE` against existing production tables.** It is additive and uses `if not exists`, but should still be reviewed before production because it locks/alters hot stats tables.

### `20260429_phase5_planned_procurements.sql`

Creates:

- `public.planned_procurements`
  - Main fields: `item_description`, `description`, `ugovorni_organ_id`, `contracting_authority_id`, `year`, `cpv_code`, `procurement_type`, `contract_type`, `planned_value`, `estimated_value`, `planned_date`, `source_url`, timestamps.
  - Constraints: at least one description; procurement type limited to services/works/supplies plus Bosnian labels.
- `public.user_tracked_planned_procurements`
  - Composite primary key: `(user_id, planned_procurement_id)`.
  - FKs to `auth.users` and `planned_procurements`, both cascade on delete.

Indexes:

- `idx_planned_procurements_year`
- `idx_planned_procurements_planned_date`
- `idx_planned_procurements_cpv_date`
- `idx_planned_procurements_authority_date`
- `idx_user_tracked_planned_procurements_user`
- `idx_user_tracked_planned_procurements_plan`

Policies:

- Enables RLS on both tables.
- `planned_procurements_read_all` allows public authenticated/anon read through RLS `using (true)`.
- `tracked_planned_owner_all` allows users to manage only their own tracked planned procurements.

Other:

- Drops/recreates `planned_procurements_set_updated_at` trigger.
- Adds enum value `planned_procurement_matched_tender` to `notification_event_type`.

Destructive/extra scrutiny flag: **YES - contains `drop trigger if exists`, `drop policy if exists`, `alter table ... enable row level security`, and `alter type ... add value`.** No `drop table`, `truncate`, or broad data mutation found.

### `20260429_phase6_buyer_ai_narratives.sql`

Creates:

- `public.buyer_ai_narratives`
  - Fields: `company_id`, `authority_jib`, `authority_name`, `cache_week`, `narrative jsonb`, `model`, `context_hash`, `generated_at`.
  - Unique key: `(company_id, authority_jib, cache_week)`.

Indexes:

- `buyer_ai_narratives_company_week_idx`
- `buyer_ai_narratives_authority_idx`

Policies:

- Enables RLS.
- `buyer_ai_narratives_read_own_company` permits reads for company owners and managing agencies.
- `buyer_ai_narratives_write_own_company` permits inserts for company owners and managing agencies.
- `buyer_ai_narratives_update_own_company` permits updates for company owners and managing agencies.

Other:

- `create extension if not exists pgcrypto`.

Destructive/extra scrutiny flag: **YES - contains `drop policy if exists` and `alter table ... enable row level security`.** No destructive table/data operation found.

### `20260429_phase7_ai_alerts_settings.sql`

Creates:

- `public.cpv_opportunity_ai_cache`
  - Unique `(company_id, cpv_code, cache_month)`.
- `public.analytics_daily_insights`
  - Unique `(user_id, insight_date)`.
- `public.alert_parse_cache`
  - Unique `(user_id, input_hash)`.
- `public.saved_alerts`
  - User-owned saved natural-language alert definitions.
- `public.user_settings`
  - Primary key `user_id`; includes `recommendation_weights`, `profile_preferences`, `notification_preferences`, `display_preferences`.

Indexes:

- `cpv_opportunity_ai_cache_company_idx`
- `analytics_daily_insights_user_date_idx`
- `saved_alerts_user_enabled_idx`

Policies:

- Enables RLS on all five tables.
- `cpv_opportunity_ai_cache_read_own_company` permits reads by company owner or managing agency.
- `analytics_daily_insights_own`, `alert_parse_cache_own`, `saved_alerts_own`, and `user_settings_own` permit user-owned access.

Other:

- `create extension if not exists pgcrypto`.

Destructive/extra scrutiny flag: **YES - contains `drop policy if exists` and `alter table ... enable row level security`.** No `drop table`, `truncate`, or broad data mutation found.

### `20260429_phase8_dashboard_assistant_onboarding.sql`

Creates:

- `public.ai_conversations`
- `public.ai_messages`
- `public.user_onboarding`
- `public.ai_feedback`
- `public.user_analytics`

Indexes:

- `ai_conversations_user_updated_idx`
- `ai_messages_conversation_created_idx`
- `ai_feedback_user_surface_idx`
- `user_analytics_user_event_idx`

Policies:

- Enables RLS on all five tables.
- Creates policies inside an idempotent `do $$` block:
  - `Users manage own AI conversations`
  - `Users manage own AI messages`
  - `Users manage own onboarding`
  - `Users manage own AI feedback`
  - `Users manage own analytics events`

Destructive/extra scrutiny flag: **YES - contains `alter table ... enable row level security`.** No `ALTER TABLE` against existing tables, `drop`, `truncate`, or broad data mutation found.

### Type generation note

`types\database.ts` currently contains `planned_procurements`, but does **not** contain the new 20260429 AI/cache/settings/onboarding tables such as `ai_conversations`, `ai_messages`, `ai_feedback`, `saved_alerts`, `user_settings`, `analytics_daily_insights`, `alert_parse_cache`, `buyer_ai_narratives`, `cpv_opportunity_ai_cache`, `user_onboarding`, `user_analytics`, or `user_tracked_planned_procurements`. Phase B should regenerate Supabase types after migrations or use intentionally isolated `any` casts until types are regenerated.

## 5. Page mapping table

| Vite page | Target Next route | Existing? | Vite mock/local hooks | Production replacements | Risk |
|---|---|---:|---|---|---|
| `C:\Users\marin\Desktop\MojaPonuda\src\components\pages\dashboard-page.tsx` | `/dashboard` -> `app\(dashboard)\dashboard\page.tsx` | Yes | `useTenders`, `useHistoricalTenderEvents`, `useExecutionPersistence`, `usePhase7Persistence`, `usePhase8Persistence`, `useTenderPersistence` | Existing dashboard queries `companies`, `bids`, `documents`; `getRecommendedTenders`, `getPersonalizedTenderRecommendations`, `buildRecommendationContext`, `getTenderDecisionInsights`, `getPreparationUsageSummary`, `getUserBidStats`; add `user_onboarding`, `ai_feedback`, `user_analytics`, `ai_conversations` | HIGH |
| `...\tenders-page.tsx` | `/dashboard/tenders` -> `app\(dashboard)\dashboard\tenders\page.tsx` | Yes | `useTenders`, `useTenderPersistence` | Existing `TendersPage`: `fetchRecommendedTenderCandidates`, `getRecommendedTenders`, `selectTenderRecommendations`, `getTenderDecisionInsights`, `enrichTendersWithAuthorityGeo`, `attachTenderLocationPriority`, `sortRecommendedTenderItems`; tables `tenders`, `companies`, `bids`, `contracting_authorities` | HIGH |
| `...\recommended-tenders-page.tsx` | `/dashboard/tenders?tab=recommended` | Yes | `useTenders`, `useTenderPersistence` | Same route/data as above; preserve current recommendation pipeline and decision insights; ignore/bookmark/search persistence should map to `watchlist`, saved searches table/API if added, or scoped user preference tables | HIGH |
| `...\tracking-page.tsx` | Recommended new `/dashboard/pracenje`; alternative: reconcile with `/dashboard/watchlist` | No for recommended route; `/dashboard/watchlist` exists but means watched entities/signals | `useTenders`, `useExecutionPersistence` | Use `bids`, `bid_checklist_items`, `bid_documents`, `notifications`; actions `updateBidStatusAction`, `updateBidFieldsAction`; helpers `getTenderDecisionInsights`, `buildPreparationPlan`; do not overwrite watchlist semantics without product decision | MEDIUM |
| `...\pipeline-page.tsx` | `/dashboard/ponude` -> `app\(dashboard)\dashboard\ponude\page.tsx` | Yes | `useTenders`, `useExecutionPersistence` | Existing `PonudePage`, `KanbanBoard`, `updateBidStatusAction`, `updateBidFieldsAction`, table `bids` with `kanban_position`, joined `tenders`, `getTenderDecisionInsights` | HIGH |
| `...\bids-page.tsx` | `/dashboard/bids` and `/dashboard/bids/[id]` | Yes | `useTenders`, `useExecutionPersistence` | Existing `BidsPage`, `BidWorkspaceClient`, `resolveBidAccess`, `ensureBidChecklist`, bid checklist/document API routes, `bid_comments`, `bid_documents`, `tender_doc_uploads`, `documents` | HIGH |
| `...\documentation-page.tsx` | `/dashboard/vault`; template subpage can be new `/dashboard/vault/templates` or folded into vault | `/dashboard/vault` exists; template route no | `useTenders`, `usePhase5Persistence` | Existing `VaultPage`, `DocumentGrid`, `AddDocumentModal`, `documents` API/upload/signed-url routes; `fetchTenderDocumentation`, `analyzeTenderDocumentation`, `extractText`, `ensureBidChecklist` for tender-doc flow | HIGH |
| `...\early-warning-page.tsx` | `/dashboard/intelligence/upcoming`; detail route new `/dashboard/intelligence/upcoming/[id]` if keeping detail screen | List route exists; detail route no | `useBuyers`, `usePhase5Persistence` | `getMarketOverview`, `fetchPlannedProcurements`, `planned_procurements`, `user_tracked_planned_procurements`, `watchEntityAction`, `runNotificationScheduler`, `sendNotification` | MEDIUM |
| `...\buyers-page.tsx` | Buyer list new `/dashboard/intelligence/authorities`; detail existing `/dashboard/intelligence/authority/[jib]` | Detail exists; list route no | `useBuyers`, `useTenders`, `useHistoricalTenderEvents`, `usePhase6Persistence` | Tables `contracting_authorities`, `authority_stats`, `company_authority_stats`, `award_decisions`, `tenders`; API `/api/analytics/authority/[jib]`, `/api/analytics/authority/[jib]/narrative`; `isWatched`, `watchEntityAction` | MEDIUM |
| `...\competition-page.tsx` | `/dashboard/intelligence/competitors` should become real page instead of redirect, or section in `/dashboard/intelligence` | Route exists but redirects | `useClients`, `useHistoricalTenderEvents`, `useTenders`, `usePhase6Persistence` | `getCompetitorAnalysis`, `getCompetitors`, `getSimilarTenders`, `market_companies`, `award_decisions`, `company_stats`, `company_cpv_stats`, `watchEntityAction` for competitors | MEDIUM |
| `...\clients-page.tsx` | `/dashboard/agency` and `/dashboard/agency/clients/[id]` | Yes | `useClients`, `useTenders`, `useAppStore` | Existing `AgencyPage`, `AgencyCRMDashboard`, `AgencyClientDetail`, `agency_clients`, linked `companies`, `bids`, `documents`, `agency_client_notes`, `getSubscriptionStatus`, `isAgencyPlan` | HIGH |
| `...\cpv-page.tsx` | Recommended new `/dashboard/cpv`; alternative section in `/dashboard/trziste` | No for recommended route | `useTenders`, `useHistoricalTenderEvents`, `usePhase7Persistence` | `cpv_stats`, `company_cpv_stats`, `tenders`, `award_decisions`, `getMarketOverview`, API `/api/cpv/[code]/opportunity`, `watchEntityAction` with entity type `cpv` | MEDIUM |
| `...\analytics-page.tsx` | `/dashboard/trziste`; optional new `/dashboard/analytics` if product wants standalone analytics | `/dashboard/trziste` exists | `useTenders`, `useHistoricalTenderEvents` | Existing `MarketOverviewPage`, `getMarketOverview`, `getUserBidStats`, `getTenderAreaGapReport`, API `/api/analytics/insights`, tables `tenders`, `award_decisions`, `authority_stats`, `company_stats` | LOW |
| `...\alerts-page.tsx` | Recommended new `/dashboard/alerti` | No | `usePhase7Persistence` | API `/api/alerts/parse`, tables `saved_alerts`, `alert_parse_cache`, `notification_preferences`, `notifications`; `updateNotificationPreferenceAction`, `runNotificationScheduler`, `sendNotification` | MEDIUM |
| `...\settings-page.tsx` | `/dashboard/settings` -> `app\(dashboard)\dashboard\settings\page.tsx` | Yes | `usePhase7Persistence`, constants from `mockData` | Existing settings components, `saveEjnCredentialsAction`, `removeEjnCredentialsAction`, `updateNotificationPreferenceAction`, `getEjnCredentials`, `hasEjnCredentials`, `companies` profile updates, new `user_settings` | HIGH |

## 6. Shared component mapping table

| Vite shared asset | Existing Next equivalent? | Reconciliation / target location |
|---|---|---|
| `CircularProgressScore` | Partial: `components\tenders\tender-decision-metrics.tsx`, `win-probability-card.tsx` show score/probability concepts | Add as reusable `components/ui/circular-progress-score.tsx` or `components/dashboard/circular-progress-score.tsx`; feed it real `TenderDecisionInsight.priorityScore`, match score, or win probability. |
| `DeadlineCountdown` | Partial: tender cards and dashboard format deadline text manually | Add `components/ui/deadline-countdown.tsx`; base on real `deadline`/`submission_deadline`; keep server-safe date formatting. |
| `StatCard` | Partial: `UserStatsCard`, dashboard focus cards, market cards | Add a generic `components/ui/stat-card.tsx` only if it reduces duplication; otherwise adapt Vite variants into page-local dashboard/intelligence cards. |
| `AIInsightBox` | Partial: `decision-support-card`, tender decision summary | Add `components/ui/ai-insight-box.tsx` or `components/ai/ai-insight-box.tsx`; wire to decision insights, analytics insights, and AI caches. |
| `PriorityPill` | Partial: badges in tender cards and decision summary | Add `components/ui/priority-pill.tsx`; map priority to derived decision score/risk, not Vite mock `priority`. |
| `StatusBadge` | Partial: `components/ui/badge.tsx`, bid status classes in `lib\bids\constants.ts` | Reuse shadcn `Badge`; either add a domain-specific `components/tenders/status-badge.tsx` or port Vite component with real status mapping. |
| `DonutChart` | Partial: Recharts components in `components\intelligence` and `components\trziste\market-charts.tsx` | Prefer existing Recharts patterns; add shared `components/ui/donut-chart.tsx` only if pages need identical compact chart behavior. |
| `LineAreaChart` | Partial: Recharts monthly charts exist | Prefer existing `components/trziste/market-charts.tsx` and intelligence chart components; extract shared chart if duplication appears. |
| `EmptyState` | No generic equivalent | Add `components/ui/empty-state.tsx`; replace scattered empty blocks gradually. |
| `KeyboardShortcutsModal` | No equivalent | Add under `components/layout/keyboard-shortcuts-modal.tsx` or `components/dashboard/keyboard-shortcuts-modal.tsx`; requires client shell state and Next navigation. |
| `AI Assistant Panel` | API exists; no mounted panel | Add `components/assistant/ai-assistant-panel.tsx` and mount in `app\(dashboard)\layout.tsx`; use `/api/assistant/chat`, `ai_conversations`, `ai_messages`. |
| `Sidebar` | Yes: `components\dashboard-sidebar.tsx` | Reconcile nav groups, AI assistant action, counts, mobile bottom nav, collapsed state, and agency client switcher. Preserve current auth/agency behavior. |
| `TopBar` | Partial: mobile header in `DashboardSidebar`; no desktop top search/notification bar | Add `components/dashboard/top-bar.tsx` if porting global search/notifications. It must query/fetch real tenders, authorities, agency clients, and notifications with auth. |
| App shell | Yes: `app\(dashboard)\layout.tsx` + `DashboardSidebar` | Do not port React Router `AppShell` directly. Convert shell behavior to Next layout/client components while preserving server auth boundary. |
| `button`, `badge`, `avatar`, `dialog`, `dropdown-menu`, `input`, `separator`, `tabs`, `tooltip` | Yes under `components\ui` | Keep shadcn/RSC-compatible primitives as source of truth; only port visual tweaks/variants that are needed by redesigned pages. |
| `skeleton` | No current generic skeleton file seen | Add `components/ui/skeleton.tsx` if needed for client-loading states. |

## 7. Design token reconciliation plan

### Token mismatches

| Area | Vite redesign | Next production | Recommendation |
|---|---|---|---|
| Font | Inter via CSS import | IBM Plex Sans/Serif/Mono via `next/font/google` | If visual fidelity to redesign is the goal, switch dashboard shell to Inter using `next/font/google` or existing Inter package. Avoid remote CSS import. |
| Background | White app background with white/slate surfaces | `#f7f9fc` app background with white cards | Adopt Vite tokens for dashboard surfaces, but keep shadcn variable names. Public/landing can remain separate if needed. |
| Primary | `#2563eb` | `#0b6ff6` | Use Vite `#2563eb` for ported product UI or alias it to `--primary`; audit existing blue usages after. |
| AI accent | Purple `#7c3aed` token family | No dedicated AI accent | Add Vite `--accent-ai*` tokens; use for assistant/AI insight surfaces. |
| Status colors | success/warning/danger/info with soft/strong variants | only destructive plus chart colors | Add Vite status semantic variables; keep `--destructive` mapped to danger. |
| Radius | card 12px, input 8px, modal 16px | base radius 0.5rem; some existing custom 1.5rem/2rem cards | Normalize operational dashboard cards to 8-12px where redesigned components require it; avoid changing landing cards in the same pass. |
| Shadows | subtle card/modal tokens | utility shadows and custom large sidebar shadow | Add Vite shadow tokens and use them in ported components; keep sidebar shadow if visually compatible. |
| Charts | 6 chart colors plus neutral | 5 chart colors | Extend chart variables to Vite six-color set while preserving current `--chart-1..5` names. |
| Tailwind config | minimal config in Vite | no config, CSS-first Tailwind v4 | Do not add a config just to port tokens. Put tokens in `app/globals.css` using Tailwind v4 `@theme inline`. |

### Recommendation

Do **not** blindly overwrite `app\globals.css`. Instead, make the Vite design tokens the dashboard product baseline while preserving the production app's shadcn variable contract. Phase B should map Vite variables into existing shadcn variables and add missing aliases, for example `--surface-1`, `--surface-2`, `--accent-ai`, status soft/strong variables, and chart-6. This keeps existing shadcn components functional while allowing the redesign components to use their intended semantic tokens.

If global token changes would disturb public landing/auth pages, scope the Vite tokens under a dashboard wrapper class or data attribute first, then migrate public pages separately.

## 8. API route verification

The prompt says "4 API routes" but lists five. All five listed routes already exist in the Next.js production app.

| Expected route | Exists? | File | Notes |
|---|---:|---|---|
| `/api/assistant/chat` | Yes | `app\api\assistant\chat\route.ts` | Authenticated POST; streams OpenAI response; persists `ai_conversations`/`ai_messages`; fallback without `OPENAI_API_KEY`. |
| `/api/alerts/parse` | Yes | `app\api\alerts\parse\route.ts` | Authenticated POST; caches parsed natural-language alert in `alert_parse_cache`. |
| `/api/analytics/insights` | Yes | `app\api\analytics\insights\route.ts` | Authenticated GET; caches daily insights in `analytics_daily_insights`. Review scoping of aggregate bid/tender context before broad use. |
| `/api/cpv/[code]/opportunity` | Yes | `app\api\cpv\[code]\opportunity\route.ts` | Authenticated GET; uses `cpv_stats`, `company_cpv_stats`, `cpv_opportunity_ai_cache`. |
| `/api/analytics/authority/[jib]/narrative` | Yes | `app\api\analytics\authority\[jib]\narrative\route.ts` | Authenticated GET; uses `buyer_ai_narratives`, `contracting_authorities`, `authority_stats`, `company_authority_stats`. |

Need to add/move: **none for these five API routes.** The missing work is type generation and client UI integration.

## 9. Risk register

| # | Risk | Why it matters | Mitigation |
|---:|---|---|---|
| 1 | Breaking auth/session boundaries in `app\(dashboard)\layout.tsx` | This layout is the main guard for protected dashboard routes. A client-only shell port could accidentally bypass server redirects or fetch without cookies. | Keep server layout as the boundary. Mount only interactive shell pieces as child client components. |
| 2 | Agency vs single-company context mismatch | Vite uses `useAppStore().accountType`; production uses subscription plan and `agency_clients`. | Remove Vite account mock state from data decisions. Resolve context from `getSubscriptionStatus`, route params, and `agency_clients`. |
| 3 | Supabase type drift after migrations | New tables used by API routes are absent from `types/database.ts`. Typed Supabase calls can fail build or encourage unsafe casts. | Apply reviewed migrations, regenerate types, then wire UI. If not possible, isolate temporary `any` casts and track removal. |
| 4 | Tender data shape mismatch | Vite `Tender` has `valueKm`, `buyerName`, `fitScore`, `priority`, simple statuses; production has `estimated_value`, `contracting_authority`, AI analysis, recommendation/decision insights, and different statuses. | Build adapter functions per page; never rename DB fields in place. Use real decision insight and recommendation functions for derived fields. |
| 5 | LocalStorage persistence replacing production mutations | Vite hooks are fallbacks only. Shipping them would hide state per browser and bypass RLS/server state. | Replace each persistence hook with server actions/API routes/tables before enabling production paths. |
| 6 | Bid/pipeline mutation regressions | Pipeline and bids touch `bids`, checklist, documents, comments, kanban position, access control, and revalidation. | Port UI around existing `updateBidStatusAction`, `updateBidFieldsAction`, bid API routes, and `resolveBidAccess`; add focused tests. |
| 7 | Document upload/template flows | Vite documentation page has local template actions; production has real storage, signed URLs, tender documentation extraction, and checklist generation. | Keep existing vault and tender-doc APIs as source of truth; port visual layout separately from upload logic. |
| 8 | Migration production lock/RLS impact | `ALTER TABLE` on stats tables and enabling RLS/policies can affect live traffic. | Backup first, run SQL review, apply during low traffic, verify RLS with owner and agency users immediately. |
| 9 | Navigation and route semantics conflict | Vite `/pracenje` means execution tracking; Next `/dashboard/watchlist` means watched entities/signals. | Add `/dashboard/pracenje` or explicitly redesign watchlist after product decision; do not silently replace semantics. |
| 10 | Global token overwrite impacts landing/auth/admin | Vite dashboard tokens differ from existing public/app tokens. | Scope token changes to dashboard first or map tokens without removing shadcn variables. Visual QA desktop/mobile after each page group. |

### Auth-sensitive porting locations

- `app\(dashboard)\layout.tsx`
- `components\dashboard-sidebar.tsx`
- Any new dashboard top bar / assistant panel that fetches authenticated data
- `app\(auth)\layout.tsx` and `/auth/callback` redirect assumptions
- All `/dashboard/agency/clients/[id]` routes
- Client components using `lib\supabase\client.ts`
- API routes that call `supabase.auth.getUser()`
- Any route added outside `(dashboard)` by mistake

### Likely data-shape mismatch areas

- Mock `Tender.valueKm` -> production `tenders.estimated_value`.
- Mock `Tender.buyerName`/`buyerId` -> production `contracting_authority`, `contracting_authority_jib`, `contracting_authorities`.
- Mock `Tender.fitScore`/`aiReason` -> production `getRecommendedTenders`, `getTenderDecisionInsights`, `ai_analysis`.
- Mock tender statuses -> production tender status plus bid statuses (`draft`, `in_review`, `submitted`, `won`, `lost`).
- Mock `Buyer.id` -> production authority `jib` or UUID depending table.
- Mock `ClientCompany` -> production `agency_clients` joined to `companies`.
- Mock `HistoricalTenderEvent` -> production `award_decisions`, `authority_stats`, `company_stats`, `cpv_stats`.
- Mock planned procurements generated from buyers -> production `planned_procurements`.
- Local saved alerts/settings -> production `saved_alerts`, `user_settings`, `notification_preferences`.

### Three highest-risk port operations

1. Replacing `/dashboard/tenders` and `/dashboard/tenders?tab=recommended`, because this is the core tender discovery/recommendation path and already contains complex LLM/legacy fallback ranking.
2. Porting execution pages (`tracking`, `pipeline`, `bids`) into production mutations, because it touches bid status, kanban order, tasks, documents, comments, and access control.
3. Porting dashboard shell plus AI assistant globally, because it touches the authenticated layout, navigation, assistant persistence, user analytics, onboarding, and many cross-page contexts.

## 10. Recommended port order with justification

0. **Foundation pre-step: tokens and shared primitives.** Add/match CSS variables, reconcile shadcn primitives, and port only reusable low-risk components first. This is not a user page, but it reduces churn for every page after it.

1. **`analytics-page.tsx` -> `/dashboard/trziste`.** Mostly read-only analytics and charts, with existing market data functions already available. Lowest behavioral risk.

2. **`buyers-page.tsx` -> authority list plus `/dashboard/intelligence/authority/[jib]`.** Read-heavy intelligence data; detail route already exists. Main work is adapting list UI and `jib` identity.

3. **`competition-page.tsx` -> `/dashboard/intelligence/competitors`.** Existing route currently redirects, so it can become a real page without disrupting the main intelligence overview. Uses existing competitor functions.

4. **`cpv-page.tsx` -> new `/dashboard/cpv` or scoped section in `/dashboard/trziste`.** Mostly read-only plus a verified AI API. Requires CPV data adapter and watchlist decisions.

5. **`early-warning-page.tsx` -> `/dashboard/intelligence/upcoming`.** Existing route and market overview function exist, but full feature depends on reviewed planned procurement migration and tracking table.

6. **`alerts-page.tsx` -> new `/dashboard/alerti`.** API exists and migration defines tables. Medium risk because it must persist saved alerts and connect to notification scheduling.

7. **`documentation-page.tsx` -> `/dashboard/vault`.** Visual port can be staged, but upload/template/document-generation behavior must preserve existing document APIs and storage flow.

8. **`settings-page.tsx` -> `/dashboard/settings`.** High risk because settings mutate company profile, credentials, notification preferences, and new `user_settings`.

9. **`tenders-page.tsx` -> `/dashboard/tenders`.** High traffic and data-complex. Keep existing recommendation and decision logic, then replace visuals around it.

10. **`recommended-tenders-page.tsx` -> `/dashboard/tenders?tab=recommended`.** Port after base tenders because it shares the same adapters and ranking pipeline.

11. **`tracking-page.tsx` -> new `/dashboard/pracenje` or explicit watchlist redesign.** Needs product decision around semantics and bid/status data adapters.

12. **`pipeline-page.tsx` -> `/dashboard/ponude`.** Mutation-heavy Kanban workflow; port after adapters and bid status actions are stable.

13. **`bids-page.tsx` -> `/dashboard/bids` and `/dashboard/bids/[id]`.** Highest execution detail risk after pipeline because it touches checklist, bid workspace, documents, comments, and export/package APIs.

14. **`clients-page.tsx` -> `/dashboard/agency` and client-scoped routes.** High risk due agency-only access, managed company context, and cross-client data aggregation.

15. **`dashboard-page.tsx` -> `/dashboard`.** Port last. It composes recommendations, pipeline, decisions, onboarding, activity, CPV, analytics, and assistant state, so it should consume already-ported real components.

## 11. Pre-flight checklist before starting Phase B

- Confirm no source files were changed in Phase A except this `PORT_PLAN.md`.
- Take a production database backup before any migration.
- Review each pending migration in Supabase SQL editor, especially `20260428_decision_sample_counts.sql`.
- Apply migrations only after confirming they have not already run.
- Regenerate `types\database.ts` after migrations.
- Verify RLS with at least one single-company user and one agency user.
- Decide route semantics for `Pracenje`: new `/dashboard/pracenje` vs redesigning `/dashboard/watchlist`.
- Decide route for CPV: new `/dashboard/cpv` vs integrate under `/dashboard/trziste`.
- Decide route for alerts: recommended `/dashboard/alerti`.
- Decide whether dashboard tokens apply globally or only under `(dashboard)`.
- Keep `app\(dashboard)\layout.tsx` as the auth boundary.
- Do not port Vite localStorage persistence hooks into production behavior.
- Create adapters for Vite display types from production Supabase rows before replacing page UI.
- Preserve existing server actions/API routes for bid, document, watchlist, settings, and AI mutations.
- Run `npm run build` after the first Phase B slice and after each high-risk route group.
- Browser-QA desktop and mobile after shell/sidebar/topbar changes.
