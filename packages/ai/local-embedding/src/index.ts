export const DEFAULT_LOCAL_EMBEDDING_DIMENSIONS = 256;

export interface LocalEmbeddingOptions {
  readonly dimensions?: number;
  readonly includeCharacterBigrams?: boolean;
}

export function tokenizeLocalEmbeddingText(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [];
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function addHashedFeature(vector: number[], feature: string, weight: number): void {
  const hash = fnv1a(feature);
  const sign = (hash & 1) === 0 ? 1 : -1;
  const index = hash % vector.length;
  vector[index] = (vector[index] ?? 0) + sign * weight;
}

export function embedTextLocal(text: string, options: LocalEmbeddingOptions = {}): number[] {
  const dimensions = options.dimensions ?? DEFAULT_LOCAL_EMBEDDING_DIMENSIONS;
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new RangeError(`Local embedding dimensions must be a positive integer: ${dimensions}`);
  }

  const vector = new Array<number>(dimensions).fill(0);
  const tokens = tokenizeLocalEmbeddingText(text);
  for (const token of tokens) {
    addHashedFeature(vector, token, 1);
    if (options.includeCharacterBigrams ?? true) {
      for (let index = 0; index < token.length - 1; index += 1) {
        addHashedFeature(vector, `#${token.slice(index, index + 2)}`, 0.5);
      }
    }
  }

  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm === 0) {
    vector[0] = 1;
    return vector;
  }
  return vector.map((value) => value / norm);
}

export function embedTextLocalFloat32(
  text: string,
  options: LocalEmbeddingOptions = {},
): Float32Array {
  return Float32Array.from(embedTextLocal(text, options));
}
