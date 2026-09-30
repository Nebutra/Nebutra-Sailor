/**
 * Verification layer (ADR 2026-09-30 supply capability probing).
 *
 * The cheapest real call that proves (or disproves) a model actually works,
 * per modality — this is what turns "the channel lists it" into "we checked".
 * Pure I/O, no persistence: the caller (repository seam) records the outcome
 * and feeds it to `state.ts`.
 */

import type { SupplyModality, SupplyProtocol } from "./discovery";

export type ProbeFailureReason =
  | "auth_not_found"
  | "unauthorized"
  | "model_not_found"
  | "not_in_plan"
  | "wrong_endpoint"
  | "rate_limited"
  | "timeout"
  | "server_error"
  | "unknown";

export interface ProbeInput {
  readonly protocol: SupplyProtocol;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly upstreamModel: string;
  readonly modality: SupplyModality;
  /**
   * Provider-declared per-model metadata from discovery (`DiscoveredModel.capabilities`,
   * persisted on `SupplySourceModel.capabilities`) — in particular
   * `supported_endpoints`, which picks the call shape below. `undefined`/`null`
   * behaves exactly like "no endpoints declared": the existing OpenAI-compatible
   * chat/completions probe.
   */
  readonly capabilities?: Record<string, unknown> | null;
}

export type ProbeResult =
  | { readonly outcome: "success"; readonly latencyMs: number; readonly httpStatus: number }
  | {
      readonly outcome: "failure";
      readonly reason: ProbeFailureReason;
      readonly latencyMs: number;
      readonly httpStatus: number | null;
      readonly detail: string;
    };

/**
 * Rate-limited and wrong-endpoint-shape "neutral" outcomes are never counted
 * as a failure by the state machine. A 429 says the source is busy, not
 * broken; a `wrong_endpoint` classification says *this probe* called the
 * model over the wrong shape (e.g. an Anthropic-only model hit via
 * `/chat/completions`) — a probing bug, not evidence the model itself is
 * down, so it must never accumulate toward suspending it. The caller should
 * skip recording a transition for these (see
 * `RouterSupplyRepository.recordProbe`).
 */
const NEUTRAL_FAILURE_REASONS: ReadonlySet<ProbeFailureReason> = new Set([
  "rate_limited",
  "wrong_endpoint",
]);

export function isNeutralOutcome(result: ProbeResult): boolean {
  return result.outcome === "failure" && NEUTRAL_FAILURE_REASONS.has(result.reason);
}

/**
 * Same neutrality rule as {@link isNeutralOutcome}, for callers that only have
 * a classified reason string rather than a full `ProbeResult` — the passive
 * signal path (`recordPassiveSignal`), which classifies from a real relay
 * response rather than an active probe.
 */
