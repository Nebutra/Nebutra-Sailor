import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Deploy-workflow governance.
 *
 * The target contract lives in `@nebutra/preset/deploy-target` and
 * `docs/architecture/2026-06-04-production-runtime-closure.md`: gateway defaults
 * to Cloudflare Workers but remains provider-switchable, and every adapter job
 * is gated by its own per-service `DEPLOY_TARGET_*` selector.
 *
 * Until 2026-09-02 the first test here guarded the Kubernetes deployer
 * (`deploy.yml`: kustomize + kubectl, auto-triggered by `docker-build-push.yml`
 * and gated on the global `vars.DEPLOY_TARGET == 'k8s'`). Neither workflow had
 * run in five months and both were retired; `infra/iac/k8s/` stays on disk as
 * an experimental implementation. The guard is now the negative: no workflow
 * may deploy to Kubernetes on an automatic trigger, and the retired global gate
 * may not come back. A `workflow_dispatch`-only k8s job would still pass — that
 * is an operator decision, not a double-deploy.
 *
 * The retirement also orphaned `deploy-origin-ecs.yml`, whose `workflow_run`
 * trigger named "Docker Build & Push" — GitHub never fires a `workflow_run` for
 * a workflow that does not exist, and nothing reports it. The second test keeps
 * every `workflow_run.workflows` entry pointing at a workflow that is present.
 */

const WORKFLOWS = resolve(process.cwd(), ".github/workflows");

function read(file: string): string {
  return readFileSync(resolve(WORKFLOWS, file), "utf-8");
}

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS)
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
}

/**
 * Anything that pushes manifests or images at a Kubernetes cluster. Keys on the
 * tooling, not the target name: a `k8s` choice in a `workflow_dispatch` input
 * (deploy-origin-ecs.yml offers one) is a menu entry, not a deploy. As of
 * 2026-09-02 no workflow matches, so this scan is a tripwire for the next one;
 * the deploy.yml-absence and global-gate assertions carry the weight today.
 */
const K8S_DEPLOY = /\bkubectl\b|\bkustomize\b|infra\/iac\/k8s\//;

/**
 * Top-level trigger keys under `on:`. Handles the block form (`on:\n  push:`)
 * and the inline forms (`on: push`, `on: [push, workflow_dispatch]`). No YAML
 * library: the workflows here are hand-written with two-space indentation, and
 * the arch tests carry no parser dependency — a key listing is not worth one.
 */
function triggers(yml: string): string[] {
  const lines = yml.split("\n");
  const start = lines.findIndex((line) => /^on:/.test(line));
  if (start === -1) return [];

  const inline = ((lines[start] as string).replace(/^on:/, "").split("#")[0] as string).trim();
  if (inline) {
    return inline
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  }

  const keys: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (/^[A-Za-z_"']/.test(line)) break; // next top-level key
    const match = /^ {2}([A-Za-z_]+):/.exec(line);
    if (match) keys.push(match[1] as string);
  }
  return keys;
}

function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

/** The `name:` a workflow registers under — what `workflow_run.workflows` matches. */
function workflowName(yml: string): string | undefined {
  const match = /^name:\s*(.+?)\s*$/m.exec(yml);
  return match ? unquote(match[1] as string) : undefined;
}

/**
 * Workflow names listed under `on.workflow_run.workflows`. Handles the inline
 * list (`workflows: ["CI"]`) and the block list (`workflows:\n      - CI`).
 */
function workflowRunTargets(yml: string): string[] {
  const lines = yml.split("\n");
  const start = lines.findIndex((line) => /^ {2}workflow_run:/.test(line));
  if (start === -1) return [];

  const names: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (line.trim() !== "" && !/^ {4}/.test(line)) break; // left the workflow_run block
    const inline = /^ {4}workflows:\s*\[(.*)\]\s*$/.exec(line);
    if (inline) {
      names.push(...(inline[1] as string).split(",").map(unquote).filter(Boolean));
      continue;
    }
    if (/^ {4}workflows:\s*$/.test(line)) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const item = /^ {6}- (.+)$/.exec(lines[j] as string);
        if (!item) break;
        names.push(unquote(item[1] as string));
      }
    }
  }
  return names;
}

