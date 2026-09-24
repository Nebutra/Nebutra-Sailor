import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse as parsePath } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { CommandError, runCommand } from "../utils/command-error";
import { ExitCode } from "../utils/exit-codes";
import { output } from "../utils/output";

interface StatusCommandOptions {
  json?: boolean;
  format?: string;
}

interface ProjectManifest {
  $schema?: string;
  stack?: string;
  capabilities?: string[];
  [key: string]: unknown;
}

type CapabilityState = "live" | "local-fallback" | "missing-key";

interface ProviderSpec {
  /** Provider id, e.g. "stripe" */
  id: string;
  /** Env keys that must ALL be present for this provider to be considered live */
  envKeys: string[];
}

interface CapabilitySpec {
  /** Providers checked in order; the first fully-configured one is reported live */
  providers: ProviderSpec[];
  /**
   * When no provider is configured:
   * - "fallback": degrades to a named local implementation (still "live" in the
   *   sense that `pnpm dev` works), reported as state "local-fallback"
   * - "missing-key": nothing runs until a key is set, reported as "missing-key"
   */
  degrade: { kind: "fallback"; provider: string } | { kind: "missing-key" };
  /** Human hint shown when the capability is not fully live */
  next: string;
}

/**
 * Capability → provider → required env keys.
 *
 * Env var names are verified against the real provider/factory code under
 * packages/iam/auth, packages/commerce/billing, packages/integrations/*, and
 * packages/platform (see AGENTS.md / CLAUDE.md source-of-truth rule — this
 * table must not drift from what the packages actually read).
 */
const CAPABILITY_TABLE: Record<string, CapabilitySpec> = {
  auth: {
    providers: [{ id: "better-auth", envKeys: ["BETTER_AUTH_SECRET"] }],
    degrade: { kind: "fallback", provider: "dev" },
    next: "set BETTER_AUTH_SECRET to run Better Auth (dev fallback runs without it)",
  },
  billing: {
    providers: [
      { id: "stripe", envKeys: ["STRIPE_SECRET_KEY"] },
      {
        id: "wechat-pay",
        envKeys: [
          "WECHATPAY_MCHID",
          "WECHATPAY_APP_ID",
          "WECHATPAY_PRIVATE_KEY",
          "WECHATPAY_SERIAL_NO",
          "WECHATPAY_API_V3_KEY",
        ],
      },
      { id: "alipay", envKeys: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY"] },
    ],
    degrade: { kind: "missing-key" },
    next: "set STRIPE_SECRET_KEY (or WECHATPAY_* / ALIPAY_* for mainland China)",
  },
  email: {
    providers: [{ id: "resend", envKeys: ["RESEND_API_KEY"] }],
    degrade: { kind: "fallback", provider: "console" },
    next: "set RESEND_API_KEY to send real email (console fallback logs instead)",
  },
  sms: {
    providers: [
      {
        id: "twilio-verify",
        envKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"],
      },
      {
        id: "aliyun",
        envKeys: ["ALIYUN_SMS_ACCESS_KEY_ID", "ALIYUN_SMS_ACCESS_KEY_SECRET"],
      },
    ],
    degrade: { kind: "missing-key" },
    next: "set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_VERIFY_SERVICE_SID (or ALIYUN_SMS_* for mainland China)",
  },
  storage: {
    providers: [
      {
        id: "s3-compatible",
        envKeys: ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT"],
      },
    ],
    degrade: { kind: "fallback", provider: "local" },
    next: "set S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_ENDPOINT (or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) for S3/R2 storage",
  },
  queue: {
    providers: [{ id: "qstash", envKeys: ["QSTASH_TOKEN"] }],
    degrade: { kind: "fallback", provider: "memory" },
    next: "set QSTASH_TOKEN to run the QStash queue (memory fallback is dev/test only)",
  },
  cache: {
    providers: [{ id: "redis", envKeys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] }],
    degrade: { kind: "fallback", provider: "memory" },
    next: "set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN to run Redis (memory fallback is dev/test only)",
  },
  notifications: {
    providers: [{ id: "direct", envKeys: [] }],
    degrade: { kind: "missing-key" },
    next: "always live — no configuration required",
  },
  webhooks: {
    providers: [{ id: "custom", envKeys: [] }],
    degrade: { kind: "missing-key" },
    next: "always live — no configuration required",
  },
  ai: {
    providers: [
      { id: "openai", envKeys: ["OPENAI_API_KEY"] },
      { id: "anthropic", envKeys: ["ANTHROPIC_API_KEY"] },
      { id: "deepseek", envKeys: ["DEEPSEEK_API_KEY"] },
      { id: "bailian", envKeys: ["DASHSCOPE_API_KEY"] },
    ],
    degrade: { kind: "missing-key" },
    next: "set one of OPENAI_API_KEY / ANTHROPIC_API_KEY / DEEPSEEK_API_KEY / DASHSCOPE_API_KEY",
  },
  mcp: {
    providers: [{ id: "built-in", envKeys: [] }],
    degrade: { kind: "missing-key" },
    next: "always live — no configuration required",
  },
  monitoring: {
    providers: [{ id: "sentry", envKeys: ["SENTRY_DSN"] }],
    degrade: { kind: "missing-key" },
    next: "set SENTRY_DSN to enable error monitoring",
  },
  analytics: {
    providers: [{ id: "posthog", envKeys: ["NEXT_PUBLIC_POSTHOG_KEY"] }],
    degrade: { kind: "missing-key" },
    next: "set NEXT_PUBLIC_POSTHOG_KEY to enable analytics",
  },
  captcha: {
    providers: [{ id: "turnstile", envKeys: ["TURNSTILE_SECRET_KEY"] }],
    degrade: { kind: "missing-key" },
    next: "set TURNSTILE_SECRET_KEY to enable captcha",
  },
};

