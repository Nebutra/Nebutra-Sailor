export const TARGETS_BY_SURFACE = {
  frontend: ["vercel", "standalone", "cloudflare-pages", "railway"],
  edgeGateway: [
    "cloudflare-workers",
    "vercel-functions",
    "ecs-docker",
    "k8s",
    "aws",
    "gcp",
    "railway",
  ],
  originBackend: ["ecs-docker", "k8s", "aws", "gcp", "railway"],
} as const;

export type DeploySurface = keyof typeof TARGETS_BY_SURFACE;
export type FrontendDeployTarget = (typeof TARGETS_BY_SURFACE.frontend)[number];
export type EdgeGatewayDeployTarget = (typeof TARGETS_BY_SURFACE.edgeGateway)[number];
export type OriginBackendDeployTarget = (typeof TARGETS_BY_SURFACE.originBackend)[number];
export type DeployTarget =
  | FrontendDeployTarget
  | EdgeGatewayDeployTarget
  | OriginBackendDeployTarget;

export const DEPLOYABLE_SERVICES = [
  "web",
  "landing-page",
  "design-docs",
  "sailor-docs",
  "gateway",
  "python-ai",
] as const;

export type DeployableService = (typeof DEPLOYABLE_SERVICES)[number];

const SERVICE_SURFACES = {
  web: "frontend",
  "landing-page": "frontend",
  "design-docs": "frontend",
  "sailor-docs": "frontend",
  gateway: "edgeGateway",
  "python-ai": "originBackend",
} as const satisfies Record<DeployableService, DeploySurface>;

const DEFAULT_TARGET_BY_SURFACE = {
  frontend: "vercel",
  edgeGateway: "cloudflare-workers",
  originBackend: "ecs-docker",
} as const satisfies {
  [Surface in DeploySurface]: (typeof TARGETS_BY_SURFACE)[Surface][number];
};

export type DeployTargetMap = Record<DeployableService, DeployTarget>;
export type DeployTargetOverrides = Partial<Record<DeployableService, DeployTarget>>;
export type DeployTargetEnv = Record<string, string | undefined>;

export function isDeployableService(service: string): service is DeployableService {
  return DEPLOYABLE_SERVICES.includes(service as DeployableService);
}

function assertDeployableService(service: string): asserts service is DeployableService {
  if (!isDeployableService(service)) {
    throw new Error(
      `Unknown deploy service '${service}'. Deploy targets apply only to apps/backends, not packages.`,
    );
  }
}

export function deployTargetEnvKey(service: string): string {
  assertDeployableService(service);
  return `DEPLOY_TARGET_${service.toUpperCase().replace(/-/g, "_")}`;
}

export function getDeploySurface(service: string): DeploySurface {
  assertDeployableService(service);
  return SERVICE_SURFACES[service];
}

export function getDefaultDeployTarget(service: string): DeployTarget {
  const surface = getDeploySurface(service);
  return DEFAULT_TARGET_BY_SURFACE[surface];
}

export function getDefaultDeployTargets(): DeployTargetMap {
  return Object.fromEntries(
    DEPLOYABLE_SERVICES.map((service) => [service, getDefaultDeployTarget(service)]),
  ) as DeployTargetMap;
}

export function resolveDeployTarget(service: string, env: DeployTargetEnv): DeployTarget {
  const surface = getDeploySurface(service);
  const value = env[deployTargetEnvKey(service)] ?? getDefaultDeployTarget(service);
  const allowed = TARGETS_BY_SURFACE[surface] as readonly string[];

  if (!allowed.includes(value)) {
    throw new Error(
      `Deploy target '${value}' is not allowed for service '${service}' (${surface}). Allowed targets: ${allowed.join(
        ", ",
      )}.`,
    );
  }

  return value as DeployTarget;
}

export function resolveDeployTargets(env: DeployTargetEnv): DeployTargetMap {
  return Object.fromEntries(
    DEPLOYABLE_SERVICES.map((service) => [service, resolveDeployTarget(service, env)]),
  ) as DeployTargetMap;
}

export function resolveDeployTargetConfig(
  overrides: Record<string, string | undefined>,
): DeployTargetMap {
  const env: DeployTargetEnv = {};

  for (const [service, target] of Object.entries(overrides)) {
    env[deployTargetEnvKey(service)] = target;
  }

  return resolveDeployTargets(env);
}
