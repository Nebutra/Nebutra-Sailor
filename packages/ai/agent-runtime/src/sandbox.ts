/**
 * External-sandbox delegation seam (PORT — capability #11).
 *
 * Governance decision (dual-track, ExternalSandbox posture): this multi-tenant
 * web runtime NEVER executes untrusted code itself and introduces no isolation
 * infrastructure. It only:
 *   1. carries the capability policy (see ./policy),
 *   2. delegates execution to an external isolator behind this interface
 *      (a self-hosted kernel sidecar — Track B — or any other executor),
 *   3. records the outcome as a `command_execution` item (see ./model).
 *
 * The upstream OS enforcers (Seatbelt / Landlock / bubblewrap / Windows
 * restricted token) are deliberately NOT ported — they are single-host and
 * out of scope for a multi-tenant web product.
 */

import type { CapabilityPolicy } from "./policy.js";

export interface SandboxExecRequest {
  /** Mandatory tenant scope — every delegated exec is tenant-bound. */
  readonly tenantId: string;
  readonly threadId: string;
  readonly command: string;
  /** The capabilities the external isolator must honor. */
  readonly capabilityPolicy: CapabilityPolicy;
  /** Optional inputs the executor should materialize before running. */
  readonly inputs?: Readonly<Record<string, string>>;
}

export interface SandboxExecResult {
  readonly exitCode: number;
  readonly aggregatedOutput: string;
  /** Identifier of the isolator that actually ran the command. */
  readonly executedOn: string;
}

/**
 * The only thing Track A depends on for execution. Implemented by a decoupled
 * isolator over the ./protocol contract; never implemented in-process here.
 */
export interface ExternalSandbox {
  exec(request: SandboxExecRequest): Promise<SandboxExecResult>;
}

/**
 * Fail-closed default. Wiring this in production requires a real
 * {@link ExternalSandbox}; absent one, untrusted code never runs — by design.
 */
export class NoExecutorConfiguredError extends Error {
  constructor() {
    super(
      "No ExternalSandbox configured. This runtime never executes untrusted " +
        "code in-process; delegate to a decoupled isolator (Track B).",
    );
    this.name = "NoExecutorConfiguredError";
  }
}

export const REFUSING_SANDBOX: ExternalSandbox = {
  async exec(): Promise<SandboxExecResult> {
    throw new NoExecutorConfiguredError();
  },
};

export class SandboxDelegationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SandboxDelegationError";
  }
}

/**
 * The concrete Track-B coupling: delegate execution over HTTP to the decoupled
 * Rust isolator (`backends/rust/sandbox`, `POST /api/v1/sandbox/exec`). The
 * isolator is fail-closed; a non-2xx (e.g. 403 refusal) is surfaced as an
 * error and never coerced into a fabricated result.
 */
export function createHttpSandbox(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): ExternalSandbox {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/v1/sandbox/exec`;
  return {
    async exec(request: SandboxExecRequest): Promise<SandboxExecResult> {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new SandboxDelegationError(
          `Isolator refused execution (${response.status}): ${detail}`,
          response.status,
        );
      }
      return (await response.json()) as SandboxExecResult;
    },
  };
}

/** Guard: reject the most dangerous posture unless explicitly opted in. */
export function assertSafePosture(policy: CapabilityPolicy, allowDanger = false): void {
  if (policy.kind === "danger_full_access" && !allowDanger) {
    throw new Error(
      "danger_full_access capability policy refused: not permitted for " +
        "multi-tenant delegation without explicit opt-in.",
    );
  }
}
