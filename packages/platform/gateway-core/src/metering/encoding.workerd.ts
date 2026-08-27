/**
 * Workers build: no tokenizer.
 *
 * Returning null makes countTokens fall through to its existing character
 * heuristic, which is the same path it already takes for any model whose
 * encoding is unknown. The exact count is not what gets billed — usage comes
 * back from the upstream provider — so this is a fallback estimator losing
 * some precision, not a billing change.
 *
 * The alternative was shipping several megabytes of BPE rank tables that must
 * be parsed at import, inside a startup budget measured in hundreds of
 * milliseconds.
 */
export function getEncoding(_name: string): null {
  return null;
}
