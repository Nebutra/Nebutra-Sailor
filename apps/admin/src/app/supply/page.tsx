import { brand } from "@nebutra/brand/metadata";
import { type AdminManifest, roleAtLeast } from "@nebutra/contracts/admin";
import { ActionButton } from "@/components/action-button";
import { PageTitle, Panel } from "@/components/panel";
import { ResourceTable } from "@/components/resource-table";
import { SignalStrip } from "@/components/signal-strip";
import { ContractError, loadManifest } from "@/lib/contract-client";
import { requireStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supply" };

const ROUTER = "@nebutra/router";

/**
 * Supply — rendered from the router's manifest. This page knows nothing about
 * CLIProxyAPI or New-API; it draws whatever the product's supply domain
 * declares. The only product-specific thing here is the slot link, and even
 * that comes from the manifest.
 */
export default async function SupplyPage() {
  const staff = await requireStaff();
  const caller = { userId: staff.userId, role: staff.role };

  let manifest: AdminManifest | null = null;
  let loadError: { code: string; message: string } | null = null;
  try {
    manifest = await loadManifest(ROUTER);
  } catch (e) {
    loadError =
      e instanceof ContractError
        ? { code: e.code, message: e.message }
        : { code: "internal", message: e instanceof Error ? e.message : "failed" };
  }
  const domain = manifest?.domains.find((d) => d.id === "supply") ?? null;

  if (!manifest || !domain) {
    return (
      <>
        <PageTitle title="Supply" />
        <Panel title="Router manifest">
          <p className="px-4 py-4 text-[hsl(var(--destructive-strong))] text-sm">
            {loadError ? (
              <>
                <span className="font-mono text-xs">{loadError.code}</span> · {loadError.message}
              </>
            ) : (
              "The router manifest declares no supply domain."
            )}
          </p>
        </Panel>
      </>
    );
  }

  const allowed = (role: Parameters<typeof roleAtLeast>[1]) => roleAtLeast(staff.role, role);
  const domainActions = domain.actions.filter((a) => !a.resource && allowed(a.role));
  const actionsById = new Map(domain.actions.map((a) => [a.id, a]));

  return (
    <>
      <PageTitle
        title="Supply"
        subtitle={`API-key 渠道和账号号池都在 New-API 后面汇成一条 ${brand.domains.router}/v1。`}
        actions={
          <>
            {domain.slot ? (
              <a
                href="/management.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 font-medium text-sm hover:bg-muted"
              >
                打开号池管理台
              </a>
            ) : null}
            {domainActions.map((action) => (
              <ActionButton
                key={action.id}
                serviceId={ROUTER}
                actionId={action.id}
                verb={action.verb}
                description={action.description}
                destructive={action.destructive}
                variant="ink"
                className="h-8 text-sm"
              />
            ))}
          </>
        }
      />

      <SignalStrip manifest={manifest} domain={domain} caller={caller} />

      {domain.resources.map((resource) => {
        const resourceActions = [
          ...resource.actions,
          ...domain.actions.filter((a) => a.resource === resource.id).map((a) => a.id),
        ]
          .filter((id, i, all) => all.indexOf(id) === i)
          .map((id) => actionsById.get(id))
          .filter((a): a is NonNullable<typeof a> => !!a && allowed(a.role));
        return (
          <Panel
            key={resource.id}
            title={resource.label}
            aside={resourceActions.map((action) => (
              <ActionButton
                key={action.id}
                serviceId={ROUTER}
                actionId={action.id}
                verb={action.verb}
                description={action.description}
                destructive={action.destructive}
                variant={action.destructive ? "outline" : "ink"}
              />
            ))}
          >
            <ResourceTable manifest={manifest} resource={resource} caller={caller} />
          </Panel>
        );
      })}

      {domain.slot ? (
        <p className="text-muted-foreground text-xs leading-4">
          号池登录：管理台里选 OAuth 登录（Codex 用设备码；Google / Claude
          给一个链接），在本机浏览器授权，把 localhost 回调 URL 贴回管理台。账号入池后点 Sync
          channel，New-API 渠道的模型列表跟着更新。
        </p>
      ) : null}
    </>
  );
}
