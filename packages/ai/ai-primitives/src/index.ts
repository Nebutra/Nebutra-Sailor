import { createHash } from "node:crypto";

export type CosineMismatchPolicy = "zero" | "throw";

export interface CosineSimilarityOptions {
  /**
   * `zero` preserves fail-safe retrieval legs; `throw` lets fail-loud packages
   * wrap the mismatch in their own domain error type.
   */
  readonly onMismatch?: CosineMismatchPolicy;
}

export type BaseTokenEstimator = (text: string) => number;

export interface EstimateTokensOptions {
  readonly base?: BaseTokenEstimator;
  readonly correction?: number;
  readonly charsPerToken?: number;
}

export interface ScopedKeyInput {
  readonly prefix: string;
  readonly a: string;
  readonly b: string;
  readonly separator?: string;
  readonly digestLength?: number;
}

const DEFAULT_CHARS_PER_TOKEN = 4;
const DEFAULT_TOKEN_CORRECTION = 1.3;
const DEFAULT_DIGEST_LENGTH = 32;

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function scopedKey(input: ScopedKeyInput): string {
  const prefix = input.prefix.trim();
  const a = input.a.trim();
  const b = input.b.trim();
  if (!prefix || !a || !b) {
    throw new Error("scopedKey requires non-empty prefix, a, and b parts");
  }

  const digestLength = input.digestLength ?? DEFAULT_DIGEST_LENGTH;
  if (!Number.isInteger(digestLength) || digestLength <= 0 || digestLength > 64) {
    throw new Error("scopedKey digestLength must be an integer in [1, 64]");
  }

  const separator = input.separator ?? " ";
  return `${prefix}_${sha256(`${a}${separator}${b}`).slice(0, digestLength)}`;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
  options: CosineSimilarityOptions = {},
): number {
  const onMismatch = options.onMismatch ?? "zero";
  if (a.length !== b.length) {
    if (onMismatch === "throw") {
      throw new RangeError(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }
    return 0;
  }
  if (a.length === 0) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as number;
    const y = b[i] as number;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function defaultBaseEstimator(charsPerToken: number): BaseTokenEstimator {
  return (text: string): number => Math.ceil(text.length / charsPerToken);
}

export function estimateTokens(text: string, options: EstimateTokensOptions = {}): number {
  if (text.length === 0) return 0;
  const charsPerToken = options.charsPerToken ?? DEFAULT_CHARS_PER_TOKEN;
  if (!Number.isFinite(charsPerToken) || charsPerToken <= 0) {
    throw new Error("estimateTokens charsPerToken must be a positive finite number");
  }

  const correction = options.correction ?? DEFAULT_TOKEN_CORRECTION;
  if (!Number.isFinite(correction) || correction <= 0) {
    throw new Error("estimateTokens correction must be a positive finite number");
  }

  const base = options.base ?? defaultBaseEstimator(charsPerToken);
  return Math.ceil(base(text) * correction);
}
