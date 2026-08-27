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

import { brand } from "@nebutra/brand";
import { type DeployTarget, resolveDeployTarget } from "@nebutra/preset/deploy-target";

/** Where a service actually runs today, per docs/DOMAINS.md production truth. */
export type FleetRuntime =
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
  /** PM2 process name in infra/iac/ecs/ecosystem.config.cjs, when ECS-hosted. */
  readonly pm2Name?: string;
  readonly port?: number;
  readonly runtime: FleetRuntime;
  /**
   * Service key in `DEPLOYABLE_SERVICES`. Absent for services that are not
   * target-switchable (the permanent OIDC issuer, Sanity-hosted Studio).
   */
  readonly deployService?: string;
  readonly note?: string;
}

export const FLEET: readonly FleetServiceDefinition[] = [
  {
    id: "@nebutra/landing",
    label: "Landing",
    domainKey: "landing",
    pm2Name: "landing",
    port: 3001,
    runtime: "vercel",
    deployService: "landing",
    note: "Marketing site. ECS process exists as manual fallback only.",
  },
  {
    id: "@nebutra/web",
    label: "Web",
    domainKey: "app",
    pm2Name: "web",
    port: 3000,
    runtime: "ecs-pm2",
    deployService: "web",
    note: "Product dashboard. Vercel project ready; DNS still ECS.",
  },
  {
    id: "@nebutra/auth-center",
    label: "Auth Center",
    domainKey: "auth",
    pm2Name: "auth-center",
    port: 3101,
    runtime: "ecs-pm2",
    deployService: "auth",
    note: "Session authority for every relying party.",
  },
  {
    id: "@nebutra/idp",
    label: "IdP",
    domainKey: "sso",
    pm2Name: "idp",
    port: 3100,
    runtime: "ecs-pm2",
    note: "Permanent OIDC issuer — not target-switchable.",
  },
  {
    id: "backends/gateway",
    label: "Gateway",
    domainKey: "api",
    pm2Name: "api-gateway",
    port: 3002,
    runtime: "ecs-pm2",
    deployService: "gateway",
    note: "Shared API. Each product owns /<product>/v1/*.",
  },
  {
    id: "carina-daemon",
    label: "Carina Daemon",
    pm2Name: "carina-daemon",
    runtime: "ecs-pm2",
    note: "Track-B kernel on the gateway host. Socket-only; no HTTP PORT.",
  },
  {
    id: "@nebutra/router",
    label: "Router",
    domainKey: "router",
    pm2Name: "router",
    port: 3106,
    runtime: "ecs-pm2",
    deployService: "router",
    note: "Model fabric edge. Supply engines stay internal.",
  },
  {
    id: "@nebutra/pebble",
    label: "Pebble",
    domainKey: "pebble",
    pm2Name: "pebble",
    port: 3017,
    runtime: "ecs-pm2",
    // No deployService on purpose. pebble runs under PM2 and the smoke step
    // references it, but it is not in DEPLOYABLE_SERVICES and not dispatchable
    // by name — claiming a pipeline it does not have would make this inventory
    // lie about the one thing it exists to report.
    note: "Support intake — unauthenticated by design, non-tenant tables. No deploy pipeline yet.",
  },
  {
    id: "@nebutra/forge",
    label: "Forge",
    domainKey: "forge",
    pm2Name: "forge",
    port: 3105,
    runtime: "ecs-pm2",
    deployService: "forge",
    note: "Tool station + Agent tool API.",
  },
  {
    id: "@nebutra/forge-dns-leak",
    label: "Forge DNS Leak",
    pm2Name: "forge-dns-leak",
    runtime: "ecs-pm2",
    note: "Authoritative leak zone + localhost control API :3953. No PORT env.",
  },
  {
    id: "@nebutra/admin",
    label: "Admin",
    domainKey: "admin",
    pm2Name: "admin",
    port: 3108,
    runtime: "ecs-pm2",
    deployService: "admin",
    note: "This control plane. Staff-only, behind Cloudflare Access.",
  },
  {
    id: "@nebutra/sailor-docs",
    label: "Docs",
    domainKey: "docs",
    pm2Name: "sailor-docs",
    port: 3005,
    runtime: "cloudflare-worker",
    deployService: "sailor-docs",
    note: "OpenNext Worker preferred; ECS is emergency-only.",
  },
  {
    id: "@nebutra/design",
    label: "Design",
    domainKey: "design",
    pm2Name: "design",
    port: 3109,
    runtime: "ecs-pm2",
    deployService: "design-docs",
    note: "Replaced design-docs at design.nebutra.com. Deploy service id is still design-docs.",
  },
  {
    id: "@nebutra/typelens",
    label: "Type Lens",
    runtime: "vercel",
    deployService: "typelens",
    note: "Host not yet in the domain SSOT.",
  },
  {
    id: "@nebutra/studio",
    label: "Studio",
    domainKey: "studio",
    runtime: "sanity-hosted",
    note: "Canonical host is nebutra.sanity.studio.",
  },
  {
    id: "@nebutra/sleptons",
    label: "Sleptons",
    runtime: "unpublished",
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
  vercel: "vercel",
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
