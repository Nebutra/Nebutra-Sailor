-- Router per-request log (Batch B).
--
-- No new table: `ai_request_logs` already carries request id, key, tenant,
-- model, token counts, cost, latency and status, and the gateway's completion
-- worker already writes it. Adding a `router_request_logs` alongside it would
-- have been the third request store in a batch whose purpose is to end
-- "two ledgers, no join" (decisions.md A2). The Router edge writes here.
--
-- Every column is nullable or defaulted, so the gateway's existing INSERT is
-- unchanged and no backfill is needed. `expires_at` is nullable on purpose:
-- the retention sweep deletes only rows that carry a horizon, so it can never
-- reach a row written before this migration.

ALTER TABLE "public"."ai_request_logs"
  ADD COLUMN "path" VARCHAR(120),
  ADD COLUMN "http_status" INTEGER,
  ADD COLUMN "ttfb_ms" INTEGER,
  ADD COLUMN "cached_prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "supply_path" VARCHAR(64),
  ADD COLUMN "client_ip" VARCHAR(64),
  ADD COLUMN "expires_at" TIMESTAMP(3);

-- The per-key log drawer pages by (key, time); the sweep scans by horizon.
CREATE INDEX "ai_request_logs_api_key_id_created_at_idx"
  ON "public"."ai_request_logs"("api_key_id", "created_at");
CREATE INDEX "ai_request_logs_expires_at_idx"
  ON "public"."ai_request_logs"("expires_at");
