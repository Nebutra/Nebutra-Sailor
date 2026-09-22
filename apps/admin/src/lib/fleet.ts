/**
 * Fleet inventory — the ecosystem as configuration.
 *
 * Phase 1 of the control plane renders CONFIGURATION STATE, not observed state:
 * which app is supposed to be on which host, runtime, and port. Nothing here is
 * probed. A health column that reports green because no request was made is
 * worse than no column at all, so live probing is a Phase 2 gate — see
 * docs/plans/2026-07-28-nebutra-admin-control-plane-design.md §5.1.
 *
 * The hostnames come from `brand.domains` (rebrand-safe) and the deploy targets
 * from `@nebutra/preset/deploy-target`. The PM2 process names and ports are
 * mirrored from `infra/iac/ecs/ecosystem.config.cjs`; `__tests__/fleet.test.ts`
 * fails if that file and this list drift apart.
 */

import { brand, getDocsUrl } from "@nebutra/brand";
import { type DeployTarget, resolveDeployTarget } from "@nebutra/preset/deploy-target";

/** Where a service actually runs today, per docs/DOMAINS.md production truth. */
export type FleetRuntime =
  | "fly"
  | "vercel"
  | "cloudflare-worker"
  | "ecs-pm2"
  | "sanity-hosted"
  | "unpublished";

export interface FleetServiceDefinition {
  /** Workspace package or backend directory. */
  readonly id: string;
  readonly label: string;
  /** Key in `brand.domains`, when the service owns a public hostname. */
  readonly domainKey?: keyof typeof brand.domains;
  /**
   * Public base URL for a service reachable at a *path* rather than a host of
   * its own — the docs bundle, served at `<site>/docs`. Mutually exclusive with
   * `domainKey`: giving docs a domain key is what would put it back on a
   * subdomain. `envKey` names its `ADMIN_MANIFEST_ORIGIN_*` override, since
   * there is no domain key to derive one from.
   */
  readonly baseUrl?: string;
  readonly envKey?: string;
  /** PM2 process name in infra/iac/ecs/ecosystem.config.cjs, when ECS-hosted. */
  readonly pm2Name?: string;
  readonly port?: number;
  readonly runtime: FleetRuntime;
  /**
   * Service key in `DEPLOYABLE_SERVICES`. Absent for services that are not
   * target-switchable (the permanent OIDC issuer, Sanity-hosted Studio).
   */
  readonly deployService?: string;
  /**
   * Path of the service's `HealthCheckResult` endpoint (`@nebutra/health`),
   * probed by the Fleet page. `null` means the service has no health endpoint
   * and the UI must say so rather than render a green dot.
   */
  readonly health: string | null;
  /**
   * Path of the product's admin manifest (`nebutra.admin/v1`). Only products
   * that own an admin domain declare one; the platform admin renders them
   * from the manifest and never imports their code.
   */
  readonly manifest?: string;
  readonly note?: string;
}

/** Every Fly-hosted Next app serves `GET /api/health` via `nextHealthRoute()`. */
export const DEFAULT_HEALTH_PATH = "/api/health";

