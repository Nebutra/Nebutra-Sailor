-- `users` was written by the Clerk webhook and keyed by `clerk_id`. Better Auth
-- keeps its own `auth_users` table and never wrote here, so anyone who signed up
-- after the switch had no `users` row for the thirteen foreign keys that need
-- one (tenants, consents, skills, …). The row is now mirrored from the auth
-- identity — `users.id = auth_users.id` — by `UserRepository.ensureFromIdentity`,
-- and a mirrored identity has neither a Clerk id nor, for a phone-only account,
-- an email. Both stay unique; Postgres lets any number of rows be NULL there.
ALTER TABLE "public"."users" ALTER COLUMN "clerk_id" DROP NOT NULL;
ALTER TABLE "public"."users" ALTER COLUMN "email" DROP NOT NULL;
