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
 * Rate-limited "neutral" outcomes are never counted as a failure by the state
 * machine — a 429 says the source is busy, not broken. The caller should skip
 * recording a transition for these (see `RouterSupplyRepository.recordProbe`).
 */
export function isNeutralOutcome(result: ProbeResult): boolean {
  return result.outcome === "failure" && result.reason === "rate_limited";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function endpointFor(baseUrl: string, modality: SupplyModality): string {
  const base = stripTrailingSlash(baseUrl);
  const root = base.endsWith("/v1") ? base : `${base}/v1`;
  switch (modality) {
    case "IMAGE":
      return `${root}/images/generations`;
    case "EMBEDDING":
      return `${root}/embeddings`;
    default:
      return `${root}/chat/completions`;
  }
}

function bodyFor(modality: SupplyModality, model: string): Record<string, unknown> {
  switch (modality) {
    case "IMAGE":
      // Smallest size, lowest quality: the cheapest image call that still
      // exercises the real upstream path rather than a text endpoint.
      return { model, prompt: "probe", n: 1, size: "256x256", quality: "low" };
    case "EMBEDDING":
      return { model, input: "probe" };
    default:
      // TEXT, AUDIO, VIDEO, OTHER — no cheaper documented probe shape exists
      // for audio/video specifically (a narrower, stated gap; see the ADR).
      // max_tokens: 1 is the cheapest possible text completion; still a real
      // round trip through auth, routing and the model itself.
      return { model, messages: [{ role: "user", content: "ping" }], max_tokens: 1 };
  }
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
  const url = endpointFor(input.baseUrl, input.modality);
  const started = Date.now();
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
      },
      body: JSON.stringify(bodyFor(input.modality, input.upstreamModel)),
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
