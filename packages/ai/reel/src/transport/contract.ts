/**
 * Contract validator — rejects template/capability/transport mismatches before
 * a request is ever sent. Kept faithful to the absorbed rule set (messages
 * re-authored in English): a multipart body needs multipart capability, an
 * enabled request-chain needs chain capability + non-empty steps, an SSE/WS
 * transport needs the matching capability, plus two soft warnings.
 */

import { normalizeCapabilitySchema, normalizeTransportMode, valueByPath } from "./capability";
import type { ContractIssue, ModelContractEntry } from "./types";

export function validateTransportContract(entry: ModelContractEntry): ContractIssue[] {
  const issues: ContractIssue[] = [];
  if (!entry || typeof entry !== "object") return issues;

  const caps = normalizeCapabilitySchema(entry.capabilities, entry.type);
  const template = entry.requestTemplate ?? {};
  const chain = entry.requestChain;
  const mode = normalizeTransportMode(entry.transport);
  const bodyType = String(template.bodyType ?? "").toLowerCase();

  if (bodyType === "multipart" && !caps.supportsMultipart) {
    issues.push({
      level: "error",
      code: "cap_multipart",
      message: "requestTemplate uses multipart but capabilities.supportsMultipart is false",
    });
  }

  if (chain?.enabled) {
    if (!caps.supportsRequestChain) {
      issues.push({
        level: "error",
        code: "cap_chain",
        message: "requestChain is enabled but capabilities.supportsRequestChain is false",
      });
    }
    if (!Array.isArray(chain.steps) || chain.steps.length === 0) {
      issues.push({
        level: "error",
        code: "chain_empty",
        message: "requestChain is enabled but has no steps",
      });
    }
  }

  if (mode === "http-sse" && !caps.supportsSSE) {
    issues.push({
      level: "error",
      code: "cap_sse",
      message: "transport is http-sse but capabilities.supportsSSE is false",
    });
  }
  if (mode === "ws-stream" && !caps.supportsWS) {
    issues.push({
      level: "error",
      code: "cap_ws",
      message: "transport is ws-stream but capabilities.supportsWS is false",
    });
  }

  if (mode === "http-sse" && valueByPath(template.body ?? {}, "stream") !== true) {
    issues.push({
      level: "warning",
      code: "sse_stream_flag",
      message: "transport http-sse usually requires body.stream = true",
    });
  }
  if (mode === "ws-stream" && template.endpoint && !/^wss?:\/\//i.test(String(template.endpoint))) {
    issues.push({
      level: "warning",
      code: "ws_endpoint",
      message: "ws-stream endpoint should use ws:// or wss://",
    });
  }

  return issues;
}

/** True iff no `error`-level issues (warnings are allowed). */
export function isContractValid(entry: ModelContractEntry): boolean {
  return !validateTransportContract(entry).some((i) => i.level === "error");
}