export function isNeutralFailureReason(reason: string | null | undefined): boolean {
  return reason != null && NEUTRAL_FAILURE_REASONS.has(reason as ProbeFailureReason);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function rootUrl(baseUrl: string): string {
  const base = stripTrailingSlash(baseUrl);
  return base.endsWith("/v1") ? base : `${base}/v1`;
}

/** The chat-shaped call this probe should make — everything except IMAGE/EMBEDDING modalities, which have their own fixed shape regardless of `supported_endpoints`. */
type ChatProbeShape = "chat_completions" | "anthropic_messages" | "responses";

function declaredEndpoints(
  capabilities: Record<string, unknown> | null | undefined,
): string[] | null {
  const endpoints = capabilities?.supported_endpoints;
  if (!Array.isArray(endpoints)) return null;
  const filtered = endpoints.filter((e): e is string => typeof e === "string" && e.length > 0);
  return filtered.length > 0 ? filtered : null;
}

/**
 * Probe shape follows the model's advertised endpoints (ADR 2026-09-30
 * follow-up — Command Code's `/provider/v1/models` returns `supported_endpoints`
 * per model, e.g. `["/messages"]` for Claude models, `["/chat/completions",
 * "/responses"]` for GPT models). `/chat/completions` present, or no
 * endpoints declared at all, keeps the existing OpenAI-compatible probe —
 * every source discovered before this metadata existed behaves unchanged.
 */
function chatProbeShapeFor(
  capabilities: Record<string, unknown> | null | undefined,
): ChatProbeShape {
  const endpoints = declaredEndpoints(capabilities);
  if (endpoints === null || endpoints.some((e) => e.includes("/chat/completions"))) {
    return "chat_completions";
  }
  if (endpoints.some((e) => e.includes("/messages"))) return "anthropic_messages";
  if (endpoints.some((e) => e.includes("/responses"))) return "responses";
  return "chat_completions";
}

function endpointFor(baseUrl: string, modality: SupplyModality, shape: ChatProbeShape): string {
  const root = rootUrl(baseUrl);
  if (modality === "IMAGE") return `${root}/images/generations`;
  if (modality === "EMBEDDING") return `${root}/embeddings`;
  switch (shape) {
    case "anthropic_messages":
      return `${root}/messages`;
    case "responses":
      return `${root}/responses`;
    default:
      return `${root}/chat/completions`;
  }
}

function bodyFor(
  modality: SupplyModality,
  model: string,
  shape: ChatProbeShape,
): Record<string, unknown> {
  if (modality === "IMAGE") {
    // Smallest size, lowest quality: the cheapest image call that still
    // exercises the real upstream path rather than a text endpoint.
    return { model, prompt: "probe", n: 1, size: "256x256", quality: "low" };
  }
  if (modality === "EMBEDDING") return { model, input: "probe" };
  // TEXT, AUDIO, VIDEO, OTHER — no cheaper documented probe shape exists for
  // audio/video specifically (a narrower, stated gap; see the ADR).
  switch (shape) {
    case "anthropic_messages":
      return { model, max_tokens: 16, messages: [{ role: "user", content: "ping" }] };
    case "responses":
      return { model, input: "ping", max_output_tokens: 16 };
    default:
      // 16 output tokens: some upstreams reject anything smaller (OpenAI's
      // Responses-backed models demand max_output_tokens >= 16), and a probe
      // that the upstream refuses on shape reads as the model failing.
      return { model, messages: [{ role: "user", content: "ping" }], max_tokens: 16 };
  }
}

function headersFor(shape: ChatProbeShape, apiKey: string | undefined): Record<string, string> {
  if (!apiKey) return {};
  if (shape === "anthropic_messages") {
    // Anthropic's Messages API: both auth headers are sent (some relays only
    // honor one or the other), plus the required version header.
    return {
      "x-api-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01",
    };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

/** Classify an upstream failure into one reason code, from status + body text. */
export function classifyFailure(status: number | null, bodyText: string): ProbeFailureReason {
  const lower = bodyText.toLowerCase();
  // Literal match first: this is the exact CLIProxyAPI error string from the
  // 2026-09-30 incident (`503 auth_not_found: no auth available (...)`), and
  // matching the string directly is more precise than inferring from status.
  if (lower.includes("auth_not_found") || lower.includes("no auth available")) {
    return "auth_not_found";
  }
  // The probe called the model over the wrong endpoint shape (e.g. Command
  // Code's Claude models: `{"error":{"message":"Model \"...\" must be called
  // via /provider/v1/messages (Anthropic Messages shape).","code":"unsupported_model"}}`).
  // This is a probing bug, not the model failing — see `isNeutralOutcome`.
  if (lower.includes("unsupported_model") || lower.includes("must be called via")) {
    return "wrong_endpoint";
  }
  // A plan tier that excludes the model (e.g. Command Code
  // `MODEL_NOT_IN_PLAN: … available in Pro and above plans`) is a real,
  // stable "this source cannot serve it" — not a credential problem.
  if (lower.includes("model_not_in_plan") || lower.includes("not in plan")) return "not_in_plan";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404 || lower.includes("model_not_found") || lower.includes("does not exist")) {
    return "model_not_found";
  }
  if (status === 429) return "rate_limited";
  if (status !== null && status >= 500) return "server_error";
  return "unknown";
}

/**
 * One real, cheap upstream call for (source, model). `fetchImpl` is injected
 * so this stays testable without a network — every adapter test in this
 * package mocks it.
 */
export async function probeModel(
  input: ProbeInput,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15_000,
): Promise<ProbeResult> {
  // IMAGE/EMBEDDING have their own fixed shape regardless of `supported_endpoints`
  // — the chat-shape selection only applies to the chat-completions-shaped
  // default (TEXT/AUDIO/VIDEO/OTHER).
  const shape: ChatProbeShape =
    input.modality === "IMAGE" || input.modality === "EMBEDDING"
      ? "chat_completions"
      : chatProbeShapeFor(input.capabilities);
  const url = endpointFor(input.baseUrl, input.modality, shape);
  const started = Date.now();
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headersFor(shape, input.apiKey),
      },
      body: JSON.stringify(bodyFor(input.modality, input.upstreamModel, shape)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - started;
    if (res.ok) return { outcome: "success", latencyMs, httpStatus: res.status };
    const text = await res.text().catch(() => "");
    return {
      outcome: "failure",
      reason: classifyFailure(res.status, text),
      latencyMs,
      httpStatus: res.status,
      detail: text.slice(0, 500),
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const isTimeout =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      outcome: "failure",
      reason: isTimeout ? "timeout" : "unknown",
      latencyMs,
      httpStatus: null,
      detail: error instanceof Error ? error.message : "probe failed",
    };
  }
}
