"use client";

import { Check, Sparkles as Gift, LoaderCircle as Loader2 } from "@nebutra/icons";
import { useId, useState } from "react";

/**
 * TEMPLATE — Redemption code input.
 *
 * Currently not wired to a live `/api/redemption-codes/redeem` endpoint.
 * The `RedemptionCode` + `CodeRedemption` Prisma models exist. Activation:
 *   1. POST /api/redemption-codes/redeem { code }
 *      → validates the code, inserts CodeRedemption, applies reward
 *   2. Wire `onRedeem` prop to call that endpoint
 *
 * Suitable surfaces: /billing footer, /usage page header, onboarding flow.
 */

type State = "idle" | "submitting" | "success" | "error";

interface Props {
  /**
   * Async hook that validates + redeems the code. Returns a success message
   * to show inline. Throw to display an error message.
   *
   * Defaults to a no-op that always errors with "Redemption is not enabled",
   * keeping the form honest until the API is wired.
   */
  onRedeem?: (code: string) => Promise<{ message: string }>;
  /** Visual density. */
  density?: "compact" | "comfortable";
}

const DEFAULT_REDEEM: NonNullable<Props["onRedeem"]> = async () => {
  throw new Error("Redemption is not enabled yet.");
};

export function RedemptionCodeInput({ onRedeem = DEFAULT_REDEEM, density = "comfortable" }: Props) {
  const inputId = useId();
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || state === "submitting") return;
    setState("submitting");
    setMessage(null);
    try {
      const result = await onRedeem(trimmed);
      setState("success");
      setMessage(result.message);
      setCode("");
      // Reset visual after a moment.
      setTimeout(() => {
        setState("idle");
        setMessage(null);
      }, 4000);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Failed to redeem this code");
    }
  }

  const padding = density === "compact" ? "p-3" : "p-4";

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border border-neutral-7 bg-neutral-1 dark:border-white/10 dark:bg-white/[0.02] ${padding}`}
      aria-labelledby={`${inputId}-label`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-2 text-neutral-11 dark:bg-white/10 dark:text-white/60">
          <Gift className="h-3.5 w-3.5" />
        </div>
        <label
          id={`${inputId}-label`}
          htmlFor={inputId}
          className="text-xs font-medium text-neutral-11 dark:text-white/70"
        >
          Have a redemption code?
        </label>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 40))}
          disabled={state === "submitting"}
          placeholder="ENTER-CODE"
          className="flex-1 rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-1.5 font-mono text-sm uppercase tracking-wider text-neutral-12 placeholder:text-neutral-9 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/30"
          aria-describedby={message ? `${inputId}-message` : undefined}
        />
        <button
          type="submit"
          disabled={!code.trim() || state === "submitting"}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {state === "submitting" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : state === "success" ? (
            <Check className="h-3 w-3" />
          ) : null}
          Redeem
        </button>
      </div>

      {message && (
        <p
          id={`${inputId}-message`}
          className={`mt-2 text-xs ${
            state === "success"
              ? "text-green-11 dark:text-green-9"
              : state === "error"
                ? "text-red-11"
                : "text-neutral-11 dark:text-white/70"
          }`}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
