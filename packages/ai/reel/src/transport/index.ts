/**
 * @nebutra/reel/transport — unified http-json / http-sse / ws-stream layer
 * with a per-model capability schema and a pre-flight contract validator.
 */

export {
  buildDefaultCapabilitySchema,
  normalizeCapabilitySchema,
  normalizeTransportMode,
  normalizeTransportOptions,
  valueByPath,
} from "./capability";
export { isContractValid, validateTransportContract } from "./contract";
export { type ExecuteDeps, executeTransport, type WsLike } from "./execute";
export {
  type CapabilitySchema,
  type ContractIssue,
  DEFAULT_TRANSPORT_OPTIONS,
  type ModelContractEntry,
  TRANSPORT_HTTP_JSON,
  TRANSPORT_HTTP_SSE,
  TRANSPORT_WS_STREAM,
  type TransportMode,
  type TransportOptions,
  type TransportRequest,
  type TransportResult,
} from "./types";
