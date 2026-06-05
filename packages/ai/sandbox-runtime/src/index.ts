import {
  appendCapabilityDebug,
  capabilityDebugPath,
  readCapabilityDebug,
} from "@nebutra/capability-kit/debug";
import { CapabilityError } from "@nebutra/errors";
import pLimit from "p-limit";

export interface ExecHints {
  readonly durationS?: number;
  readonly needsGpu?: boolean;
  readonly networkAccess?: boolean;
}

export interface ExecRequest {
  readonly cmd: string;
  readonly filesIn?: Record<string, string>;
  readonly hints?: ExecHints;
  readonly tenantId?: string;
  readonly threadId?: string;
}

export interface ExecResponse {
  readonly exitCode: number;
  readonly aggregatedOutput: string;
  readonly executedOn: string;
}

export interface SandboxHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface Sandbox {
  readonly id: string;
  exec(request: ExecRequest): Promise<ExecResponse>;
  doctor(): Promise<SandboxHealth>;
}

export interface RouteRule {
  readonly when: Partial<ExecHints>;
  readonly provider: string;
}

export interface SandboxRuntimeConfig {
  readonly providers?: readonly Sandbox[];
  readonly routes?: readonly RouteRule[];
}

const SANDBOX_DOCTOR_CONCURRENCY = 4;

export function sandboxDebugPath(): string {
  return capabilityDebugPath("sandbox-runtime");
}

async function appendSandboxDebug(entry: Record<string, unknown>): Promise<void> {
  await appendCapabilityDebug("sandbox-runtime", entry);
}

export function createLocalMacSandbox(
  options: { endpoint?: string; fetch?: typeof fetch } = {},
): Sandbox {
  const endpoint =
    options.endpoint ??
    process.env.SANDBOX_RUNTIME_LOCAL_URL ??
    "http://127.0.0.1:8020/api/v1/sandbox/exec";
  const fetchImpl = options.fetch ?? fetch;
  return {
    id: "local_mac",
    async exec(request) {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantId: request.tenantId ?? "local",
          threadId: request.threadId ?? "local",
          command: request.cmd,
          capabilityPolicy: {
            kind: "external_sandbox",
            network_access: request.hints?.networkAccess ?? false,
          },
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new CapabilityError(
          "sandbox-runtime",
          `Local sandbox refused execution (${response.status})`,
          {
            suggestion:
              "Start the Rust sandbox service or route this task to a configured remote provider.",
            metadata: { detail },
            statusCode: response.status,
          },
        );
      }
      const result = (await response.json()) as ExecResponse;
      await appendSandboxDebug({
        type: "exec",
        provider: "local_mac",
        command: request.cmd,
        result,
      });
      return result;
    },
    async doctor() {
      try {
        const result = await this.exec({ cmd: "echo sandbox ok" });
        return { provider: "local_mac", ok: result.exitCode === 0 };
      } catch (error) {
        return {
          provider: "local_mac",
          ok: false,
          suggestion:
            error instanceof Error ? error.message : "Check local sandbox service reachability.",
        };
      }
    },
  };
}

export function createRemotePlaceholder(
  id: "remote_code" | "remote_gpu" | "remote_workspace",
  envKey: string,
): Sandbox {
  return {
    id,
    async exec() {
      throw new CapabilityError("sandbox-runtime", `${id} adapter is not configured`, {
        suggestion: `Set ${envKey} and wire the provider SDK before routing tasks to ${id}.`,
        statusCode: 503,
      });
    },
    async doctor() {
      return process.env[envKey]
        ? { provider: id, ok: true }
        : { provider: id, ok: false, suggestion: `Set ${envKey} to enable ${id}.` };
    },
  };
}

export class SandboxRuntime {
  readonly #providers = new Map<string, Sandbox>();
  readonly #routes: readonly RouteRule[];

  constructor(config: SandboxRuntimeConfig = {}) {
    for (const provider of config.providers ?? [
      createLocalMacSandbox(),
      createRemotePlaceholder("remote_code", "SANDBOX_REMOTE_CODE_TOKEN"),
      createRemotePlaceholder("remote_gpu", "SANDBOX_REMOTE_GPU_TOKEN"),
      createRemotePlaceholder("remote_workspace", "SANDBOX_REMOTE_WORKSPACE_TOKEN"),
    ]) {
      this.#providers.set(provider.id, provider);
    }
    this.#routes = config.routes ?? [
      { when: { needsGpu: true }, provider: "remote_gpu" },
      { when: { durationS: 30 }, provider: "remote_code" },
      { when: { needsGpu: false }, provider: "local_mac" },
    ];
  }

  static fromConfig(config: SandboxRuntimeConfig = {}): SandboxRuntime {
    return new SandboxRuntime(config);
  }

  plan(request: ExecRequest): { provider: string; reason: string } {
    const hints = request.hints ?? {};
    for (const rule of this.#routes) {
      const matches = Object.entries(rule.when).every(
        ([key, value]) => hints[key as keyof ExecHints] === value,
      );
      if (matches && this.#providers.has(rule.provider)) {
        return { provider: rule.provider, reason: "matched static routing rule" };
      }
    }
    return {
      provider: this.#providers.has("local_mac")
        ? "local_mac"
        : (Array.from(this.#providers.keys())[0] ?? ""),
      reason: "default route",
    };
  }

  async exec(request: ExecRequest): Promise<ExecResponse> {
    const plan = this.plan(request);
    const provider = this.#providers.get(plan.provider);
    if (!provider) {
      throw new CapabilityError("sandbox-runtime", "No sandbox provider available", {
        suggestion: "Configure at least one sandbox provider before executing commands.",
        metadata: plan,
      });
    }
    return provider.exec(request);
  }

  async doctor(): Promise<SandboxHealth[]> {
    const limit = pLimit(SANDBOX_DOCTOR_CONCURRENCY);
    return Promise.all(
      Array.from(this.#providers.values()).map((provider) => limit(() => provider.doctor())),
    );
  }
}

export async function readSandboxDebug(limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("sandbox-runtime", { limit });
}
