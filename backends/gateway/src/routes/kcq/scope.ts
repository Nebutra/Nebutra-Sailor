/** Resolve identity with Nebutra auth; client workspace IDs require live membership. */
import { createAuth } from "@nebutra/auth/server";
import { getSystemDb } from "@nebutra/db";
import { PersonalTenantRepository } from "@nebutra/repositories";
import { MarketSourceError } from "./twelve-data.js";

export interface MarketScope {
  tenantId: string;
  canManage: boolean;
}
export async function resolveMarketScope(request: Request): Promise<MarketScope | null> {
  const auth = await createAuth({ provider: "better-auth" });
  const session = await auth.getSession(request);
  if (!session?.userId || session.expiresAt.getTime() <= Date.now()) return null;
  const workspace = request.headers.get("X-KCQ-Workspace");
  if (!workspace || workspace.length > 160) throw new MarketSourceError(400, "请指定当前工作区。");
  // AUDIT(no-tenant): identity and membership bootstrap determine the tenant; market rows never use this client.
  const system = getSystemDb();
  if (workspace === "personal") {
    return {
      tenantId: await new PersonalTenantRepository(system).ensure({
        userId: session.userId,
        email: session.email ?? null,
      }),
      canManage: true,
    };
  }
  const member = await system.bAMember.findUnique({
    where: { userId_organizationId: { userId: session.userId, organizationId: workspace } },
    include: { organization: true },
  });
  if (!member) throw new MarketSourceError(403, "当前工作区已不可访问。");
  const canManage = member.role.split(",").some((role) => ["owner", "admin"].includes(role.trim()));
  let tenant = await system.tenant.findUnique({
    where: { organizationId: workspace },
    select: { id: true },
  });
  if (!tenant) {
    if (!canManage) throw new MarketSourceError(403, "请由工作区管理员初始化数据源。");
    // AUDIT(no-tenant): a verified owner/admin bootstraps the canonical business organization and tenant.
    await system.organization.upsert({
      where: { id: workspace },
      create: {
        id: workspace,
        clerkId: `better-auth:${workspace}`,
        name: member.organization.name,
        slug: `kcq-${workspace}`,
      },
      update: {},
    });
    tenant = await system.tenant.upsert({
      where: { organizationId: workspace },
      create: { kind: "ORGANIZATION", organizationId: workspace },
      update: {},
      select: { id: true },
    });
  }
  return { tenantId: tenant.id, canManage };
}
