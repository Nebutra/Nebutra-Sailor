import { CapabilityError } from "@nebutra/capability-kit";

/** Every cinema failure is a CinemaError (code + actionable suggestion). */
export class CinemaError extends CapabilityError {
  constructor(message: string, init: { code: string; suggestion: string; cause?: unknown }) {
    super(message, init, {
      name: "CinemaError",
      emptySuggestionFallback:
        "No suggestion was provided. This is a bug in @nebutra/cinema — " +
        "report it with the failing stage.",
    });
  }
}
