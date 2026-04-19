-- Fix: pgvector ivfflat index + default probes=1 returned only ~1% of the
-- corpus (scanned 1 cluster out of 100), causing retrieveEmbeddingCandidates
-- to return only 4 candidates instead of 200 even though all 1932 active
-- tenders have embeddings.
--
-- At the current corpus size (~2k tenders) sequential scan is fast (<50ms)
-- and 100% exact. When the corpus grows past ~50k tenders, replace with
-- HNSW (pgvector 0.5+):
--
--   CREATE INDEX tenders_embedding_hnsw_idx
--     ON public.tenders USING hnsw (embedding vector_cosine_ops);
--
-- HNSW does not require tuning a `probes` parameter at query time.

DROP INDEX IF EXISTS public.tenders_embedding_cos_idx;
