/**
 * NODE_IO_ENVELOPE v1.0 — builder, validator, merge.
 *
 * Validity rules are kept identical to the absorbed contract so any persisted
 * envelope from the original semantics round-trips: version must equal "1.0",
 * `text`/`media` must be arrays, every text entry a string, every media item
 * `{type: image|video, url: non-empty}`, `meta` an object.
 */

import {
  NODE_IO_ENVELOPE_VERSION,
  type NodeIOEnvelope,
  type ReelMediaItem,
  type ReelMediaKind,
} from "./types";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

/** Coerce a loose media type, falling back to URL sniffing. */
export function normalizeMediaKind(type: unknown, url = ""): ReelMediaKind {
  const raw = String(type ?? "")
    .trim()
    .toLowerCase();
  if (raw === "image" || raw === "video") return raw;
  return VIDEO_EXT.test(url) || /\bvideo\b/i.test(url) ? "video" : "image";
}

function isMediaItemValid(item: unknown): item is ReelMediaItem {
  if (!item || typeof item !== "object") return false;
  const url = String((item as { url?: unknown }).url ?? "").trim();
  if (!url) return false;
  const kind = normalizeMediaKind((item as { type?: unknown }).type, url);
  return kind === "image" || kind === "video";
}

/** Exact-rules validity check for an unknown value. */
export function isEnvelopeValid(value: unknown): value is NodeIOEnvelope {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  if (String(e.version ?? "") !== NODE_IO_ENVELOPE_VERSION) return false;
  if (!Array.isArray(e.text) || !Array.isArray(e.media)) return false;
  if (e.text.some((t) => typeof t !== "string")) return false;
  if (e.media.some((m) => !isMediaItemValid(m))) return false;
  if (!e.meta || typeof e.meta !== "object") return false;
  return true;
}

export interface BuildEnvelopeInput {
  readonly sourceNodeId: string;
  readonly sourceNodeType: string;
  readonly inputType: string;
  readonly targetNodeId?: string;
  readonly text?: readonly string[];
  readonly media?: ReadonlyArray<{ type?: unknown; url: string }>;
}

/** Build a well-formed, kind-discriminated envelope. */
export function buildEnvelope(input: BuildEnvelopeInput): NodeIOEnvelope {
  const text = (input.text ?? []).filter((t) => typeof t === "string");
  const media: ReelMediaItem[] = (input.media ?? [])
    .map((m) => ({ type: normalizeMediaKind(m.type, m.url), url: String(m.url).trim() }))
    .filter((m) => m.url.length > 0);

  const hasText = text.length > 0;
  const hasMedia = media.length > 0;
  const kind = hasText && hasMedia ? "mixed" : hasMedia ? "media" : "text";

  return {
    version: NODE_IO_ENVELOPE_VERSION,
    kind,
    text,
    media,
    meta: {
      sourceNodeId: input.sourceNodeId,
      sourceNodeType: input.sourceNodeType,
      ...(input.targetNodeId ? { targetNodeId: input.targetNodeId } : {}),
      inputType: input.inputType,
    },
  };
}

/**
 * Concatenate envelopes feeding the same input port (multiple upstream
 * producers). Text and media are concatenated in producer order; `meta` is
 * taken from the first so routing stays deterministic.
 */
export function mergeEnvelopes(envelopes: readonly NodeIOEnvelope[]): NodeIOEnvelope | null {
  if (envelopes.length === 0) return null;
  const first = envelopes[0];
  if (!first) return null;
  if (envelopes.length === 1) return first;

  const text = envelopes.flatMap((e) => [...e.text]);
  const media = envelopes.flatMap((e) => [...e.media]);
  const kind = text.length > 0 && media.length > 0 ? "mixed" : media.length > 0 ? "media" : "text";
  return { version: NODE_IO_ENVELOPE_VERSION, kind, text, media, meta: first.meta };
}
