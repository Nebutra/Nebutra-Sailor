/**
 * @nebutra/provider-factory — the neutral provider-resolution primitive.
 *
 * Every provider-agnostic Nebutra package (queue, search, notifications,
 * vault, uploads, …) repeated the exact same selection:
 *
 *   providerType = explicit ?? env[`${X}_PROVIDER`] ?? detect-chain ?? fallback
 *
 * plus a "refuse the in-memory provider in production" guard. That selection
 * is identical and domain-free; only the subsequent *instantiation* switch
 * (dynamic-importing the concrete provider) is domain-specific and stays in
 * each package. This module owns the selection, nothing else.
 */

/** One auto-detection rule: pick `provider` when `when()` is true. */
export interface ProviderDetector<T extends string> {
  readonly provider: T;
  readonly when: () => boolean;
}

/** `true` when the named env var is set to a non-empty (trimmed) value. */
export function envPresent(name: string): () => boolean {
  return () => {
    const v = process.env[name];
    return typeof v === "string" && v.trim().length > 0;
  };
}

export interface ResolveProviderInput<T extends string> {
  /** Explicit caller config — highest precedence. */
  readonly explicit?: T | undefined;
  /** Env var holding an explicit provider name (e.g. `QUEUE_PROVIDER`). */
  readonly envVarName: string;
  /** Ordered auto-detection rules; first match wins. */
  readonly detectors: ReadonlyArray<ProviderDetector<T>>;
  /** Used when nothing else resolves. */
  readonly fallback: T;
}

/**
 * Resolve the provider type. Precedence: explicit → env var → detector chain
 * (in order) → fallback. An empty/whitespace env var is ignored.
 */
export function resolveProviderType<T extends string>(input: ResolveProviderInput<T>): T {
  if (input.explicit) return input.explicit;
  const fromEnv = process.env[input.envVarName]?.trim();
  if (fromEnv) return fromEnv as T;
  for (const d of input.detectors) {
    if (d.when()) return d.provider;
  }
  return input.fallback;
}

export interface ProdGuardOptions<T extends string> {
  /** Providers that must not run in production. */
  readonly disallowedInProd: readonly T[];
  /** Env var that, when "true", permits the disallowed provider anyway. */
  readonly overrideEnv: string;
  /** Optional remediation hint appended to the default error. */
  readonly hint?: string;
  /**
   * Exact error message to throw, overriding the default. Use this to keep a
   * package's existing wording (error strings are domain copy, not shared
   * logic — only the prod-detection is shared).
   */
  readonly message?: string;
}

/**
 * Refuse a disallowed provider in production unless the override env is set.
 * No-op outside `NODE_ENV==="production"`.
 */
export function assertProviderAllowed<T extends string>(
  provider: T,
  opts: ProdGuardOptions<T>,
): void {
  if (process.env.NODE_ENV !== "production") return;
  if (!opts.disallowedInProd.includes(provider)) return;
  if (process.env[opts.overrideEnv] === "true") return;
  if (opts.message) throw new Error(opts.message);
  throw new Error(
    `Refusing to use the "${provider}" provider in production. ` +
      `${opts.hint ? `${opts.hint}. ` : ""}` +
      `Set ${opts.overrideEnv}=true for an explicit temporary override.`,
  );
}
