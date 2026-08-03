/**
 * External-sandbox delegation seam (PORT — capability #11).
 *
 * Governance decision (dual-track, ExternalSandbox posture): this multi-tenant
 * web runtime NEVER executes untrusted code itself and introduces no isolation
 * infrastructure. It only:
 *   1. carries the capability policy (see ./policy),
 *   2. delegates execution to an external isolator behind this interface
 *      (Track B = **Carina** upstream kernel),
 *   3. records the outcome as a `command_execution` item (see ./model).
 *
 * The upstream OS enforcers (Seatbelt / Landlock / bubblewrap / Windows
 * restricted token) are deliberately NOT ported — they are single-host and
 * out of scope for a multi-tenant web product.
 *
 * @see docs/architecture/2026-08-03-carina-track-b-upstream.md
 */

import type { CapabilityPolicy } from "./policy";

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
  /** Carina permission decision id when present (audit correlation). */
  readonly decisionId?: string;
  /** Host correlation id sent on the wire (JSON-RPC id or extension). */
  readonly correlationId?: string;
}

/**
 * The only thing Track A depends on for execution. Implemented by a decoupled
 * isolator over Carina's public RPC catalog; never implemented in-process here.
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
        "code in-process; delegate to Carina (Track B) via createCarinaSandbox.",
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
    readonly code?: string,
  ) {
    super(message);
    this.name = "SandboxDelegationError";
  }
}

export class CarinaProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CarinaProtocolError";
  }
}

/**
 * Generic HTTP POST of a Sailor-shaped body. Prefer {@link createCarinaSandbox}
 * for production Track B — Carina owns the kernel and speaks JSON-RPC.
 */
export function createHttpSandbox(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  path = "/api/v1/sandbox/exec",
): ExternalSandbox {
  const endpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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
      const body = (await response.json()) as SandboxExecResult;
      if (!body.executedOn) {
        return { ...body, executedOn: "http-sandbox" };
      }
      return body;
    },
  };
}

// ── Carina v0.8.1 JSON-RPC mapping ───────────────────────────────────────────

/** Minimum `protocol_version` we accept from `gateway.hello` (Carina catalog). */
export const CARINA_MIN_PROTOCOL_VERSION = 1;

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: string | number;
  result: T;
  error?: undefined;
};

type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
  result?: undefined;
};

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

type CarinaDecision = {
  decision_id?: string;
  decision?: "allowed" | "denied" | "requires_approval";
  reason?: string;
};

type CarinaCommandResult = {
  exit_code?: number;
  duration_ms?: number;
  stdout?: string[];
  stderr?: string[];
  timed_out?: boolean;
};

type CarinaExecWire = {
  decision?: CarinaDecision;
  result?: CarinaCommandResult;
};

type CarinaHello = {
  protocol_version?: number;
  version?: string;
  features?: unknown;
  methods?: unknown;
};

export type CarinaSandboxOptions = {
  /**
   * Base URL of a Carina JSON-RPC endpoint reachable over HTTP POST.
   * Typically a local daemon bridge or product connector that forwards to
   * `~/.carina/daemon.sock` / Gateway WS — not a public multi-tenant API.
   */
  readonly baseUrl: string;
  /**
   * Gateway token (`gw1`, transport-bound) or product connector credential.
   * Never a local owner/admin unlock token.
   */
  readonly token?: string;
  readonly fetchImpl?: typeof fetch;
  /**
   * Path under baseUrl for JSON-RPC POST. Default `""` posts to baseUrl itself.
   * Connectors often use `/jsonrpc` or `/rpc`.
   */
  readonly rpcPath?: string;
  /** Fail closed if hello reports a lower protocol_version. Default {@link CARINA_MIN_PROTOCOL_VERSION}. */
  readonly minProtocolVersion?: number;
  /** Skip gateway.hello (tests only). Production should leave this false. */
  readonly skipHello?: boolean;
  /** Label when the wire body has no node id. */
  readonly executedOn?: string;
  /** Map Sailor thread → Carina `session_id`. Default: `threadId`. */
  readonly resolveSessionId?: (request: SandboxExecRequest) => string;
  /**
   * Optional client metadata sent on hello (discovery only — not an auth grant).
   */
  readonly clientId?: string;
};

export type CarinaEnsureSessionRequest = {
  /** Sailor thread id — used as cache key and default correlation. */
  readonly threadId: string;
  /** Absolute workspace path on the Carina host (catalog-required). */
  readonly workspaceRoot: string;
  readonly tenantId?: string;
  readonly profile?: string;
  /** Carina session approval_mode when supported by the daemon. */
  readonly approvalMode?: string;
};

