/**
 * F2 Track C / W4 MVP — schema-compatible composition edges for agents.
 * Explicit tool.compose on a definition always wins over this seed map.
 *
 * Only list real registry ids. Edges are planner hints, not a workflow engine.
 */
export interface ComposeEdge {
  readonly next?: readonly string[];
  readonly prev?: readonly string[];
}

/**
 * Seed edges (≥15 tools with non-empty `next`). Bidirectional `prev` is
 * optional; agents mainly consume `next`.
 */
export const COMPOSE_EDGES: Readonly<Record<string, ComposeEdge>> = {
  "codec/base64": { next: ["codec/url", "codec/image-base64"] },
  "codec/url": { next: ["image/qr-generate"] },
  "codec/jwt-decode": { next: ["hash/hmac-verify"] },
  "data/json-format": { next: ["llm/json-schema-validate", "data/json-yaml"] },
  "data/json-yaml": { next: ["data/json-format"] },
  "data/json-csv": { next: ["data/csv-preview"] },
  "data/csv-preview": { next: ["data/csv-columns", "data/csv-diff"] },
  "data/json-diff": { next: ["data/json-format"] },
  "dev/url-validate": { next: ["image/qr-generate", "codec/url"] },
  "dev/secret-scan": { next: ["security/secret-generate", "security/password-generate"] },
  "dev/uuid": { next: ["dev/nanoid"] },
  "doc/md-to-html": { next: ["doc/md-to-pdf"] },
  "doc/pdf-text": { next: ["llm/token-count"] },
  "hash/md5": { next: ["hash/sha256"] },
  "hash/sha256": { next: ["hash/hash-compare", "hash/hmac"] },
  "image/exif-viewer": { next: ["image/exif-strip"] },
  "image/qr-generate": { next: ["image/qr-decode"] },
  "llm/token-count": { next: ["llm/cost-estimate"] },
  "llm/json-schema-validate": { next: ["data/json-format"] },
  "security/password-generate": { next: ["security/password-strength"] },
  "text/diff": { next: ["text/find-replace-regex", "text/replace"] },
  "text/word-count": { next: ["llm/token-count", "text/reading-time"] },
  "text/zh-cn-tw": { next: ["text/pinyin"] },
  "text/isbn": { next: ["life/ean-upc-gtin"] },
  "time/unix-timestamp": { next: ["time/timezone", "time/world-clock"] },
  "time/timezone": { next: ["time/world-clock"] },
};

/** Merge seed map with optional definition-level compose. Definition wins. */
export function resolveToolCompose(
  toolId: string,
  explicit?: ComposeEdge,
): ComposeEdge | undefined {
  if (explicit?.next?.length || explicit?.prev?.length) {
    return {
      ...(explicit.prev?.length ? { prev: explicit.prev } : {}),
      ...(explicit.next?.length ? { next: explicit.next } : {}),
    };
  }
  const seeded = COMPOSE_EDGES[toolId];
  if (!seeded) return undefined;
  return {
    ...(seeded.prev?.length ? { prev: seeded.prev } : {}),
    ...(seeded.next?.length ? { next: seeded.next } : {}),
  };
}
