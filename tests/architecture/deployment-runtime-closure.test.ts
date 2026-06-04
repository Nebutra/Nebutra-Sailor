import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEPLOYABLE_SERVICES,
  deployTargetEnvKey,
  getDefaultDeployTargets,
  resolveDeployTarget,
  TARGETS_BY_SURFACE,
} from "../../packages/ops/preset/src/deploy-target";

const ROOT = process.cwd();
const ADR_PATH = resolve(ROOT, "docs/architecture/2026-06-04-production-runtime-closure.md");
const GATEWAY_INDEX_PATH = resolve(ROOT, "backends/gateway/src/index.ts");
const GATEWAY_NODE_PATH = resolve(ROOT, "backends/gateway/src/node.ts");
const GATEWAY_WORKER_PATH = resolve(ROOT, "backends/gateway/src/worker.ts");
const GATEWAY_WRANGLER_PATH = resolve(ROOT, "backends/gateway/wrangler.toml");
const GATEWAY_AI_ROUTES_PATH = resolve(ROOT, "backends/gateway/src/routes/ai/index.ts");
const GATEWAY_AI_ORIGIN_HEADERS_PATH = resolve(
  ROOT,
  "backends/gateway/src/routes/ai/origin-headers.ts",
);
const GATEWAY_TASK_ROUTES_PATH = resolve(ROOT, "backends/gateway/src/routes/tasks/index.ts");
const GATEWAY_UPLOAD_ROUTES_PATH = resolve(ROOT, "backends/gateway/src/routes/uploads/index.ts");
const PYTHON_AI_MAIN_PATH = resolve(ROOT, "backends/python/ai/app/main.py");
const PYTHON_AI_TASK_ROUTES_PATH = resolve(ROOT, "backends/python/ai/app/api/v1/routes_tasks.py");
const PYTHON_AI_UPLOAD_ROUTES_PATH = resolve(
  ROOT,
  "backends/python/ai/app/api/v1/routes_uploads.py",
);
const PYTHON_AI_TASK_DISPATCHER_PATH = resolve(ROOT, "backends/python/ai/app/tasks/dispatcher.py");
const DB_SCHEMA_PATH = resolve(ROOT, "packages/platform/db/prisma/schema.prisma");
const TASK_MIGRATION_PATH = resolve(
  ROOT,
  "packages/platform/db/prisma/migrations/20260604010000_add_task_envelope/migration.sql",
);
const UPLOAD_MIGRATION_PATH = resolve(
  ROOT,
  "packages/platform/db/prisma/migrations/20260604020000_add_upload_records/migration.sql",
);
const DEPLOY_GATEWAY_WORKFLOW_PATH = resolve(ROOT, ".github/workflows/deploy-gateway.yml");
const DEPLOY_ORIGIN_ECS_WORKFLOW_PATH = resolve(ROOT, ".github/workflows/deploy-origin-ecs.yml");
const ORIGIN_COMPOSE_PATH = resolve(ROOT, "infra/runtime/docker/docker-compose.origin.yml");

