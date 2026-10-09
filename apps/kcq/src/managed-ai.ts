/**
 * Typed client for Nebutra's managed AI (gateway `/api/v1/kcq-ai`, proxied by the
 * KCQ host at `/market/ai`). The session cookie is the only credential: no key is
 * stored in the browser, and the browser never chooses a model or a routing tier.
 * The gateway serves staff the internal default and everyone else Router's public
 * default; `listModels` shows what this account is served with.
 *
 * The KCQ Agent's OpenAI-compatible provider is pointed at `MANAGED_AI_BASE_PATH`
 * with `managedAiFetch` as its `fetch` (see BYOK.md, "Managed AI").
 */

export const MANAGED_AI_BASE_PATH = "/market/ai/v1";
/** Placeholder bearer value for providers that require a non-empty API key. */
export const MANAGED_AI_CREDENTIAL = "nebutra-session";

/** Name of the managed provider in the Agent settings. */
export const MANAGED_AI_NAME = "Nebutra";
/** Placeholder model id sent in requests; the gateway ignores it and serves the account's default. */
export const MANAGED_AI_MODEL = "auto";
/** Matches the gateway's default output cap (`KCQ_AI_MAX_OUTPUT_TOKENS`). */
export const MANAGED_AI_OUTPUT_TOKENS = 8192;

export interface ManagedAiModel {
  id: string;
}
export interface ManagedAiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export class ManagedAiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ManagedAiError";
  }
}

/** A `fetch` that authenticates with the session cookie and never sends the placeholder key. */
export function managedAiFetch(fetchImpl: typeof fetch = fetch): typeof fetch {
  return (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.delete("Authorization");
    return fetchImpl(input, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  };
}

async function failure(response: Response): Promise<ManagedAiError> {
  const data: unknown = await response.json().catch(() => null);
  const envelope =
    data && typeof data === "object" ? Object.getOwnPropertyDescriptor(data, "error")?.value : null;
  const read = (key: string): unknown =>
    envelope && typeof envelope === "object"
      ? Object.getOwnPropertyDescriptor(envelope, key)?.value
      : undefined;
  const message = read("message");
  const code = read("code");
  return new ManagedAiError(
    typeof message === "string" ? message : "AI 服务暂时不可用。",
    response.status,
    typeof code === "string" ? code : "unknown",
  );
}

export function createManagedAiClient(origin: string, fetchImpl: typeof fetch = fetch) {
  const send = managedAiFetch(fetchImpl);
  const base = origin.replace(/\/+$/, "") + MANAGED_AI_BASE_PATH;
  return {
    baseUrl: base,
    async listModels(): Promise<ManagedAiModel[]> {
      const response = await send(`${base}/models`);
      if (!response.ok) throw await failure(response);
      const data: unknown = await response.json().catch(() => null);
      const rows =
        data && typeof data === "object"
          ? Object.getOwnPropertyDescriptor(data, "data")?.value
          : [];
      if (!Array.isArray(rows)) return [];
      return rows.flatMap((row: unknown) => {
        const id =
          row && typeof row === "object" ? Object.getOwnPropertyDescriptor(row, "id")?.value : null;
        return typeof id === "string" ? [{ id }] : [];
      });
    },
    async complete(messages: ManagedAiMessage[], signal?: AbortSignal): Promise<string> {
      const response = await send(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, stream: false }),
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) throw await failure(response);
      const data: unknown = await response.json().catch(() => null);
      const choices =
        data && typeof data === "object"
          ? Object.getOwnPropertyDescriptor(data, "choices")?.value
          : null;
      const first: unknown = Array.isArray(choices) ? choices[0] : null;
      const message =
        first && typeof first === "object"
          ? Object.getOwnPropertyDescriptor(first, "message")?.value
          : null;
      const content =
        message && typeof message === "object"
          ? Object.getOwnPropertyDescriptor(message, "content")?.value
          : null;
      if (typeof content !== "string")
        throw new ManagedAiError("AI 返回内容无效。", 502, "malformed");
      return content;
    },
  };
}
