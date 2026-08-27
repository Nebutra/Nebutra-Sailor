import { type ApiErrorResponse, getStatusCode, toApiError } from "@nebutra/errors";

/**
 * Shared error funnel for the gateway's RPC protocols (tRPC + oRPC).
 *
 * REST routes surface errors through `app.onError` → `toApiError(err)` +
 * `getStatusCode(err)` (see src/index.ts). To keep the three protocols
 * behaviourally consistent, tRPC and oRPC route their thrown errors through the
 * SAME `@nebutra/errors` machinery via the helpers below — a domain
 * `UnauthorizedError` becomes a 401 with an identical `{ error: { code, message } }`
 * envelope on REST, tRPC, and oRPC alike.
 */

/**
 * The subset of error-code names valid for BOTH tRPC (`TRPC_ERROR_CODE_KEY`) and
 * oRPC (`ORPCError` code string). Any `@nebutra/errors` status is collapsed onto
 * one of these so both adapters speak the same vocabulary.
 */
export type RpcErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR";

/** Map an HTTP status (from `getStatusCode`) onto the shared RPC code vocabulary. */
export function httpStatusToRpcCode(status: number): RpcErrorCode {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "TOO_MANY_REQUESTS";
    default:
      // 5xx and anything unmapped → generic server error (no detail leak).
      return "INTERNAL_SERVER_ERROR";
  }
}

export interface RpcError {
  /** Protocol-agnostic error code understood by both tRPC and oRPC. */
  code: RpcErrorCode;
  /** Exact HTTP status, so oRPC can set it explicitly. */
  status: number;
  /** Canonical `@nebutra/errors` envelope — byte-identical to the REST body. */
  api: ApiErrorResponse;
}

/**
 * Funnel any thrown value through `@nebutra/errors` and return the pieces each
 * RPC adapter needs (code + status + canonical envelope). Non-`AppError` values
 * collapse to a safe `INTERNAL_SERVER_ERROR` with no detail leak — matching the
 * REST layer's behaviour exactly.
 */
export function toRpcError(error: unknown): RpcError {
  const status = getStatusCode(error);
  return {
    code: httpStatusToRpcCode(status),
    status,
    api: toApiError(error),
  };
}
