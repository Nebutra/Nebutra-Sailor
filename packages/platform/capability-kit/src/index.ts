/**
 * @nebutra/capability-kit — neutral primitives every capability package
 * re-implemented near-identically:
 *
 *  - `CapabilityError`: an Error with a machine-stable `code`, a mandatory
 *    human `suggestion`, and `toJSON()`. Subclasses keep their own name +
 *    empty-suggestion fallback so existing contracts are preserved.
 *  - `DoctorReportBase` / `DoctorCheck`: the shared health-report shape.
 *  - `runCapabilityCli`: the `doctor` / `debug <arg>` argv switch that ~9
 *    `src/cli.ts` files copied verbatim.
 *  - `selectCapabilityTenant` / `requireCapabilityTenant`: package-local
 *    explicit-tenant/default-tenant selection. Request-scoped tenant context,
 *    RLS, and tenant isolation still belong to `@nebutra/tenant`.
 */

export interface CapabilityErrorInit {
  readonly code: string;
  /** Actionable remediation hint. Empty falls back (see opts). */
  readonly suggestion: string;
  readonly cause?: unknown;
}

export interface CapabilityErrorOptions {
  /** Subclass error name (defaults to "CapabilityError"). */
  readonly name?: string;
  /** Message used when `suggestion` is empty/blank. */
  readonly emptySuggestionFallback?: string;
}

const DEFAULT_EMPTY_SUGGESTION =
  "No suggestion was provided. This is a bug — report it with the failing operation.";

export class CapabilityError extends Error {
  readonly code: string;
  readonly suggestion: string;

  constructor(message: string, init: CapabilityErrorInit, opts?: CapabilityErrorOptions) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = opts?.name ?? "CapabilityError";
    this.suggestion =
      init.suggestion && init.suggestion.trim().length > 0
        ? init.suggestion
        : (opts?.emptySuggestionFallback ?? DEFAULT_EMPTY_SUGGESTION);
    this.code = init.code;
    // new.target keeps `instanceof` correct for every subclass.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { name: string; message: string; code: string; suggestion: string } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      suggestion: this.suggestion,
    };
  }
}

export interface CapabilityTenantSelection {
  readonly explicit?: string | undefined;
  readonly fallback?: string | undefined;
}

export interface RequireCapabilityTenantOptions extends CapabilityTenantSelection {
  readonly onMissing: () => Error;
}

export function selectCapabilityTenant(selection: CapabilityTenantSelection): string | null {
  if (selection.explicit !== undefined) {
    const explicit = selection.explicit.trim();
    return explicit.length > 0 ? explicit : null;
  }

  const fallback = selection.fallback?.trim();
  if (fallback) return fallback;

  return null;
}

export function requireCapabilityTenant(options: RequireCapabilityTenantOptions): string {
  const tenantId = selectCapabilityTenant(options);
  if (tenantId) return tenantId;
  throw options.onMissing();
}

/** One health probe result. */
export interface DoctorCheck {
  readonly ok: boolean;
  readonly detail: string;
}

/** The minimal shared doctor-report shape; packages may extend it. */
export interface DoctorReportBase {
  readonly ok: boolean;
  readonly durationMs: number;
}

export interface RunCapabilityCliOptions {
  /** Capability name stamped onto every output object. */
  readonly capability: string;
  /** `doctor` handler — returns a (serializable) health report. */
  readonly doctor: () => Promise<unknown> | unknown;
  /** Optional `debug <arg>` handler — returns a serializable inspection. */
  readonly debug?: (arg?: string) => Promise<unknown> | unknown;
  /** Defaults to `process.argv`. Injectable for tests. */
  readonly argv?: readonly string[];
  /** Defaults to `process.stdout.write`. Injectable for tests. */
  readonly write?: (s: string) => void;
  /** Defaults to `process.stderr.write`. Injectable for tests. */
  readonly writeErr?: (s: string) => void;
  /** Defaults to setting `process.exitCode`. Injectable for tests. */
  readonly onUnknown?: (command: string) => void;
}

/**
 * The `doctor` / `debug` argv switch shared by every capability CLI. Output
 * is always `{ capability, ...result }` as pretty JSON — identical to what
 * the hand-rolled cli.ts files produced.
 */
export async function runCapabilityCli(opts: RunCapabilityCliOptions): Promise<void> {
  const argv = opts.argv ?? process.argv;
  const write = opts.write ?? ((s: string) => void process.stdout.write(s));
  const writeErr = opts.writeErr ?? ((s: string) => void process.stderr.write(s));
  const command = argv[2] ?? "doctor";

  if (command === "doctor") {
    const report = await opts.doctor();
    write(`${JSON.stringify({ capability: opts.capability, ...(report as object) }, null, 2)}\n`);
    return;
  }
  if (command === "debug" && opts.debug) {
    const result = await opts.debug(argv[3]);
    write(`${JSON.stringify({ capability: opts.capability, ...(result as object) }, null, 2)}\n`);
    return;
  }
  if (opts.onUnknown) opts.onUnknown(command);
  else {
    writeErr(`Unknown ${opts.capability} command: ${command}\n`);
    process.exitCode = 1;
  }
}
