import "server-only";
import { brand } from "@nebutra/brand/metadata";
import { type AdminManifest, type ResourceList, roleAtLeast } from "@nebutra/contracts/admin";
import { ActionButton } from "@/components/admin-platform/action-button";
import { AddAccountDialog } from "@/components/admin-platform/add-account-dialog";
import { PageTitle, Panel } from "@/components/admin-platform/panel";
import { ResourceTable } from "@/components/admin-platform/resource-table";
import { SignalStrip } from "@/components/admin-platform/signal-strip";
import { ContractError, listResource, loadManifest } from "@/lib/admin-platform/contract-client";
import { needsInput } from "@/lib/admin-platform/login-flow";
import { requireStaff } from "@/lib/admin-platform/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supply · Platform" };

const ROUTER = "@nebutra/router";
/** Resources that only exist while something is in flight; hidden when empty. */
const TRANSIENT_RESOURCES = new Set(["login"]);

/**
 * Supply — ported from apps/admin's `app/supply/page.tsx`, rendered from the
 * router's manifest exactly as before.
 *
 * The "advanced" engine console link (`/management.html`, and the
 * `/v0/management/*` + `/oauth-callback` proxy behind it) is the one part of
 * apps/admin's Supply surface that did NOT move here — it is a raw streaming
 * HTTP/HTML proxy to an internal-only CLIProxyAPI host with a management key
 * injected server-side, which is a route-handler shape no matter how it's
 * framed, so per this migration's constraint (no new web/app/api route
 * handlers — that's what backends/gateway is for) it moved to
 * backends/gateway/src/routes/admin/platform-supply.ts instead. See
 * docs/architecture/2026-09-29-admin-into-web.md for the endpoint and the
 * Cloudflare Access policy it still needs on the gateway's own host/path.
 */
export default async function PlatformSupplyPage() {
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
          <p className="px-4 py-4 text-destructive-strong text-sm">
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
  const actionsById = new Map(domain.actions.map((a) => [a.id, a]));
  // Generic buttons cannot supply an input; those actions get bespoke surfaces.
  const generic = (a: NonNullable<ReturnType<typeof actionsById.get>>) =>
    allowed(a.role) && !needsInput(a);
  const domainActions = domain.actions.filter((a) => !a.resource && generic(a));
  const loginAction = actionsById.get("account.login");
  const canAddAccount = !!loginAction && allowed(loginAction.role);
  const syncAction = actionsById.get("channel.sync");
  const syncForDialog =
    syncAction && allowed(syncAction.role)
      ? { id: syncAction.id, verb: syncAction.verb, description: syncAction.description }
      : undefined;

  // Transient resources are fetched up front so an empty one renders nothing.
  const prefetched = new Map<string, ResourceList>();
  await Promise.all(
    domain.resources
      .filter((r) => TRANSIENT_RESOURCES.has(r.id))
      .map(async (r) => {
        try {
          prefetched.set(r.id, await listResource(manifest, r.list, caller));
        } catch {
          // Unreachable transient list: nothing in flight to show, and the
          // other resources will surface the failure on their own rows.
        }
      }),
  );
  const visibleResources = domain.resources.filter((r) => {
    if (!TRANSIENT_RESOURCES.has(r.id)) return true;
    const list = prefetched.get(r.id);
    return !!list && list.total > 0;
  });

  return (
    <>
      <PageTitle
        title="Supply"
        subtitle={`API-key 渠道和账号号池都在 New-API 后面汇成一条 ${brand.domains.router}/v1。`}
        actions={
          <>
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
            {canAddAccount ? (
              <AddAccountDialog serviceId={ROUTER} syncAction={syncForDialog} />
            ) : null}
          </>
        }
      />

      <SignalStrip manifest={manifest} domain={domain} caller={caller} />

      {visibleResources.map((resource) => {
        const resourceActions = [
          ...resource.actions,
          ...domain.actions.filter((a) => a.resource === resource.id).map((a) => a.id),
        ]
          .filter((id, i, all) => all.indexOf(id) === i)
          .map((id) => actionsById.get(id))
          .filter((a): a is NonNullable<typeof a> => !!a && generic(a));
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
            <ResourceTable
              manifest={manifest}
              resource={resource}
              caller={caller}
              prefetched={prefetched.get(resource.id)}
            />
          </Panel>
        );
      })}

      {domain.slot ? (
        <p className="text-muted-foreground text-xs leading-4">
          <a
            href="/api/v1/admin/platform/supply/management.html"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            高级：引擎原生控制台
          </a>
        </p>
      ) : null}
    </>
  );
}
