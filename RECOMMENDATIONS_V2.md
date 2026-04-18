# Tender preporuke v2 — embedding retrieval + LLM reranking

## Arhitektura

```
┌──────────────────┐   profile_embedding   ┌────────────────────┐
│   Onboarding     │ ────────────────────▶ │  companies         │
│  (Korak 2: 5     │                       │  .profile_text     │
│   polja + AI)    │                       │  .profile_embedding│
└──────────────────┘                       └─────────┬──────────┘
                                                     │
                    pgvector cosine top-K=200        │
                              ▼                      │
┌────────────────────────┐        ┌─────────────────────────────┐
│ match_tenders_by_      │◀──────▶│ tenders.embedding           │
│ embedding (RPC)        │        │ (text-embedding-3-small)    │
└──────────┬─────────────┘        └─────────────────────────────┘
           │ 200 kandidata
           ▼
┌─────────────────────────────────────────────┐
│ Cache lookup → tender_relevance              │
│ (company_id, tender_id) → score, confidence  │
└──────────┬──────────────────────────────────┘
           │ samo missing parovi
           ▼
┌─────────────────────────────────────────────┐
│ LLM rerank (gpt-4o-mini, batch=7, ||=10)    │
│ → score 1-10, confidence 1-5                │
└──────────┬──────────────────────────────────┘
           │
           ▼
     upsert u tender_relevance
           │
           ▼
  sort DESC, tier = top / maybe / hidden
```

## Datoteke

| Sloj | Fajl | Svrha |
|---|---|---|
| DB | `supabase/migrations/20260418_tender_embeddings_and_relevance.sql` | pgvector + profile_embedding + tenders.embedding + tender_relevance + `match_tenders_by_embedding` RPC |
| Core | `lib/embeddings.ts` | `generateEmbedding()`, `generateEmbeddings()`, `buildCompanyProfileEmbeddingText()`, `buildTenderEmbeddingText()`, `toPgVector()` |
| Pipeline | `lib/tender-relevance.ts` | `getRecommendedTenders()`, `retrieveEmbeddingCandidates()`, `embedNewTenders()`, `cleanupOrphanedRelevance()`, `classifyTier()` |
| API | `app/api/onboarding/save-embedding/route.ts` | Spremanje `profile_embedding` na kraju Koraka 2 |
| UI | `components/onboarding-value-first-form.tsx` | Novi Korak 2 (5 polja) + automatski poziv save-embedding prije Koraka 3 |
| Batch | `scripts/backfill-relevance.ts` | Zagrijavanje cache-a za sve firme sa embeddingom |
| Cron | `sync/ejn-sync.ts` (morning-sync) | `embedNewTenders()` nakon upsert-a tendera |
| Cron | `sync/post-sync-pipeline.ts` | `embedNewTenders()` na svakom layeru; `cleanupOrphanedRelevance()` na layer3 (mjesečno) |

## Deploy koraci

1. **Apply migration** u Supabase SQL editoru:
   ```sql
   \i supabase/migrations/20260418_tender_embeddings_and_relevance.sql
   ```
   ili kopiraj sadržaj i pusti ga.

2. **Env vars** (već postoje): `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

3. **Deploy** Next.js aplikacije.

4. **Backfill tender embeddingsa** — prvi put:
   - Jednostavno pusti morning-sync cron (4 AM UTC) — on će embeddovati 20×25 = 500 tendera po pokretanju. Uzastopna pokretanja popune ostatak.
   - Ili pokreni lokalno:
     ```bash
     curl -H "Authorization: Bearer $CRON_SECRET" \
          https://<app>/api/cron/morning-sync
     ```

5. **Backfill relevance** (nakon što postoji nekoliko firmi sa profile_embedding):
   ```bash
   npx tsx scripts/backfill-relevance.ts
   ```

## Korištenje u UI

```ts
import { getRecommendedTenders, classifyTier } from "@/lib/tender-relevance";

const scored = await getRecommendedTenders(supabase, companyId, {
  limit: 50,
  minScore: 5, // sakriva score < 5
});

// scored: Array<{ tender, score, confidence, similarity, tier }>
// tier ∈ "top" (>=8) | "maybe" (5-7) | "hidden" (<5)

// Podijeli u dvije sekcije:
const top = scored.filter(s => s.tier === "top");
const maybe = scored.filter(s => s.tier === "maybe");
```

## Loading state za nove korisnike

```tsx
if (scored.length === 0 && hasProfileEmbedding) {
  return <p>Analiziramo tendere za vašu firmu...</p>;
}
```

Prvi poziv `getRecommendedTenders()` za novu firmu će okinuti ~29 LLM poziva
(200 tendera / 7 po batchu), što traje ~3-8s uz paralelizaciju. Svi naknadni
pozivi koriste cache — response < 1s.

## Troškovi (estimirano)

- `text-embedding-3-small`: ~$0.02 / 1M tokena. 500 tendera × ~500 tokena ≈ $0.005/dan.
- `gpt-4o-mini` rerank: ~$0.00020 po LLM pozivu (7 tendera).
  - Nova firma: 200/7 = ~29 poziva → ~$0.006.
  - 50 firmi × 29 poziva (jednokratno) ≈ **$0.30**.
  - Dnevni inkrement (novih ~100 tendera × 50 firmi lazy) = ~$2/mjesec.
- **Ukupno za 50 korisnika: ~$2-5/mj** ✓

## Legacy sistem — šta ostaje

Stari sistem u `lib/tender-recommendations.ts`, `tender-recommendation-rerank.ts`
i `personalized-tenders.ts` je **ostavljen netaknut** kao fallback. Postojeći
pozivatelji (dashboard, agency views) trenutno i dalje koriste stari keyword +
CPV + hardcoded negative-keyword pipeline.

**Migracija poziva na nove preporuke** (TODO u sljedećoj iteraciji):
1. `app/(dashboard)/dashboard/tenders/page.tsx` — kad `companyProfile.profile_embedding` postoji, pozovi `getRecommendedTenders()` umjesto `fetchRecommendedTenderCandidates + selectTenderRecommendations`.
2. `components/dashboard/recommended-tenders.tsx` — ista zamjena.
3. `app/(dashboard)/dashboard/agency/clients/[id]/**` — per-klijent poziv novog pipeline-a.

Kad se svi callers migriraju, stari fajlovi se mogu obrisati.

## Konfiguracija

Konstante u `lib/tender-relevance.ts`:
- `RETRIEVAL_TOP_K = 200`
- `LLM_BATCH_SIZE = 7`
- `LLM_MAX_PARALLEL = 10`
- `LLM_BATCH_DELAY_MS = 300`
- `RELEVANCE_MODEL_VERSION = "gpt-4o-mini-v1"` (bump kad mijenjaš model → invalidira cache)
