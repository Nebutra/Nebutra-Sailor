/**
 * Capability schema + transport/option normalization.
 *
 * Rules kept identical to the absorbed contract: media types imply multipart,
 * chat types imply tools, everything else is opt-in and normalized with strict
 * `=== true` so a loose config can't accidentally enable a transport.
 */

import {
  type CapabilitySchema,
  DEFAULT_TRANSPORT_OPTIONS,
  type TransportMode,
  type TransportOptions,
} from "./types";

export function buildDefaultCapabilitySchema(type?: string): CapabilitySchema {
  const modelType = String(type ?? "Chat");
  const isChat = modelType === "Chat" || modelType === "ChatImage";
  const isMedia = modelType === "Image" || modelType === "Video" || modelType === "ChatImage";
  return {
    supportsMultipart: isMedia,
    supportsRequestChain: false,
    supportsSSE: false,
    supportsWS: false,
    supportsTools: isChat,
  };
}

export function normalizeCapabilitySchema(
  capabilities: Partial<CapabilitySchema> | undefined,
  type?: string,
): CapabilitySchema {
  const defaults = buildDefaultCapabilitySchema(type);
  if (!capabilities || typeof capabilities !== "object") return defaults;
  return {
    supportsMultipart: capabilities.supportsMultipart === true,
    supportsRequestChain: capabilities.supportsRequestChain === true,
    supportsSSE: capabilities.supportsSSE === true,
    supportsWS: capabilities.supportsWS === true,
    supportsTools: capabilities.supportsTools === true,
  };
}

export function normalizeTransportMode(value: unknown): TransportMode {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "http-sse") return "http-sse";
  if (raw === "ws-stream") return "ws-stream";
  return "http-json";
}

export function normalizeTransportOptions(
  options: Partial<TransportOptions> | undefined,
): TransportOptions {
  if (!options || typeof options !== "object") {
    return { ...DEFAULT_TRANSPORT_OPTIONS };
  }
  return {
    sseDataPrefix: String(options.sseDataPrefix || DEFAULT_TRANSPORT_OPTIONS.sseDataPrefix),
    sseDoneToken: String(options.sseDoneToken || DEFAULT_TRANSPORT_OPTIONS.sseDoneToken),
    sseDeltaPath: String(options.sseDeltaPath || ""),
    sseDelimiter: String(options.sseDelimiter || DEFAULT_TRANSPORT_OPTIONS.sseDelimiter),
    wsMessagePath: String(options.wsMessagePath || ""),
    wsDoneToken: String(options.wsDoneToken || DEFAULT_TRANSPORT_OPTIONS.wsDoneToken),
  };
}

/** Read a dot-path out of a parsed object; "" returns the whole value. */
export function valueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}
