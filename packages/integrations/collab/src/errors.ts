/**
 * Every failure surfaced by this package is a `CollabError`. The contract is
 * deliberately strict: a machine-stable `code` and a human-actionable
 * `suggestion` are MANDATORY, so no code path can throw a bare `Error` that
 * leaves a caller without a remediation hint.
 *
 * Mechanics (code/suggestion/toJSON/empty-suggestion fallback) are inherited
 * from the shared `@nebutra/capability-kit` `CapabilityError`; this subclass
 * only pins collab's error name + its package-specific fallback wording, so
 * the observable contract is unchanged.
 */

import { CapabilityError } from "@nebutra/capability-kit";

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

export class CollabError extends CapabilityError {
  declare readonly code: CollabErrorCode;

  constructor(message: string, init: CollabErrorInit) {
    super(message, init, {
      name: "CollabError",
      emptySuggestionFallback:
        "No suggestion was provided. This is a bug in @nebutra/collab — " +
        "report it with the failing operation.",
    });
  }
}
