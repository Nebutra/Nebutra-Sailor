/**
 * Every failure surfaced by this package is a `CollabError`. The contract is
 * deliberately strict: a machine-stable `code` and a human-actionable
 * `suggestion` are MANDATORY constructor args, so no code path can throw a
 * bare `Error` that leaves a caller without a remediation hint.
 */

export type CollabErrorCode =
  | "COLLAB_INVALID_TENANT"
  | "COLLAB_INVALID_ROOM"
  | "COLLAB_SNAPSHOT_FAILED"
  | "COLLAB_RESTORE_FAILED"
  | "COLLAB_DESTROYED"
  | "COLLAB_TEST"
  | (string & {});

export interface CollabErrorInit {
  readonly code: CollabErrorCode;
  /** A non-empty, actionable remediation hint. */
  readonly suggestion: string;
  readonly cause?: unknown;
}

export class CollabError extends Error {
  readonly code: CollabErrorCode;
  readonly suggestion: string;

  constructor(message: string, init: CollabErrorInit) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = "CollabError";
    if (!init.suggestion || init.suggestion.trim().length === 0) {
      // A CollabError without a suggestion would defeat the whole contract.
      this.suggestion =
        "No suggestion was provided. This is a bug in @nebutra/collab — " +
        "report it with the failing operation.";
    } else {
      this.suggestion = init.suggestion;
    }
    this.code = init.code;
    Object.setPrototypeOf(this, CollabError.prototype);
  }
}
