import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const turboConfig = JSON.parse(readFileSync(resolve(repoRoot, "turbo.json"), "utf8"));
const turboBin = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "turbo.cmd" : "turbo",
);

const vercelProjectEnv = [
  "CI",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "SKIP_ENV_VALIDATION",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "ADMIN_EMAIL",
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "NEXT_TELEMETRY_DISABLED",
];

const buildHashEnv = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_DOCS_URL",
  "DOCS_ORIGIN_URL",
  "NEBUTRA_LANDING_ORIGIN",
  "NEBUTRA_SESSION_HINT_DOMAIN",
  "AUTH_PROVIDER",
  "NEXT_PUBLIC_AUTH_PROVIDER",
  "NEXT_OUTPUT",
  "ANALYZE",
  "VERCEL",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(actual, expected, label) {
  const actualSet = new Set(actual ?? []);
  const missing = expected.filter((name) => !actualSet.has(name));
  assert(missing.length === 0, `${label} is missing: ${missing.join(", ")}`);
}

includesAll(
  turboConfig.globalPassThroughEnv,
  ["npm_config_verify_deps_before_run", ...vercelProjectEnv],
  "globalPassThroughEnv",
);
includesAll(turboConfig.tasks?.build?.env, buildHashEnv, "tasks.build.env");

const envOverlap = (turboConfig.tasks?.build?.env ?? []).filter((name) =>
  (turboConfig.globalPassThroughEnv ?? []).includes(name),
);
assert(
  envOverlap.length === 0,
  `tasks.build.env and globalPassThroughEnv must not overlap; move these to the right side: ${envOverlap.join(", ")}`,
);

const rootPackageBuildOverrides = Object.keys(turboConfig.tasks ?? {}).filter((taskName) =>
  /^@.+#build$/.test(taskName),
);
assert(
  rootPackageBuildOverrides.length === 0,
  `Package-specific build task overrides belong in package-local turbo.json files: ${rootPackageBuildOverrides.join(", ")}`,
);

assert(
  turboConfig.tasks?.["db:generate"]?.outputs?.includes("src/generated/prisma/**"),
  "db:generate must declare the Prisma 7 generated client output at src/generated/prisma/**",
);

const syntheticEnv = Object.fromEntries(
  [...new Set([...vercelProjectEnv, ...buildHashEnv])].map((name) => [
    name,
    name.startsWith("NEXT_PUBLIC_") || name.endsWith("_URL") || name.endsWith("_ORIGIN")
      ? `https://${name.toLowerCase().replaceAll("_", "-")}.example`
      : `stub_${name.toLowerCase()}`,
  ]),
);

function parseDryRun(stdout) {
  const start = stdout.indexOf("{");
  assert(start >= 0, "Turbo dry-run did not emit JSON");
  return JSON.parse(stdout.slice(start));
}

function dryRun(filter) {
  return dryRunTask("build", filter);
}

function dryRunTask(task, filter) {
  const result = spawnSync(turboBin, [task, `--filter=${filter}`, "--dry=json"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...syntheticEnv,
      npm_config_verify_deps_before_run: "false",
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`Turbo dry-run failed for ${filter}`);
  }

  return parseDryRun(result.stdout);
}

function taskById(plan, taskId) {
  return plan.tasks.find((task) => task.taskId === taskId);
}

const landingPlan = dryRun("@nebutra/landing");
const landingRegistryTasks = landingPlan.tasks
  .map((task) => task.taskId)
  .filter((taskId) => taskId.endsWith("#build:registry"));
assert(
  landingRegistryTasks.length === 0,
  `Landing build must not generate registry manifests; found ${landingRegistryTasks.join(", ")}`,
);

const uiBuild = taskById(landingPlan, "@nebutra/ui#build");
assert(uiBuild, "Landing build graph must include @nebutra/ui#build");
assert(
  !String(uiBuild.command).includes("build-registry"),
  "@nebutra/ui#build must be side-effect free",
);

const blogBuild = taskById(landingPlan, "@nebutra/blog#build");
if (blogBuild) {
  assert(
    Array.isArray(blogBuild.resolvedTaskDefinition.outputs) &&
      blogBuild.resolvedTaskDefinition.outputs.length === 0,
    "@nebutra/blog#build is tsc --noEmit and must declare outputs: []",
  );
}

const tokensBuild = taskById(landingPlan, "@nebutra/tokens#build");
assert(tokensBuild, "Landing build graph must include @nebutra/tokens#build");
assert(
  tokensBuild.resolvedTaskDefinition.outputs?.includes("styles.css"),
  "@nebutra/tokens#build must declare styles.css as its only runtime output",
);

const dbPlan = dryRunTask("db:generate", "@nebutra/db");
const dbGenerate = taskById(dbPlan, "@nebutra/db#db:generate");
assert(dbGenerate, "Prisma generation graph must include @nebutra/db#db:generate");
assert(
  dbGenerate.resolvedTaskDefinition.outputs?.includes("src/generated/prisma/**"),
  "@nebutra/db#db:generate must cache the generated Prisma client output",
);

const gatewayCoreBuild = taskById(dryRun("@nebutra/gateway-core"), "@nebutra/gateway-core#build");
assert(gatewayCoreBuild, "Gateway-core build graph must include @nebutra/gateway-core#build");
// gateway-core emits dist/ (package.json main/types → ./dist); outputs:[] was a
// cache bug that dropped dist on cache hit. See 0f6b6aec.
assert(
  Array.isArray(gatewayCoreBuild.resolvedTaskDefinition.outputs) &&
    gatewayCoreBuild.resolvedTaskDefinition.outputs.some(
      (output) => output === "dist/**" || output.endsWith("dist/**"),
    ),
  "@nebutra/gateway-core#build emits dist/ and must declare dist/** outputs",
);

const onboardingBuild = taskById(dryRun("@nebutra/onboarding"), "@nebutra/onboarding#build");
assert(onboardingBuild, "Onboarding build graph must include @nebutra/onboarding#build");
assert(
  Array.isArray(onboardingBuild.resolvedTaskDefinition.outputs) &&
    onboardingBuild.resolvedTaskDefinition.outputs.length === 0,
  "@nebutra/onboarding#build is tsc/noEmit and must declare outputs: []",
);

const themeBuild = taskById(dryRun("@nebutra/theme"), "@nebutra/theme#build");
assert(themeBuild, "Theme build graph must include @nebutra/theme#build");
assert(
  themeBuild.resolvedTaskDefinition.outputs?.includes("keyframes.css") ||
    themeBuild.resolvedTaskDefinition.outputs?.includes("themes.css"),
  "@nebutra/theme#build must declare keyframes.css (or themes.css alias) as runtime output",
);
assert(
  themeBuild.dependencies.includes("@nebutra/design-tokens#build"),
  "@nebutra/theme#build must explicitly depend on @nebutra/design-tokens#build",
);

// The registry-generation contract belonged to apps/design-docs, deleted 2026-08-11.

process.stdout.write("turbo build contract: ok\n");
