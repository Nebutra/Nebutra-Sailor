-- The task store has always upserted on (tenant_id, idempotency_key), but no unique constraint
-- backed it, so every submission carrying an idempotency key failed with
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- Latent until now because the Python origin had never been deployed.
--
-- A plain unique index is enough: Postgres treats NULLs as distinct, so tasks submitted without an
-- idempotency key never collide with each other, which is the semantics the store wants and is
-- also what lets Prisma express the constraint at all.

CREATE UNIQUE INDEX "tasks_tenant_id_idempotency_key_key" ON "public"."tasks"("tenant_id", "idempotency_key");
