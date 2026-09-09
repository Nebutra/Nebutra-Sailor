/**
 * Moved to `src/testing.ts` and published as `@nebutra/db/testing` so packages
 * outside this one can prove SQL-level guarantees on the same harness.
 * Re-exported here so the existing RLS suites keep their import path.
 */
export {
  availableBackends,
  type Backend,
  becomeTenant,
  createPgliteClient,
  createPostgresClient,
  localhostDatabaseUrl,
  randomRoleName,
  type SqlClient,
} from "../../src/testing";