describe("Deploy substrate governance", () => {
  it("no workflow deploys to Kubernetes on an automatic trigger", () => {
    // The trigger extractor must actually see something, or the loop below is
    // vacuously green.
    expect(triggers(read("deploy-web-vercel.yml"))).toContain("workflow_dispatch");
    expect(triggers(read("ci.yml")).length).toBeGreaterThan(0);

    expect(
      existsSync(resolve(WORKFLOWS, "deploy.yml")),
      "deploy.yml (kustomize + kubectl deployer) was retired on 2026-09-02; a Kubernetes path comes back as a per-service gated workflow, not under this name",
    ).toBe(false);

    const autoDeploys: string[] = [];
    const globalGate: string[] = [];
    for (const file of workflowFiles()) {
      const yml = read(file);
      if (/vars\.DEPLOY_TARGET\s*==/.test(yml)) globalGate.push(file);
      if (!K8S_DEPLOY.test(yml)) continue;
      const automatic = triggers(yml).filter((trigger) => trigger !== "workflow_dispatch");
      if (automatic.length > 0) autoDeploys.push(`${file} (${automatic.join(", ")})`);
    }

    expect(
      autoDeploys,
      `workflows that deploy to Kubernetes on an automatic trigger — gate them behind a per-service DEPLOY_TARGET_* selector or make them workflow_dispatch-only:\n${autoDeploys.join("\n")}`,
    ).toEqual([]);
    expect(
      globalGate,
      `the global vars.DEPLOY_TARGET gate was a compatibility bridge (ADR 2026-06-04) and left with deploy.yml; use the per-service DEPLOY_TARGET_* selectors:\n${globalGate.join("\n")}`,
    ).toEqual([]);
  });

  it("every workflow_run trigger names a workflow that exists", () => {
    // Non-vacuous: the extractor must see the one live workflow_run consumer,
    // and must catch the shape that went stale on 2026-09-02, when
    // deploy-origin-ecs.yml kept pointing at the retired "Docker Build & Push".
    expect(workflowRunTargets(read("deploy-gateway.yml"))).toEqual(["CI"]);
    expect(
      workflowRunTargets(
        'on:\n  workflow_dispatch:\n  workflow_run:\n    workflows: ["Docker Build & Push"]\n    branches: [main]\n\npermissions:\n',
      ),
    ).toEqual(["Docker Build & Push"]);
    expect(
      workflowRunTargets("on:\n  workflow_run:\n    workflows:\n      - CI\n      - 'Release'\n"),
    ).toEqual(["CI", "Release"]);

    const known = new Set<string>();
    for (const file of workflowFiles()) {
      // A nameless workflow is displayed under its path relative to the repo root.
      known.add(workflowName(read(file)) ?? `.github/workflows/${file}`);
    }
    expect(known).toContain("CI");
    expect(known).toContain("Deploy Cloud VM Origin");

    const dangling: string[] = [];
    for (const file of workflowFiles()) {
      for (const target of workflowRunTargets(read(file))) {
        if (!known.has(target)) dangling.push(`${file} -> "${target}"`);
      }
    }
    expect(
      dangling,
      `workflow_run triggers that name a workflow which does not exist — GitHub never fires these and never says so; drop the trigger or point it at a live workflow name:\n${dangling.join("\n")}`,
    ).toEqual([]);
  });

  it("legacy ECS PM2 workflow stays path-gated: product edges auto-push, rest manual", () => {
    const yml = read("deploy-ecs.yml");
    expect(yml).toContain("workflow_dispatch:");
    // Forge + Router product-edge auto-deploy on main is intentional
    // (see deploy-ecs.yml on.push paths). Other fleet apps stay
    // workflow_dispatch-only so path-filter entries like apps/web/**
    // (manual detect) must NOT appear under on.push.paths.
    // Comment lines count as part of the block. The previous pattern matched
    // only `- …` entries, so it stopped at the first explanatory comment inside
    // the list and captured a single path — which then failed to contain forge
    // while forge was sitting three lines below it.
    const pushPaths = yml.match(
      /\n\s+push:\n\s+branches:\s*\[main\]\n\s+paths:\n((?:\s+(?:-|#)[^\n]+\n)+)/,
    )?.[1];
    expect(pushPaths, "deploy-ecs.yml must define on.push.paths for main").toBeTruthy();
    expect(pushPaths).toContain("apps/forge/**");
    expect(pushPaths).toContain("apps/router/**");
    expect(pushPaths).not.toContain("apps/web/**");
    expect(pushPaths).not.toContain("apps/landing/**");
  });

  it("legacy ECS PM2 workflow still detects gateway source changes for manual fallback deploys", () => {
    const yml = read("deploy-ecs.yml");
    expect(yml).toContain("backends/gateway/**");
    expect(yml).toContain("pnpm --filter @nebutra/gateway build");
    expect(yml).toContain("https://api.nebutra.com/api/misc/health");
  });

  it("legacy ECS PM2 workflow emits deployment.verified only after public smoke tests pass", () => {
    const yml = read("deploy-ecs.yml");
    const smokeIndex = yml.indexOf("Smoke test public endpoints");
    const emitIndex = yml.indexOf("Emit deployment verification analytics");

    expect(smokeIndex).toBeGreaterThan(0);
    expect(emitIndex).toBeGreaterThan(smokeIndex);
    expect(yml).toContain('event: "deployment.verified"');
    expect(yml).toContain("POSTHOG_KEY");
    expect(yml).toContain("smoke_status");
  });

  it("legacy ECS landing smoke covers the paid-wall path and avoids stale referral URLs", () => {
    const yml = read("deploy-ecs.yml");

    expect(yml).toContain("landing-license");
    expect(yml).toContain("https://nebutra.com/get-license");
    expect(yml).not.toContain("https://nebutra.com/refer?code=smoke");
  });

  it("legacy ECS workflow no longer claims to be the default-active backend substrate", () => {
    const yml = read("deploy-ecs.yml");

    expect(yml).not.toContain("DEFAULT-ACTIVE");
    expect(yml).not.toContain("vars.DEPLOY_TARGET == 'ecs");
  });

  it("legacy ECS workflow packages apps/web as Next standalone so desktop OAuth route handlers survive fallback deploys", () => {
    const yml = read("deploy-ecs.yml");
    const webPackage = readFileSync(resolve(process.cwd(), "apps/web/package.json"), "utf-8");
    const pm2Config = readFileSync(
      resolve(process.cwd(), "infra/iac/ecs/ecosystem.config.cjs"),
      "utf-8",
    );
    const remote = readFileSync(
      resolve(process.cwd(), "infra/ops/scripts/ecs-deploy-remote.sh"),
      "utf-8",
    );

    // The matrix is JSON emitted by emit_next_matrix and consumed through
    // fromJson, not a static YAML `include:` list. Same facts, different shape:
    // asserting the old literals meant asserting a format the workflow stopped
    // producing when it went dynamic.
    expect(yml).toContain('"package":"@nebutra/web"');
    expect(yml).toContain('"kind":"next-standalone"');
    expect(yml).toContain('"build_command":"build:next"');
    expect(yml).toContain(
      "pnpm --filter ${" + "{ matrix.package }} ${" + "{ matrix.build_command }}",
    );
    expect(yml).toContain('cp -r "$WS/.next/standalone/." "$STAGE/"');
    expect(yml).not.toContain("ECS Vite SPA static server");
    expect(yml).toContain("web-desktop-auth-foundryoss");
    expect(yml).toContain("https://app.nebutra.com/signup/remote?scheme=foundryoss");

    expect(webPackage).toContain('"build:next"');
    expect(pm2Config).toContain('script: "apps/web/server.js"');
    expect(pm2Config).toContain(
      "$DEPLOY_ROOT/web/current/apps/web/server.js                  (Next standalone)",
    );
    expect(remote).toContain("NEXT_PUBLIC_APP_URL");
    expect(remote).toContain("BETTER_AUTH_URL");
  });

  it("does not roll back a healthy web release when the origin gateway is 502", () => {
    const yml = read("deploy-ecs.yml");
    const webSmokeStart = yml.indexOf("Multi-app RP model");
    const authSmokeStart = yml.indexOf("auth-sign-in HTML contains RSC client-proxy");

    expect(webSmokeStart).toBeGreaterThan(0);
    expect(authSmokeStart).toBeGreaterThan(webSmokeStart);

    const webSmoke = yml.slice(webSmokeStart, authSmokeStart);
    expect(webSmoke).toContain("web-sign-in");
    expect(webSmoke).toContain("web-desktop-auth-foundryoss");
    expect(webSmoke).not.toContain("/api/auth/session");
    expect(webSmoke).not.toContain("web-gateway-auth-session");
  });

  it("manual ECS shell helpers build web with build:next (not Vite turbo build)", () => {
    const lite = readFileSync(
      resolve(process.cwd(), "infra/ops/scripts/deploy-ecs-lite.sh"),
      "utf-8",
    );
    const remaining = readFileSync(
      resolve(process.cwd(), "infra/ops/scripts/deploy-remaining.sh"),
      "utf-8",
    );

    for (const script of [lite, remaining]) {
      expect(script).toContain("pnpm --filter @nebutra/web run build:next");
      expect(script).not.toMatch(/turbo build --filter=@nebutra\/web\b/);
      // Gateway is Hono/Node, not next start
      expect(script).toContain('script: "dist/node.js"');
      expect(script).not.toMatch(/name:\s*"api-gateway"[\s\S]{0,200}?node_modules\/\.bin\/next/);
    }
  });

  it("Fly origin workflow requires a token and does not cut DNS on push", () => {
    const yml = read("deploy-fly.yml");
    expect(yml).toContain("FLY_API_TOKEN");
    expect(yml).toContain("Set repository secret FLY_API_TOKEN");
    expect(yml).toContain("$GITHUB_WORKSPACE/infra/fly/${" + "{ matrix.app }}.toml");
    expect(yml).toContain("point-host-dns-fly.sh");
    expect(yml).toContain("github.event.inputs.cutover == 'true'");
    expect(yml).toContain("uses: ./.github/actions/setup-node-pnpm");
    expect(yml).toContain('pnpm turbo build --filter="${' + '{ matrix.package }}^..."');
    expect(yml).toContain("resolve-fly-org.sh");
    expect(yml).toContain(
      'flyctl apps create "${' + '{ matrix.fly_app }}" --machines --org "$org" --yes',
    );
    expect(yml.indexOf("Setup flyctl")).toBeLessThan(yml.indexOf("Setup Node and pnpm"));
    const certs = readFileSync(resolve(WORKFLOWS, "issue-fly-certs.yml"), "utf-8");
    expect(certs).toContain("flyctl certs add");
    expect(certs).toContain("nebutra-forge");
    for (const app of ["forge", "router", "web", "pebble", "design", "auth"]) {
      const toml = readFileSync(resolve(process.cwd(), "infra/fly", `${app}.toml`), "utf-8");
      expect(toml, app).toContain('primary_region = "sin"');
      expect(toml, app).toContain('HOSTNAME = "0.0.0.0"');
      expect(toml, app).toContain('PORT = "8080"');
      expect(toml, app).not.toContain("hkg");
    }
  });

  it("Hono origin has its own Fly workflow, not the Next standalone path", () => {
    const yml = read("deploy-fly-gateway.yml");
    expect(yml).toContain("FLY_API_TOKEN");
    expect(yml).toContain("infra/runtime/docker/Dockerfile.gateway");
    expect(yml).toContain("infra/fly/gateway.toml");
    expect(yml).toContain("prepare-pnpm-deploy-node-runtime.mjs");
    expect(yml).toContain("materialize-pnpm-deploy-bundle.sh");
    expect(yml).toContain("packages/design/ui/dist");
    expect(yml).toContain("nebutra-gateway");
    expect(yml).toContain("/var/www/nebutra/api/.env");
    expect(yml).toContain("https://nebutra-gateway.fly.dev/api/misc/health");
    expect(yml).toContain("point-origin-dns-fly.sh");
    expect(yml).toContain("github.event.inputs.cutover == 'true'");
    expect(yml).not.toContain("assemble-next-standalone.sh");
    expect(yml).not.toContain("Dockerfile.standalone");

    const nextYml = read("deploy-fly.yml");
    expect(nextYml).toContain("want_gateway");
    expect(nextYml).toContain("want_cache");
    expect(nextYml).toContain("UPSTASH_REDIS_REST_URL");
    expect(nextYml).toContain("UPSTASH_REDIS_REST_TOKEN");
    expect(nextYml).toContain("infra/runtime/docker/Dockerfile.gateway");
    expect(nextYml).toContain("assemble-next-standalone.sh");
    expect(nextYml.indexOf("assemble-next-standalone.sh")).toBeLessThan(
      nextYml.indexOf("infra/runtime/docker/Dockerfile.gateway"),
    );
    const assembleNext = readFileSync(
      resolve(process.cwd(), "infra/ops/scripts/assemble-next-standalone.sh"),
      "utf-8",
    );
    expect(assembleNext).toContain('cp -a "$WS/.next/standalone/." "$STAGE/"');

    const toml = readFileSync(resolve(process.cwd(), "infra/fly/gateway.toml"), "utf-8");
    expect(toml).toContain('primary_region = "sin"');
    expect(toml).toContain('HOST = "0.0.0.0"');
    expect(toml).toContain('PORT = "8080"');
    expect(toml).toContain('path = "/api/misc/health"');
    const gatewayDocker = readFileSync(
      resolve(process.cwd(), "infra/runtime/docker/Dockerfile.gateway"),
      "utf-8",
    );
    expect(gatewayDocker).toContain("COPY --chown=appuser:nodejs deps ./node_modules");
    expect(gatewayDocker).toContain("COPY --chown=appuser:nodejs app-dist ./dist");
    expect(toml).not.toContain("hkg");

    const wrangler = readFileSync(
      resolve(process.cwd(), "backends/gateway/wrangler.edge.toml"),
      "utf-8",
    );
    expect(wrangler).toContain('ORIGIN_URL = "https://nebutra-gateway.fly.dev"');
    expect(wrangler).not.toContain('ORIGIN_URL = "https://api.nebutra.com"');
    expect(wrangler).not.toContain('ORIGIN_URL = "https://origin.nebutra.com"');

    const originDns = readFileSync(
      resolve(process.cwd(), "infra/ops/scripts/point-origin-dns-fly.sh"),
      "utf-8",
    );
    expect(originDns).toContain("'proxied':False");
    expect(originDns).toContain("origin");

    const certs = readFileSync(resolve(WORKFLOWS, "issue-fly-certs.yml"), "utf-8");
    expect(certs).toContain("nebutra-gateway");
    expect(certs).toContain("host: origin");
  });

  it("web and auth Vercel workflows are workflow_dispatch only", () => {
    for (const file of ["deploy-web-vercel.yml", "deploy-auth-vercel.yml"]) {
      const yml = read(file);
      expect(yml).toContain("workflow_dispatch:");
      expect(yml, `${file} must not auto-deploy on push`).not.toMatch(/^ {2}push:/m);
    }
  });
});
