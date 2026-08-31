import type { SupplyEngineEndpoint, SupplyEngineKind } from "@nebutra/prepaid-wallet";

export interface ResolvedEngine extends SupplyEngineEndpoint {
  readonly apiKey: string;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Load enabled supply engines from env (sidecar topology).
 *
 * - NEW_API_BASE_URL + NEW_API_ACCESS_TOKEN → newapi
 * - SUB2API_BASE_URL + SUB2API_ACCESS_TOKEN → sub2api
 * - OPENAI_BASE_URL + OPENAI_API_KEY → official (optional direct)
 */
export function loadEnginesFromEnv(): ResolvedEngine[] {
  const engines: ResolvedEngine[] = [];

  const newApiBase = env("NEW_API_BASE_URL") ?? env("NEBUTRA_NEW_API_URL");
  const newApiKey = env("NEW_API_ACCESS_TOKEN") ?? env("NEBUTRA_NEW_API_TOKEN");
  if (newApiBase && newApiKey) {
    engines.push({
      id: "newapi",
      kind: "newapi",
      baseUrl: stripTrailingSlash(newApiBase),
      internalTokenEnv: "NEW_API_ACCESS_TOKEN",
      enabled: true,
      apiKey: newApiKey,
    });
  }

  const subBase = env("SUB2API_BASE_URL") ?? env("NEBUTRA_SUB2API_URL");
  const subKey = env("SUB2API_ACCESS_TOKEN") ?? env("NEBUTRA_SUB2API_TOKEN");
  if (subBase && subKey) {
    engines.push({
      id: "sub2api",
      kind: "sub2api",
      baseUrl: stripTrailingSlash(subBase),
      internalTokenEnv: "SUB2API_ACCESS_TOKEN",
      enabled: true,
      apiKey: subKey,
    });
  }

  const openaiBase = env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
  const openaiKey = env("OPENAI_API_KEY");
  if (openaiKey) {
    engines.push({
      id: "official-openai",
      kind: "official",
      baseUrl: stripTrailingSlash(openaiBase),
      internalTokenEnv: "OPENAI_API_KEY",
      enabled: true,
      apiKey: openaiKey,
    });
  }

  return engines;
}

export function chatCompletionsUrl(baseUrl: string): string {
  const base = stripTrailingSlash(baseUrl);
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/v1/chat/completions`;
}

/** OpenAI-compatible path on a New-API / 302-style base (`/v1/...`). */
export function openaiCompatibleUrl(baseUrl: string, path: readonly string[], search = ""): string {
  const base = stripTrailingSlash(baseUrl);
  const suffix = path.filter(Boolean).join("/");
  const query = search.startsWith("?") || search.length === 0 ? search : `?${search}`;
  if (base.endsWith("/v1")) return `${base}/${suffix}${query}`;
  return `${base}/v1/${suffix}${query}`;
}

export function kindLabel(kind: SupplyEngineKind): string {
  return kind;
}

function stripTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url.charCodeAt(end - 1) === 47 /* / */) end -= 1;
  return end === url.length ? url : url.slice(0, end);
}