/**
 * Track-B handle: {@link ExternalSandbox} plus host session lifecycle.
 * `command.exec` requires a Carina session; call {@link CarinaSandbox.ensureSession}
 * before the first exec for a thread (or let {@link registerCommandExecTool} do it).
 */
export interface CarinaSandbox extends ExternalSandbox {
  /**
   * Create (or reuse cached) Carina session for a Sailor thread.
   * Maps `threadId` → Carina `session_id` for subsequent `command.exec`.
   */
  ensureSession(request: CarinaEnsureSessionRequest): Promise<string>;
  /** Peek cached Carina session id for a Sailor thread, if any. */
  resolveMappedSessionId(threadId: string): string | undefined;
}

function extractCarinaSessionId(session: unknown): string {
  if (!session || typeof session !== "object") {
    throw new CarinaProtocolError("Carina session.create returned non-object Session");
  }
  const rec = session as Record<string, unknown>;
  for (const key of ["id", "session_id", "sessionId"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  throw new CarinaProtocolError(
    "Carina session.create Session missing id/session_id/sessionId",
  );
}

/**
 * Track-B adapter: Sailor control plane → **Carina** public RPC catalog (v0.8.1+).
 *
 * Mapping (Sailor → Carina, never the reverse ownership):
 * - `threadId` → `command.exec` `session_id` (via ensureSession cache, else threadId)
 * - `command` → `argv` via `/bin/sh -c` (kernel still gates the joined command string)
 * - denied / requires_approval → {@link SandboxDelegationError} (fail closed)
 * - allowed + CommandResult → {@link SandboxExecResult}
 * - host lifecycle → `session.create` via {@link CarinaSandbox.ensureSession}
 *
 * Kernel protocol is maintained in `Nebutra/carina`. This file only maps.
 *
 * @see docs/architecture/2026-08-03-carina-track-b-upstream.md
 */
export function createCarinaSandbox(options: CarinaSandboxOptions): CarinaSandbox {
  const {
    baseUrl,
    token,
    fetchImpl = fetch,
    rpcPath = "",
    minProtocolVersion = CARINA_MIN_PROTOCOL_VERSION,
    skipHello = false,
    executedOn = "carina",
    resolveSessionId,
    clientId = "nebutra-sailor",
  } = options;

  /** Sailor threadId → Carina session_id */
  const sessionByThread = new Map<string, string>();

  const endpoint = `${baseUrl.replace(/\/$/, "")}${
    !rpcPath ? "" : rpcPath.startsWith("/") ? rpcPath : `/${rpcPath}`
  }`;

  let helloDone: Promise<void> | null = null;
  let rpcId = 0;

  async function rpcCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = ++rpcId;
    const headers = new Headers({ "content-type": "application/json" });
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new SandboxDelegationError(
        `Carina transport error (${response.status}): ${detail}`,
        response.status,
        "transport_error",
      );
    }
    const body = (await response.json()) as JsonRpcResponse<T>;
    if (body.error) {
      throw new SandboxDelegationError(
        `Carina RPC ${method} failed (${body.error.code}): ${body.error.message}`,
        502,
        String(body.error.code),
      );
    }
    if (!("result" in body)) {
      throw new CarinaProtocolError(`Carina RPC ${method} returned no result`);
    }
    return body.result;
  }

  async function ensureHello(): Promise<void> {
    if (skipHello) return;
    if (!helloDone) {
      helloDone = (async () => {
        const hello = await rpcCall<CarinaHello>("gateway.hello", {
          protocol_version: minProtocolVersion,
          client_id: clientId,
        });
        const version = hello.protocol_version ?? 0;
        if (typeof version !== "number" || version < minProtocolVersion) {
          throw new CarinaProtocolError(
            `Carina protocol_version ${String(hello.protocol_version)} ` +
              `below required ${minProtocolVersion}`,
          );
        }
      })().catch((err) => {
        helloDone = null;
        throw err;
      });
    }
    await helloDone;
  }

  const defaultResolveSessionId = (r: SandboxExecRequest): string =>
    sessionByThread.get(r.threadId) ?? r.threadId;
  const mapSessionId = resolveSessionId ?? defaultResolveSessionId;

  return {
    resolveMappedSessionId(threadId: string): string | undefined {
      return sessionByThread.get(threadId);
    },

    async ensureSession(request: CarinaEnsureSessionRequest): Promise<string> {
      const cached = sessionByThread.get(request.threadId);
      if (cached) return cached;

      const root = request.workspaceRoot.trim();
      if (!root) {
        throw new CarinaProtocolError(
          "Carina session.create requires a non-empty workspaceRoot",
        );
      }

      await ensureHello();

      const params: Record<string, unknown> = { workspace_root: root };
      if (request.profile) params.profile = request.profile;
      if (request.approvalMode) params.approval_mode = request.approvalMode;
      // Audit hint only — not a privilege grant (cloud boundary).
      if (request.tenantId) params.tenant_id = request.tenantId;
      params.correlation_id = request.threadId;

      const session = await rpcCall<unknown>("session.create", params);
      const sessionId = extractCarinaSessionId(session);
      sessionByThread.set(request.threadId, sessionId);
      return sessionId;
    },

    async exec(request: SandboxExecRequest): Promise<SandboxExecResult> {
      assertSafePosture(request.capabilityPolicy);

      await ensureHello();

      const sessionId = mapSessionId(request);
      const argv = ["/bin/sh", "-c", request.command];
      const wire = await rpcCall<CarinaExecWire>("command.exec", {
        session_id: sessionId,
        argv,
        // Host correlation for audit — ignored if kernel drops unknown fields.
        correlation_id: `${request.tenantId}:${request.threadId}`,
        tenant_id: request.tenantId,
      });

      const decision = wire.decision?.decision ?? "denied";
      const decisionId = wire.decision?.decision_id;

      if (decision === "denied") {
        throw new SandboxDelegationError(
          `Carina denied command: ${wire.decision?.reason ?? "denied"}`,
          403,
          "denied",
        );
      }
      if (decision === "requires_approval") {
        throw new SandboxDelegationError(
          `Carina requires approval` + (decisionId ? ` (decision_id=${decisionId})` : ""),
          409,
          "requires_approval",
        );
      }

      const cr = wire.result;
      if (!cr) {
        throw new SandboxDelegationError(
          "Carina allowed exec but returned no CommandResult",
          502,
          "missing_result",
        );
      }

      const stdout = (cr.stdout ?? []).join("");
      const stderr = (cr.stderr ?? []).join("");
      const aggregatedOutput =
        stderr.length > 0 ? `${stdout}${stdout ? "\n" : ""}${stderr}` : stdout;

      return {
        exitCode: cr.exit_code ?? (cr.timed_out ? 124 : 0),
        aggregatedOutput,
        executedOn,
        // exactOptionalPropertyTypes: omit key when undefined
        ...(decisionId !== undefined ? { decisionId } : {}),
        correlationId: `${request.tenantId}:${request.threadId}`,
      };
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


// ── Env resolution + command-exec tool (Phase 2 host helpers) ────────────────

export type CarinaEnv = {
  readonly CARINA_JSONRPC_URL?: string;
  readonly CARINA_JSONRPC_TOKEN?: string;
  readonly CARINA_JSONRPC_PATH?: string;
  readonly CARINA_WORKSPACE_ROOT?: string;
  readonly CARINA_CLIENT_ID?: string;
};

/**
 * Resolve Track-B sandbox from environment.
 * - `CARINA_JSONRPC_URL` set → {@link createCarinaSandbox}
 * - unset / empty → {@link REFUSING_SANDBOX} (fail closed)
 */
export function resolveCarinaSandboxFromEnv(
  env: CarinaEnv = process.env as CarinaEnv,
  overrides: Partial<CarinaSandboxOptions> = {},
): ExternalSandbox {
  const baseUrl = env.CARINA_JSONRPC_URL?.trim();
  if (!baseUrl) return REFUSING_SANDBOX;

  const options: CarinaSandboxOptions = {
    baseUrl,
    ...(env.CARINA_JSONRPC_TOKEN ? { token: env.CARINA_JSONRPC_TOKEN } : {}),
    ...(env.CARINA_JSONRPC_PATH ? { rpcPath: env.CARINA_JSONRPC_PATH } : {}),
    ...(env.CARINA_CLIENT_ID ? { clientId: env.CARINA_CLIENT_ID } : {}),
    ...overrides,
  };
  return createCarinaSandbox(options);
}

export function isCarinaSandbox(sandbox: ExternalSandbox): sandbox is CarinaSandbox {
  return (
    typeof (sandbox as CarinaSandbox).ensureSession === "function" &&
    typeof (sandbox as CarinaSandbox).resolveMappedSessionId === "function"
  );
}