describe("production runtime closure", () => {
  it("defaults to the recommended Worker Gateway + ECS Origin topology without locking providers", () => {
    expect(getDefaultDeployTargets()).toMatchObject({
      web: "vercel",
      "landing-page": "vercel",
      gateway: "cloudflare-workers",
      "python-ai": "ecs-docker",
    });

    expect(TARGETS_BY_SURFACE.edgeGateway).toEqual(
      expect.arrayContaining([
        "cloudflare-workers",
        "vercel-functions",
        "ecs-docker",
        "k8s",
        "aws",
        "railway",
      ]),
    );
    expect(TARGETS_BY_SURFACE.frontend).toEqual(
      expect.arrayContaining(["vercel", "standalone", "cloudflare-pages", "railway"]),
    );
    expect(TARGETS_BY_SURFACE.originBackend).toEqual(["ecs-docker", "k8s", "aws", "railway"]);
  });

  it("keeps deploy targets scoped to apps and deployable backends, not domain packages", () => {
    expect(DEPLOYABLE_SERVICES).not.toContain("@nebutra/db");
    expect(DEPLOYABLE_SERVICES).not.toContain("packages/platform/db");
    expect(() => resolveDeployTarget("@nebutra/cache", {})).toThrow(/Unknown deploy service/);
  });

  it("uses per-service selector keys so one service can switch providers without moving the whole stack", () => {
    expect(deployTargetEnvKey("gateway")).toBe("DEPLOY_TARGET_GATEWAY");
    expect(deployTargetEnvKey("python-ai")).toBe("DEPLOY_TARGET_PYTHON_AI");
    expect(resolveDeployTarget("gateway", { DEPLOY_TARGET_GATEWAY: "k8s" })).toBe("k8s");
    expect(resolveDeployTarget("python-ai", { DEPLOY_TARGET_PYTHON_AI: "aws" })).toBe("aws");
  });

  it("records the deployment closure ADR with defaults, switchability, and non-deploying packages", () => {
    expect(existsSync(ADR_PATH), `${ADR_PATH} must exist`).toBe(true);
    const adr = readFileSync(ADR_PATH, "utf8");

    expect(adr).toContain("Cloudflare Workers");
    expect(adr).toContain("ECS Origin");
    expect(adr).toContain("provider-switchable");
    expect(adr).toContain("DEPLOY_TARGET_GATEWAY");
    expect(adr).toContain("packages do not deploy");
  });

  it("keeps the gateway Hono app importable by Workers without starting the Node server", () => {
    const index = readFileSync(GATEWAY_INDEX_PATH, "utf8");
    expect(index).not.toContain("@hono/node-server");
    expect(index).not.toContain("serve({");
    expect(index).not.toContain('process.on("SIGTERM"');
    expect(index).toContain("export default app");

    expect(existsSync(GATEWAY_NODE_PATH), `${GATEWAY_NODE_PATH} must exist`).toBe(true);
    const nodeEntry = readFileSync(GATEWAY_NODE_PATH, "utf8");
    expect(nodeEntry).toContain("@hono/node-server");
    expect(nodeEntry).toContain("serve({ fetch: app.fetch");

    expect(existsSync(GATEWAY_WORKER_PATH), `${GATEWAY_WORKER_PATH} must exist`).toBe(true);
    const workerEntry = readFileSync(GATEWAY_WORKER_PATH, "utf8");
    expect(workerEntry).not.toContain("@hono/node-server");
    expect(workerEntry).toContain("export default");
    expect(workerEntry).toContain("fetch(request");

    expect(existsSync(GATEWAY_WRANGLER_PATH), `${GATEWAY_WRANGLER_PATH} must exist`).toBe(true);
    const wrangler = readFileSync(GATEWAY_WRANGLER_PATH, "utf8");
    expect(wrangler).toContain('main = "src/worker.ts"');
    expect(wrangler).toContain('compatibility_flags = ["nodejs_compat"]');
    expect(wrangler).toContain("[observability]");
    expect(wrangler).toContain("head_sampling_rate = 1");
  });

  it("gates the Cloudflare Workers gateway deploy behind the per-service selector", () => {
    expect(
      existsSync(DEPLOY_GATEWAY_WORKFLOW_PATH),
      `${DEPLOY_GATEWAY_WORKFLOW_PATH} must exist`,
    ).toBe(true);
    const workflow = readFileSync(DEPLOY_GATEWAY_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("DEPLOY_TARGET_GATEWAY");
    expect(workflow).toContain("cloudflare-workers");
    expect(workflow).toContain("cloudflare/wrangler-action");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN secret is not set");
    expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID secret is not set");
    expect(workflow).toContain("AI_SERVICE_URL repository variable is not set");
    expect(workflow).toContain("SERVICE_SECRET secret is not set");
    expect(workflow).toContain("GATEWAY_SHARED_SECRET secret is not set");
    expect(workflow).toContain("Prepare Worker runtime bindings");
    expect(workflow).toContain("Sync Worker runtime bindings");
    expect(workflow).toContain("secret bulk .wrangler-secrets.json --config wrangler.toml");
    expect(workflow).toContain("backends/gateway");
    expect(workflow).not.toContain("DEPLOY_TARGET == '");
  });

  it("forwards request correlation headers from the Worker gateway to ECS origin", () => {
    const routes = readFileSync(GATEWAY_AI_ROUTES_PATH, "utf8");
    const headers = readFileSync(GATEWAY_AI_ORIGIN_HEADERS_PATH, "utf8");

    expect(headers).toContain("x-nebutra-request-id");
    expect(headers).toContain("x-request-id");
    expect(headers).toContain("x-nebutra-client-ip");
    expect(headers).toContain("signServiceToken");
    expect(headers).toContain("x-service-token");
    expect(headers).toContain("x-organization-id");
    expect(routes).toContain('requestId: c.get("requestId")');
    expect(routes).toContain("resolveAiOriginClientIp(c.req.raw.headers)");
  });

  it("exposes the standard task envelope through the Worker gateway only as an origin proxy", () => {
    expect(existsSync(GATEWAY_TASK_ROUTES_PATH), `${GATEWAY_TASK_ROUTES_PATH} must exist`).toBe(
      true,
    );
    const index = readFileSync(GATEWAY_INDEX_PATH, "utf8");
    const routes = readFileSync(GATEWAY_TASK_ROUTES_PATH, "utf8");

    expect(index).toContain('app.route("/api/v1/tasks", taskRoutes)');
    expect(routes).toContain("/api/v1/tasks/");
    expect(routes).toContain("/{taskId}/events");
    expect(routes).toContain("/{taskId}/cancel");
    expect(routes).toContain("buildAuthenticatedAiOriginHeaders");
    expect(routes).not.toContain("CELERY_BROKER_URL");
    expect(routes).not.toContain("QSTASH_TOKEN");
    expect(routes).not.toContain("REDIS_URL");
  });

  it("gates the ECS origin deploy behind the python-ai per-service selector", () => {
    expect(
      existsSync(DEPLOY_ORIGIN_ECS_WORKFLOW_PATH),
      `${DEPLOY_ORIGIN_ECS_WORKFLOW_PATH} must exist`,
    ).toBe(true);
    const workflow = readFileSync(DEPLOY_ORIGIN_ECS_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("DEPLOY_TARGET_PYTHON_AI");
    expect(workflow).toContain("ecs-docker");
    expect(workflow).toContain("docker compose");
    expect(workflow).toContain("docker-compose.origin.yml");
    expect(workflow).toContain("CELERY_BROKER_URL");
    expect(workflow).toContain("TASK_STORE_PROVIDER");
    expect(workflow).toContain("TASK_DISPATCHER_PROVIDER");
    expect(workflow).toContain("UPLOAD_STORE_PROVIDER");
    expect(workflow).toContain("UPLOAD_STORAGE_PROVIDER must be r2, s3, or oss for ECS origin");
    expect(workflow).toContain("R2_ACCESS_KEY_ID secret is required for R2 uploads");
    expect(workflow).toContain("OSS_ACCESS_KEY_SECRET secret is required for OSS uploads");
    expect(workflow).toContain(
      "SUPABASE_DATABASE_URL or DATABASE_URL secret is required for persistent origin tasks",
    );
    expect(workflow).toContain(
      "docker compose -f docker-compose.origin.yml up -d ai-origin ai-worker",
    );
    expect(workflow).toContain(
      "docker compose -f docker-compose.origin.yml ps ai-origin ai-worker",
    );
    expect(workflow).toContain("backends/python/ai");
    expect(workflow).not.toContain("backends/gateway");
    expect(workflow).not.toContain("DEPLOY_TARGET_GATEWAY");
  });

  it("defines an ECS origin compose manifest for the FastAPI python-ai service", () => {
    expect(existsSync(ORIGIN_COMPOSE_PATH), `${ORIGIN_COMPOSE_PATH} must exist`).toBe(true);
    const compose = readFileSync(ORIGIN_COMPOSE_PATH, "utf8");

    expect(compose).toContain("ai-origin");
    expect(compose).toContain("ai-worker");
    expect(compose).toContain("ai-beat");
    expect(compose).toContain("nebutra-ai");
    expect(compose).toContain("GATEWAY_SHARED_SECRET");
    expect(compose).toContain("uvicorn app.main:app --host 0.0.0.0 --port 8000");
    expect(compose).toContain("celery -A app.workers.celery_app");
    expect(compose).toContain("--concurrency=$${CELERY_WORKER_CONCURRENCY:-1}");
    expect(compose).toContain("--prefetch-multiplier=$${CELERY_PREFETCH_MULTIPLIER:-1}");
    expect(compose).toContain("8000:8000");
    expect(compose).not.toContain("api-gateway");
    expect(compose).not.toContain("landing-page");
  });

  it("documents the Celery origin runtime in the Python AI env example", () => {
    const envExample = readFileSync(resolve(ROOT, "backends/python/ai/.env.example"), "utf8");

    expect(envExample).toContain("CELERY_BROKER_URL=");
    expect(envExample).toContain("CELERY_RESULT_BACKEND=");
    expect(envExample).toContain("CELERY_TASK_DEFAULT_QUEUE=default");
    expect(envExample).toContain("CELERY_WORKER_CONCURRENCY=1");
    expect(envExample).toContain("CELERY_PREFETCH_MULTIPLIER=1");
  });

  it("persists long-running origin work behind a standard task envelope", () => {
    expect(existsSync(TASK_MIGRATION_PATH), `${TASK_MIGRATION_PATH} must exist`).toBe(true);
    expect(existsSync(PYTHON_AI_TASK_ROUTES_PATH), `${PYTHON_AI_TASK_ROUTES_PATH} must exist`).toBe(
      true,
    );

    const schema = readFileSync(DB_SCHEMA_PATH, "utf8");
    const migration = readFileSync(TASK_MIGRATION_PATH, "utf8");
    const main = readFileSync(PYTHON_AI_MAIN_PATH, "utf8");
    const routes = readFileSync(PYTHON_AI_TASK_ROUTES_PATH, "utf8");

    expect(schema).toContain("enum TaskStatus");
    expect(schema).toContain("model Task");
    expect(schema).toContain('@@map("tasks")');
    expect(migration).toContain('CREATE TABLE "public"."tasks"');
    expect(migration).toContain("tasks_tenant_id_idempotency_key_key");
    expect(main).toContain("routes_tasks");
    expect(main).toContain('prefix="/api/v1/tasks"');
    expect(routes).toContain("TaskEnvelope");
    expect(routes).toContain("StreamingResponse");
  });

  it("keeps task dispatch provider-switchable instead of exposing Celery as the product API", () => {
    expect(
      existsSync(PYTHON_AI_TASK_DISPATCHER_PATH),
      `${PYTHON_AI_TASK_DISPATCHER_PATH} must exist`,
    ).toBe(true);
    const dispatcher = readFileSync(PYTHON_AI_TASK_DISPATCHER_PATH, "utf8");
    const routes = readFileSync(PYTHON_AI_TASK_ROUTES_PATH, "utf8");

    expect(dispatcher).toContain("TASK_DISPATCHER_PROVIDER");
    expect(dispatcher).toContain('provider == "celery"');
    expect(dispatcher).toContain('provider == "queue"');
    expect(dispatcher).toContain('provider == "memory"');
    expect(routes).not.toContain("CELERY_BROKER_URL");
    expect(routes).not.toContain("QSTASH_TOKEN");
    expect(routes).not.toContain("REDIS_URL");
  });

  it("keeps uploads as direct object-storage metadata instead of ECS file ingress", () => {
    expect(existsSync(UPLOAD_MIGRATION_PATH), `${UPLOAD_MIGRATION_PATH} must exist`).toBe(true);
    expect(
      existsSync(PYTHON_AI_UPLOAD_ROUTES_PATH),
      `${PYTHON_AI_UPLOAD_ROUTES_PATH} must exist`,
    ).toBe(true);
    expect(existsSync(GATEWAY_UPLOAD_ROUTES_PATH), `${GATEWAY_UPLOAD_ROUTES_PATH} must exist`).toBe(
      true,
    );

    const schema = readFileSync(DB_SCHEMA_PATH, "utf8");
    const migration = readFileSync(UPLOAD_MIGRATION_PATH, "utf8");
    const main = readFileSync(PYTHON_AI_MAIN_PATH, "utf8");
    const originRoutes = readFileSync(PYTHON_AI_UPLOAD_ROUTES_PATH, "utf8");
    const gatewayIndex = readFileSync(GATEWAY_INDEX_PATH, "utf8");
    const gatewayRoutes = readFileSync(GATEWAY_UPLOAD_ROUTES_PATH, "utf8");

    expect(schema).toContain("enum UploadStatus");
    expect(schema).toContain("model UploadRecord");
    expect(migration).toContain('CREATE TABLE "public"."uploads"');
    expect(main).toContain("routes_uploads");
    expect(main).toContain('prefix="/api/v1/uploads"');
    expect(originRoutes).toContain("/presign");
    expect(originRoutes).toContain("/complete");
    expect(originRoutes).toContain("resolve_upload_storage_provider");
    expect(originRoutes).not.toContain("UploadFile");
    expect(originRoutes).not.toContain("File(");
    expect(gatewayIndex).toContain('app.route("/api/v1/uploads", uploadRoutes)');
    expect(gatewayRoutes).toContain("/api/v1/uploads/presign");
    expect(gatewayRoutes).toContain("/api/v1/uploads/complete");
    expect(gatewayRoutes).toContain("buildAuthenticatedAiOriginHeaders");
    expect(gatewayRoutes).not.toContain("R2_ACCESS_KEY_ID");
    expect(gatewayRoutes).not.toContain("OSS_ACCESS_KEY_ID");
  });
});
