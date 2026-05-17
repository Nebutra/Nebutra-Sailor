# @nebutra/code-index

## 0.2.0

### Minor Changes

- [`efe3e76`](https://github.com/Nebutra/Nebutra-Sailor/commit/efe3e7603202462382e4e491fbe2467239fea1bd) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - New package: multi-tenant codebase semantic-index grammar.

  Deterministic, content-addressed code chunking with three strategies —
  structural (via an injected parser port), line-chunking (greedy pack with a
  re-balancing back-track so the trailing chunk is never a tiny sliver, plus
  oversized-line hard-split), and markdown header-aware sectioning — with a pure
  fallback when no structural parser is available. An incremental index engine
  does hash-diff scanning (skip-by-file-hash, delete-then-upsert changed files,
  prune deleted files), recreates the collection on embedding-profile drift
  (provider / model / dimension), batches embedding calls, retries with pure
  exponential backoff, hard-fails a full scan past a 10% batch-failure gate, and
  serves cosine retrieval with a min-score and directory-prefix scope.

  Tenant-scoped (collection key = `tenantId` + `project`, Zod-validated, no
  unscoped path) and fail-closed (retrieval throws rather than returning stale or
  empty results when the index is missing, incomplete, or drifted). Embedder,
  VectorStore, FileSource, IndexCacheStore and the structural parser are all
  host-injected — no bundled vendor and no native parser dependency. Carries the
  same `getCodeIndex()` provider seam as the other provider-agnostic packages.
  62 package tests.