export const FLEET: readonly FleetServiceDefinition[] = [
  {
    id: "@nebutra/landing",
    label: "Landing",
    domainKey: "landing",
    pm2Name: "landing",
    port: 3001,
    runtime: "fly",
    deployService: "landing",
    health: null,
    note: "Marketing site on the nebutra-landing Machine. ECS process is manual fallback only.",
  },
  {
    id: "@nebutra/web",
    label: "Web",
    domainKey: "app",
    pm2Name: "web",
    port: 3000,
    runtime: "fly",
    deployService: "web",
    health: DEFAULT_HEALTH_PATH,
    note: "Product dashboard on the nebutra-web Machine.",
  },
  {
    id: "@nebutra/auth-center",
    label: "Auth Center",
    domainKey: "auth",
    pm2Name: "auth-center",
    port: 3101,
    runtime: "fly",
    deployService: "auth",
    health: DEFAULT_HEALTH_PATH,
    note: "Session authority for every relying party; private origin behind the auth edge Worker.",
  },
  {
    id: "@nebutra/idp",
    label: "IdP",
    domainKey: "sso",
    pm2Name: "idp",
    port: 3100,
    runtime: "fly",
    health: DEFAULT_HEALTH_PATH,
    note: "Permanent OIDC issuer — not target-switchable.",
  },
  {
    id: "backends/gateway",
    label: "Gateway",
    domainKey: "api",
    pm2Name: "api-gateway",
    port: 3002,
    runtime: "fly",
    deployService: "gateway",
    // Hono, not Next: mounted at /misc/health. Shares status/version/timestamp
    // with HealthCheckResult but reports `dependencies` instead of `checks`.
    health: "/misc/health",
    note: "Shared API origin on the nebutra-gateway Machine; the edge Worker fronts it. Each product owns /<product>/v1/*.",
  },
  {
    id: "carina-daemon",
    label: "Carina Daemon",
    pm2Name: "carina-daemon",
    runtime: "ecs-pm2",
    health: null,
    note: "Track-B kernel on the gateway host. Socket-only; no HTTP PORT.",
  },
  {
    id: "@nebutra/router",
    label: "Router",
    domainKey: "router",
    manifest: "/.well-known/nebutra-admin.json",
    pm2Name: "router",
    port: 3106,
    runtime: "fly",
    deployService: "router",
    health: DEFAULT_HEALTH_PATH,
    note: "Model fabric edge on the nebutra-router Machine. Supply engines stay internal.",
  },
  {
    id: "@nebutra/pebble",
    label: "Pebble",
    domainKey: "pebble",
    pm2Name: "pebble",
    port: 3017,
    runtime: "fly",
    health: DEFAULT_HEALTH_PATH,
    // No deployService on purpose. pebble is not in DEPLOYABLE_SERVICES and not
    // dispatchable by name — claiming a pipeline it does not have would make
    // this inventory lie about the one thing it exists to report.
    note: "Support intake — unauthenticated by design, non-tenant tables. Ships with the Fly product edges, not by name.",
  },
  {
    id: "@nebutra/forge",
    label: "Forge",
    domainKey: "forge",
    pm2Name: "forge",
    port: 3105,
    runtime: "fly",
    deployService: "forge",
    health: DEFAULT_HEALTH_PATH,
    note: "Tool station + Agent tool API on the nebutra-forge Machine.",
  },
  {
    id: "@nebutra/forge-dns-leak",
    label: "Forge DNS Leak",
    pm2Name: "forge-dns-leak",
    runtime: "fly",
    health: null,
    note: "Authoritative leak zone on the nebutra-dns-leak Machine (dedicated IPv4). No PORT env.",
  },
  {
    id: "@nebutra/admin",
    label: "Admin",
    domainKey: "admin",
    pm2Name: "admin",
    port: 3108,
    runtime: "fly",
    deployService: "admin",
    health: DEFAULT_HEALTH_PATH,
    note: "This control plane on the nebutra-admin Machine. Staff-only, behind Cloudflare Access.",
  },
  {
    id: "@nebutra/sailor-docs",
    label: "Docs",
    // No domainKey: documentation is a path on the site that owns it. The
    // bundle is its own deployment but is reached through the landing proxy.
    baseUrl: getDocsUrl(),
    envKey: "SAILOR_DOCS",
    pm2Name: "sailor-docs",
    port: 3005,
    runtime: "fly",
    deployService: "sailor-docs",
    health: DEFAULT_HEALTH_PATH,
    note: "Reached at <site>/docs via rewrite; the bundle has no host of its own. The Cloudflare Worker is the alternate path.",
  },
  {
    id: "@nebutra/design",
    label: "Design",
    domainKey: "design",
    pm2Name: "design",
    port: 3109,
    runtime: "fly",
    deployService: "design-docs",
    health: DEFAULT_HEALTH_PATH,
    note: "Replaced design-docs at the design hostname. Deploy service id is still design-docs.",
  },
  {
    id: "@nebutra/kuanlan",
    label: "Kuanlan",
    domainKey: "kuanlan",
    pm2Name: "kuanlan",
    port: 3120,
    runtime: "fly",
    health: DEFAULT_HEALTH_PATH,
    note: "观澜. Production is the nebutra-kuanlan Machine in sin; ECS PM2 is rollback only.",
  },
  {
    id: "@nebutra/typelens",
    label: "Type Lens",
    runtime: "cloudflare-worker",
    deployService: "typelens",
    health: null,
    note: "Host not yet in the domain SSOT.",
  },
  {
    id: "@nebutra/studio",
    label: "Studio",
    domainKey: "studio",
    runtime: "sanity-hosted",
    health: null,
    note: "Canonical host is nebutra.sanity.studio.",
  },
  {
    id: "@nebutra/sleptons",
    label: "Sleptons",
    runtime: "unpublished",
    health: null,
  },
];

export interface FleetRow extends FleetServiceDefinition {
  readonly host?: string | undefined;
  /** Resolved from `DEPLOY_TARGET_*`, or null when not target-switchable. */
  readonly deployTarget: DeployTarget | null;
  /**
   * True when the configured deploy target disagrees with where the service
   * actually runs. This is the mechanism that keeps docs/DOMAINS.md honest.
   */
  readonly targetMatchesRuntime: boolean | null;
}

const RUNTIME_FOR_TARGET: Partial<Record<DeployTarget, FleetRuntime>> = {
  fly: "fly",
  vercel: "vercel",
  "vercel-functions": "vercel",
  "cloudflare-workers": "cloudflare-worker",
  "cloudflare-pages": "cloudflare-worker",
  standalone: "ecs-pm2",
  "ecs-docker": "ecs-pm2",
};

export function buildFleet(env: Record<string, string | undefined> = process.env): FleetRow[] {
  return FLEET.map((service) => {
    const deployTarget = service.deployService
      ? resolveDeployTarget(service.deployService, env)
      : null;
    const expectedRuntime = deployTarget ? RUNTIME_FOR_TARGET[deployTarget] : undefined;

    return {
      ...service,
      host: service.domainKey ? brand.domains[service.domainKey] : undefined,
      deployTarget,
      targetMatchesRuntime: expectedRuntime ? expectedRuntime === service.runtime : null,
    };
  });
}

/** Hostnames in the domain SSOT that no fleet service claims. */
export function unclaimedHosts(): string[] {
  const claimed = new Set(FLEET.map((s) => s.domainKey).filter(Boolean));
  return Object.entries(brand.domains)
    .filter(([key]) => !claimed.has(key as keyof typeof brand.domains))
    .map(([, host]) => host);
}
