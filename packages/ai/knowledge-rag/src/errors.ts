// =============================================================================
// @nebutra/knowledge-rag — Error type
// =============================================================================
// Every thrown error MUST carry an actionable `.suggestion` so callers always
// know how to fix it (DX acceptance criterion).
// =============================================================================

export interface KnowledgeRagErrorOptions {
  /** Actionable "how to fix" hint. Defaults to a generic message if omitted. */
  suggestion?: string;
  /** Stable machine-readable code (e.g. "E_TENANT_MISSING"). */
  code?: string;
  /** Underlying cause, preserved for logging. */
  cause?: unknown;
}

const DEFAULT_SUGGESTION =
  "Check the @nebutra/knowledge-rag README, or run getKnowledgeRag().doctor() for a structured health report.";

/**
 * The single error class for this package. Always has a non-empty
 * `.suggestion`; serialises cleanly for structured logging.
 */
export class KnowledgeRagError extends Error {
  readonly suggestion: string;
  readonly code: string;

  constructor(message: string, options: KnowledgeRagErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "KnowledgeRagError";
    this.suggestion =
      options.suggestion && options.suggestion.trim().length > 0
        ? options.suggestion
        : DEFAULT_SUGGESTION;
    this.code = options.code ?? "E_KNOWLEDGE_RAG";
    Object.setPrototypeOf(this, KnowledgeRagError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      suggestion: this.suggestion,
      code: this.code,
    };
  }
}