interface CapabilityReport {
  name: string;
  state: CapabilityState;
  provider: string[];
  missing: string[];
  next: string;
}

function findProjectRoot(start: string): string | null {
  let current = start;
  const { root } = parsePath(current);
  while (true) {
    if (existsSync(join(current, "nebutra.config.json"))) return current;
    if (current === root) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function readConfig(configPath: string): ProjectManifest {
  const raw = readFileSync(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CommandError({
      code: "invalid_manifest",
      message: `nebutra.config.json at ${configPath} is not a JSON object.`,
      suggestion: "Re-run `create-sailor` or fix the file by hand.",
      exitCode: ExitCode.CONFIG_ERROR,
    });
  }
  return parsed as ProjectManifest;
}

/**
 * Minimal KEY=VALUE dotenv parser — no dependency, ignores comments and blank
 * lines, and strips matching single/double quotes around the value.
 */
function parseDotenv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (!key) continue;
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnv(projectRoot: string): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = { ...process.env };

  for (const file of [".env", ".env.local"]) {
    const filePath = join(projectRoot, file);
    if (!existsSync(filePath)) continue;
    try {
      const parsed = parseDotenv(readFileSync(filePath, "utf-8"));
      // Later files (.env.local) win over earlier ones, and both are
      // overridden by anything already set in the real process environment.
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined) {
          merged[key] = value;
        }
      }
    } catch {
      // best-effort: an unreadable env file should not crash `status`
    }
  }

  return merged;
}

function evaluateCapability(
  name: string,
  spec: CapabilitySpec,
  env: Record<string, string | undefined>,
): CapabilityReport {
  const liveProviders: string[] = [];
  let firstMissing: string[] = [];

  for (const provider of spec.providers) {
    const missingKeys = provider.envKeys.filter((key) => !env[key]);
    if (missingKeys.length === 0) {
      liveProviders.push(provider.id);
    } else if (firstMissing.length === 0 && provider.envKeys.length > 0) {
      firstMissing = missingKeys;
    }
  }

  if (liveProviders.length > 0) {
    return { name, state: "live", provider: liveProviders, missing: [], next: spec.next };
  }

  if (spec.degrade.kind === "fallback") {
    return {
      name,
      state: "local-fallback",
      provider: [spec.degrade.provider],
      missing: firstMissing,
      next: spec.next,
    };
  }

  return { name, state: "missing-key", provider: [], missing: firstMissing, next: spec.next };
}

function stateColor(state: CapabilityState, text: string): string {
  switch (state) {
    case "live":
      return pc.green(text);
    case "local-fallback":
      return pc.yellow(text);
    case "missing-key":
      return pc.red(text);
    default:
      return text;
  }
}

export async function statusCommand(options: StatusCommandOptions): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());

  if (!projectRoot) {
    throw new CommandError({
      code: "manifest_not_found",
      message: "No nebutra.config.json found in this directory or any parent directory.",
      suggestion: "Run `npx create-sailor` to scaffold a Sailor project first.",
      exitCode: ExitCode.CONFIG_ERROR,
    });
  }

  const configPath = join(projectRoot, "nebutra.config.json");
  const config = readConfig(configPath);

  const capabilities = Array.isArray(config.capabilities) ? config.capabilities : [];
  const env = loadEnv(projectRoot);
  const locale = env.NEBUTRA_LOCALE || "global";
  const stack = typeof config.stack === "string" ? config.stack : "unknown";

  const reports: CapabilityReport[] = capabilities.map((name) => {
    const spec = CAPABILITY_TABLE[name];
    if (!spec) {
      return {
        name,
        state: "missing-key",
        provider: [],
        missing: [],
        next: "unknown capability — no readiness rule registered in `nebutra status`",
      };
    }
    return evaluateCapability(name, spec, env);
  });

  const isJson = options.json === true || options.format === "json";

  if (isJson) {
    output(
      {
        stack,
        locale,
        capabilities: reports,
      },
      { format: "json" },
    );
    return;
  }

  const lines: string[] = [];
  lines.push(pc.bold(`nebutra status`));
  lines.push(pc.dim(`stack: ${stack}   locale: ${locale}   project: ${projectRoot}`));
  lines.push("");

  const nameWidth = Math.max(10, ...reports.map((r) => r.name.length));
  const stateWidth = Math.max(14, ...reports.map((r) => r.state.length));

  for (const report of reports) {
    const namePart = report.name.padEnd(nameWidth);
    const statePart = stateColor(report.state, report.state.padEnd(stateWidth));
    const providerPart = report.provider.length > 0 ? report.provider.join(", ") : "-";
    lines.push(`${namePart}  ${statePart}  ${pc.dim(providerPart)}`);
    if (report.state !== "live") {
      lines.push(`${" ".repeat(nameWidth)}  ${pc.dim(`→ ${report.next}`)}`);
    }
  }

  console.log(lines.join("\n"));
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show capability readiness — live, local-fallback, or missing-key, per env")
    .option("--json", "Emit machine-readable JSON")
    .action((options: StatusCommandOptions, command: Command) =>
      runCommand(async () => {
        const globalOptions = command.optsWithGlobals ? command.optsWithGlobals() : {};
        await statusCommand({
          json: options.json,
          format: (globalOptions as { format?: string }).format,
        });
      }),
    );
}
