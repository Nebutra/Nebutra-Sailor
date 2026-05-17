import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityError } from "@nebutra/errors";

export { CapabilityError } from "@nebutra/errors";

export type ProviderMessageRole = "system" | "user" | "assistant" | "tool";

export interface ProviderMessage {
  readonly role: ProviderMessageRole;
  readonly content: string;
}

export interface ProviderUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface ProviderCompletion {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly text: string;
  readonly usage?: ProviderUsage;
  readonly raw?: unknown;
}

export interface ProviderHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly model?: string;
  readonly latencyMs?: number;
  readonly suggestion?: string;
  readonly detail?: string;
}

export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  readonly capabilities: ReadonlySet<string>;
  complete(
    messages: readonly ProviderMessage[],
    options?: ProviderCompleteOptions,
  ): Promise<ProviderCompletion>;
  doctor(): Promise<ProviderHealth>;
}

export interface ProviderCompleteOptions {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
}

export interface LocalModelProviderOptions {
  readonly model?: string;
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export function normalizeProviderMessages(
  messages: readonly ProviderMessage[],
): readonly ProviderMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: String(message.content),
  }));
}

function promptFromMessages(messages: readonly ProviderMessage[]): string {
  return normalizeProviderMessages(messages)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

async function readJsonlTail(path: string, limit: number): Promise<unknown[]> {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}

export function debugPath(codename = "provider-registry"): string {
  return join(process.cwd(), ".nebutra", "debug", `${codename}.jsonl`);
}

export async function appendDebug(codename: string, entry: Record<string, unknown>): Promise<void> {
  const path = debugPath(codename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readDebug(codename = "provider-registry", limit = 10): Promise<unknown[]> {
  return readJsonlTail(debugPath(codename), limit);
}

export function createLocalModelProvider(options: LocalModelProviderOptions = {}): LLMProvider {
  const model = options.model ?? process.env.LOCAL_MODEL_NAME ?? "llama3.2";
  const baseUrl = (
    options.baseUrl ??
    process.env.LOCAL_MODEL_BASE_URL ??
    "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;

  return {
    id: "local-model",
    model,
    capabilities: new Set(["reasoning", "tools", "local", "zero-config"]),
    async complete(messages, completeOptions = {}) {
      const started = Date.now();
      const response = await fetchImpl(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: promptFromMessages(messages),
          stream: false,
          options: {
            ...(completeOptions.temperature !== undefined && {
              temperature: completeOptions.temperature,
            }),
            ...(completeOptions.maxTokens !== undefined && {
              num_predict: completeOptions.maxTokens,
            }),
          },
        }),
        ...(completeOptions.signal !== undefined && { signal: completeOptions.signal }),
      });

      if (!response.ok) {
        throw new CapabilityError(
          "provider-registry",
          `Local provider returned ${response.status}`,
          {
            suggestion:
              "Run `pnpm provider-registry:doctor` and verify the local model service is running.",
            metadata: { provider: "local-model", model, status: response.status },
          },
        );
      }

      const raw = (await response.json()) as {
        response?: string;
        prompt_eval_count?: number;
        eval_count?: number;
      };
      const usage: ProviderUsage = {
        ...(raw.prompt_eval_count !== undefined && { inputTokens: raw.prompt_eval_count }),
        ...(raw.eval_count !== undefined && { outputTokens: raw.eval_count }),
        ...(raw.prompt_eval_count !== undefined || raw.eval_count !== undefined
          ? { totalTokens: (raw.prompt_eval_count ?? 0) + (raw.eval_count ?? 0) }
          : {}),
      };
      const result: ProviderCompletion = {
        id: `local-model-${Date.now()}`,
        provider: "local-model",
        model,
        text: raw.response ?? "",
        ...(Object.keys(usage).length > 0 && { usage }),
        raw,
      };
      await appendDebug("provider-registry", {
        type: "completion",
        provider: "local-model",
        model,
        latencyMs: Date.now() - started,
        ok: true,
      });
      return result;
    },
    async doctor() {
      const started = Date.now();
      try {
        const response = await fetchImpl(`${baseUrl}/api/tags`, { method: "GET" });
        const ok = response.ok;
        return {
          provider: "local-model",
          model,
          ok,
          latencyMs: Date.now() - started,
          ...(ok
            ? {}
            : {
                suggestion:
                  "Start the local model service and pull the configured model before running Layer 0 demos.",
              }),
        };
      } catch (error) {
        return {
          provider: "local-model",
          model,
          ok: false,
          latencyMs: Date.now() - started,
          detail: error instanceof Error ? error.message : String(error),
          suggestion:
            "Install/start the local model service, then run `pnpm provider:doctor` again.",
        };
      }
    },
  };
}

export class ProviderRegistry {
  readonly #providers = new Map<string, LLMProvider>();
  readonly #aliases = new Map<string, string>();

  constructor(providers: readonly LLMProvider[] = []) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  static default(): ProviderRegistry {
    const registry = new ProviderRegistry();
    const local = createLocalModelProvider();
    registry.register(local, ["llama3.2", "local", "zero-config"]);
    return registry;
  }

  register(provider: LLMProvider, aliases: readonly string[] = []): this {
    this.#providers.set(provider.id, provider);
    this.#providers.set(provider.model, provider);
    for (const alias of aliases) {
      this.#aliases.set(alias, provider.id);
    }
    return this;
  }

  list(): LLMProvider[] {
    return Array.from(new Set(this.#providers.values()));
  }

  get(modelOrProvider: string): LLMProvider {
    const alias = this.#aliases.get(modelOrProvider) ?? modelOrProvider;
    const provider = this.#providers.get(alias);
    if (!provider) {
      throw new CapabilityError(
        "provider-registry",
        `No provider registered for ${modelOrProvider}`,
        {
          suggestion: "Register a provider or use the zero-config local model alias.",
          metadata: { requested: modelOrProvider },
          statusCode: 404,
        },
      );
    }
    return provider;
  }

  async doctor(): Promise<ProviderHealth[]> {
    return Promise.all(this.list().map((provider) => provider.doctor()));
  }
}
