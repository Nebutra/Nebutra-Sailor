/**
 * Closure P1.2 — `withTenantContext` (@nebutra/db/rls) and `withRls`
 * (@nebutra/tenant/isolation) must be one implementation.
 *
 * Both wrappers are driven against SQL-recording fakes and the statement
 * sequences they issue are compared verbatim. `withTenantContext` used to
 * freeze `APP_DB_ROLE` at module load while `withRls` resolved it per call, so
 * the same process could switch role on one path and stay BYPASSRLS on the
 * other — the drift this file exists to catch.
 */
import { withRls } from "@nebutra/tenant/isolation";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withAdminContext, withOrgContext, withTenantContext } from "./rls";

interface Statement {
  sql: string;
  values: unknown[];
}

const MODEL_QUERY = "-- model query";
const PROBE_ROLE = "app_rls_probe";

/** Render a tagged template the way a driver would: `$1`, `$2`, … placeholders. */
function renderTemplate(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce(
    (sql, part, index) => sql + part + (index < values.length ? `$${index + 1}` : ""),
    "",
  );
}

function recorder(log: Statement[]) {
  return {
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      log.push({ sql: renderTemplate(strings, values), values });
      return Promise.resolve(1);
    },
    $executeRawUnsafe: (sql: string) => {
      log.push({ sql, values: [] });
      return Promise.resolve(1);
    },
  };
}

/** Interactive-transaction Prisma shape consumed by `withTenantContext`. */
function fakeInteractivePrisma(log: Statement[]) {
  const tx = recorder(log);
  return {
    $transaction: <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };
}

/** `$extends` + batch `$transaction` Prisma shape consumed by `withRls`. */
function fakeExtensiblePrisma(log: Statement[]) {
  const prisma = {
    ...recorder(log),
    $transaction: (ops: unknown[]) => Promise.all(ops),
    $extends(extension: {
      query: {
        $allOperations: (ctx: {
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) => Promise<unknown>;
      };
    }) {
      return {
        findMany: (args: unknown) =>
          extension.query.$allOperations({
            args,
            query: async (queryArgs) => {
              log.push({ sql: MODEL_QUERY, values: [queryArgs] });
              return [{ id: "row_1" }];
            },
          }),
      };
    },
  };
  return prisma;
}

async function statementsFromWithTenantContext(tenantId: string): Promise<Statement[]> {
  const log: Statement[] = [];
  const result = await withTenantContext(
    fakeInteractivePrisma(log) as never,
    tenantId,
    async () => {
      log.push({ sql: MODEL_QUERY, values: [{ where: {} }] });
      return [{ id: "row_1" }];
    },
  );
  expect(result).toEqual([{ id: "row_1" }]);
  return log;
}

async function statementsFromWithRls(tenantId: string): Promise<Statement[]> {
  const log: Statement[] = [];
  const client = withRls(fakeExtensiblePrisma(log), tenantId) as unknown as {
    findMany: (args: unknown) => Promise<unknown>;
  };
  const result = await client.findMany({ where: {} });
  expect(result).toEqual([{ id: "row_1" }]);
  return log;
}

function expectedStatements(tenantId: string, role: string | null): Statement[] {
  return [
    ...(role ? [{ sql: `SET LOCAL ROLE "${role}"`, values: [] }] : []),
    { sql: "SELECT set_config('app.current_tenant_id', $1, true)", values: [tenantId] },
    { sql: MODEL_QUERY, values: [{ where: {} }] },
  ];
}

describe("withTenantContext and withRls share one tenant session", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRole = process.env.APP_DB_ROLE;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    delete process.env.APP_DB_ROLE;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalRole === undefined) {
      delete process.env.APP_DB_ROLE;
    } else {
      process.env.APP_DB_ROLE = originalRole;
    }
  });

  // Failing case on the pre-merge code: `withTenantContext` read APP_DB_ROLE once
  // at import, so a role configured afterwards never produced SET LOCAL ROLE.
  it("withTenantContext assumes APP_DB_ROLE resolved at call time", async () => {
    process.env.APP_DB_ROLE = PROBE_ROLE;

    const log = await statementsFromWithTenantContext("org_1");

    expect(log[0]).toEqual({ sql: `SET LOCAL ROLE "${PROBE_ROLE}"`, values: [] });
    expect(log).toEqual(expectedStatements("org_1", PROBE_ROLE));
  });

  // Regression case: the two wrappers must issue byte-identical statement
  // sequences, with and without a configured role.
  it.each([
    { label: "without APP_DB_ROLE", role: null },
    { label: "with APP_DB_ROLE", role: PROBE_ROLE },
  ])("issues identical SQL for the same tenant $label", async ({ role }) => {
    if (role) process.env.APP_DB_ROLE = role;

    const [viaTenantContext, viaRls] = await Promise.all([
      statementsFromWithTenantContext("org_1"),
      statementsFromWithRls("org_1"),
    ]);

    expect(viaTenantContext).toEqual(expectedStatements("org_1", role));
    expect(viaRls).toEqual(viaTenantContext);
  });

  it("ignores an APP_DB_ROLE that is not a bare identifier on both paths", async () => {
    process.env.APP_DB_ROLE = 'app_user"; DROP ROLE postgres; --';

    const [viaTenantContext, viaRls] = await Promise.all([
      statementsFromWithTenantContext("org_1"),
      statementsFromWithRls("org_1"),
    ]);

    expect(viaTenantContext).toEqual(expectedStatements("org_1", null));
    expect(viaRls).toEqual(viaTenantContext);
  });

  it("binds tenantId as a parameter on both paths", async () => {
    const hostile = "org_1'; SELECT set_config('app.current_tenant_id', 'org_2', true); --";

    const [viaTenantContext, viaRls] = await Promise.all([
      statementsFromWithTenantContext(hostile),
      statementsFromWithRls(hostile),
    ]);

    expect(viaTenantContext).toEqual(expectedStatements(hostile, null));
    expect(viaRls).toEqual(viaTenantContext);
    expect(viaTenantContext[0]?.sql).not.toContain("org_2");
  });

  it("keeps withOrgContext as the same function as withTenantContext", () => {
    expect(withOrgContext).toBe(withTenantContext);
  });

  it("withAdminContext clears the tenant setting and never assumes APP_DB_ROLE", async () => {
    process.env.APP_DB_ROLE = PROBE_ROLE;
    const log: Statement[] = [];

    await withAdminContext(fakeInteractivePrisma(log) as never, async () => {
      log.push({ sql: MODEL_QUERY, values: [{ where: {} }] });
    });

    expect(log).toEqual(expectedStatements("", null));
  });
});
