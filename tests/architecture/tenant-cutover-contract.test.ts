import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tenant cutover contract", () => {
  it("defaults generated shared-schema RLS policies to tenant_id", async () => {
    const isolation = await readFile(
      join(process.cwd(), "packages/iam/tenant/src/isolation.ts"),
      "utf8",
    );

    expect(isolation).toContain('const DEFAULT_TENANT_COLUMN = "tenant_id";');
    expect(isolation).not.toContain('const DEFAULT_TENANT_COLUMN = "organization_id";');
  });

  it("names the tenant-scoped Prisma client boundary as tenantId", async () => {
    const client = await readFile(
      join(process.cwd(), "packages/platform/db/src/client.ts"),
      "utf8",
    );

    expect(client).toContain("export function getTenantDb(tenantId: string): PrismaClient");
    expect(client).toContain("requires a non-empty tenantId");
    expect(client).toContain("set_config('app.current_tenant_id', $" + "{tenantId}, true)");
    expect(client).not.toContain("export function getTenantDb(organizationId: string)");
    expect(client).not.toContain("requires a non-empty organizationId");
  });

  it("names the raw RLS transaction helper as tenant context", async () => {
    const rls = await readFile(join(process.cwd(), "packages/platform/db/src/rls.ts"), "utf8");

    expect(rls).toContain("export async function withTenantContext<T>");
    expect(rls).toContain("tenantId: string");
    expect(rls).toContain("set_config('app.current_tenant_id', $" + "{tenantId}, true)");
    expect(rls).not.toContain("All tenant-scoped RLS policies compare `organization_id`");
  });

  it("keeps gateway request isolation keyed by canonical tenantId", async () => {
    const [tenantContext, gatewayIndex, rateLimit, idempotency, auditMutation, usageMetering] =
      await Promise.all([
        readFile(join(process.cwd(), "backends/gateway/src/middlewares/tenantContext.ts"), "utf8"),
        readFile(join(process.cwd(), "backends/gateway/src/index.ts"), "utf8"),
        readFile(join(process.cwd(), "backends/gateway/src/middlewares/rateLimit.ts"), "utf8"),
        readFile(join(process.cwd(), "backends/gateway/src/middlewares/idempotency.ts"), "utf8"),
        readFile(join(process.cwd(), "backends/gateway/src/middlewares/auditMutation.ts"), "utf8"),
        readFile(join(process.cwd(), "backends/gateway/src/middlewares/usageMetering.ts"), "utf8"),
      ]);

    expect(tenantContext).toContain("tenantId?: string;");
    expect(tenantContext).toContain("if (!tenant.userId || !tenant.tenantId)");
    expect(tenantContext).toContain("tenantId: tenant.tenantId");
    expect(tenantContext).toContain("export async function requireTenant");
    expect(gatewayIndex).toContain("ctx.tenantId = tenant.tenantId");
    expect(gatewayIndex).toContain("captureRequestError(err, requestId, tenant?.tenantId)");
    expect(rateLimit).toContain('tenant?.tenantId || "anonymous"');
    expect(idempotency).toContain('tenant?.tenantId ?? tenant?.userId ?? "anonymous"');
    expect(auditMutation).toContain("tenant?.tenantId ? { tenantId: tenant.tenantId } : {}");
    expect(usageMetering).toContain("const tenantId = tenant?.tenantId;");
    expect(usageMetering).toContain("usage:${tenantId}:${period}:api_calls");
    expect(usageMetering).not.toContain("const orgId = tenant?.organizationId;");
  });
});
