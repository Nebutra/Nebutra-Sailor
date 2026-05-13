"use client";

import { toast } from "@nebutra/ui/primitives";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";

/**
 * TEMPLATE — Personalization profile editor.
 *
 * Currently not wired to a live `/api/me/profile` route. The `UserProfile`
 * Prisma model exists. Activation path:
 *   1. GET /api/me/profile (returns current profile or null)
 *   2. POST /api/me/profile (upsert by userId)
 *   3. Inject `customInstructions` into chat system prompt in /api/chat
 *      (concat with mode-specific prompt, behind a "personalized" flag)
 *
 * Drop into /settings (under General) or a dedicated /settings/personalization
 * route once activated.
 */

export interface ProfileFormValue {
  nickname: string;
  occupation: string;
  bio: string;
  customInstructions: string;
}

const EMPTY_VALUE: ProfileFormValue = {
  nickname: "",
  occupation: "",
  bio: "",
  customInstructions: "",
};

const BIO_MAX = 2000;
const CUSTOM_INSTRUCTIONS_MAX = 3000;
const NICKNAME_MAX = 80;
const OCCUPATION_MAX = 120;

interface Props {
  /** Initial form state. Pass null for a fresh, empty form. */
  initialValue?: ProfileFormValue | null;
  /**
   * Async save handler. Defaults to a stub that errors with
   * "Personalization is not enabled" — keeps the form honest until the API
   * route is wired.
   */
  onSave?: (value: ProfileFormValue) => Promise<void>;
}

const DEFAULT_SAVE: NonNullable<Props["onSave"]> = async () => {
  throw new Error("Personalization is not enabled yet.");
};

export function PersonalizationPanel({ initialValue, onSave = DEFAULT_SAVE }: Props) {
  const nicknameId = useId();
  const occupationId = useId();
  const bioId = useId();
  const instructionsId = useId();

  const [value, setValue] = useState<ProfileFormValue>(initialValue ?? EMPTY_VALUE);
  const [savedValue, setSavedValue] = useState<ProfileFormValue>(initialValue ?? EMPTY_VALUE);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Reset when caller swaps initialValue (e.g. after refetch).
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      setSavedValue(initialValue);
    }
  }, [initialValue]);

  const dirty =
    value.nickname !== savedValue.nickname ||
    value.occupation !== savedValue.occupation ||
    value.bio !== savedValue.bio ||
    value.customInstructions !== savedValue.customInstructions;

  function update<K extends keyof ProfileFormValue>(key: K, next: ProfileFormValue[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || submitting) return;
    setSubmitting(true);

    try {
      await onSave(value);
      startTransition(() => {
        setSavedValue(value);
        setSavedAt(Date.now());
      });
      toast.success("Profile saved", {
        description: "Sailor will use these in future conversations.",
      });
    } catch (err) {
      toast.error("Failed to save profile", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setValue(savedValue);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-9" />
          <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
            Personalization
          </h2>
        </div>
        <p className="text-sm text-neutral-11 dark:text-white/70">
          Tell Sailor what you do and how you want it to respond. These details are injected into
          every conversation as context.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={nicknameId} label="Nickname" hint={`${value.nickname.length}/${NICKNAME_MAX}`}>
          <input
            id={nicknameId}
            type="text"
            value={value.nickname}
            onChange={(e) => update("nickname", e.target.value.slice(0, NICKNAME_MAX))}
            placeholder="What should Sailor call you?"
            disabled={submitting}
            className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40"
          />
        </Field>
        <Field
          id={occupationId}
          label="Occupation"
          hint={`${value.occupation.length}/${OCCUPATION_MAX}`}
        >
          <input
            id={occupationId}
            type="text"
            value={value.occupation}
            onChange={(e) => update("occupation", e.target.value.slice(0, OCCUPATION_MAX))}
            placeholder="e.g. Product Designer, Software Engineer"
            disabled={submitting}
            className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40"
          />
        </Field>
      </div>

      <Field
        id={bioId}
        label="More about you"
        description="Background, preferences, location — anything that helps Sailor understand you better."
        hint={`${value.bio.length}/${BIO_MAX}`}
        overLimit={value.bio.length > BIO_MAX}
      >
        <textarea
          id={bioId}
          rows={5}
          value={value.bio}
          onChange={(e) => update("bio", e.target.value)}
          placeholder="I work in fintech, building infra for embedded payments. I prefer direct, technical answers without too many caveats…"
          disabled={submitting}
          className="w-full resize-none rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm leading-relaxed text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40"
        />
      </Field>

      <Field
        id={instructionsId}
        label="Custom instructions"
        description="How should Sailor respond? Style, tone, format, focus areas. These take precedence over its defaults."
        hint={`${value.customInstructions.length}/${CUSTOM_INSTRUCTIONS_MAX}`}
        overLimit={value.customInstructions.length > CUSTOM_INSTRUCTIONS_MAX}
      >
        <textarea
          id={instructionsId}
          rows={6}
          value={value.customInstructions}
          onChange={(e) => update("customInstructions", e.target.value)}
          placeholder={`e.g. "Focus on TypeScript best practices", "Maintain a professional tone", "Always cite sources for important conclusions"`}
          disabled={submitting}
          className="w-full resize-none rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm leading-relaxed text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40"
        />
      </Field>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-7 pt-4 dark:border-white/10">
        <p className="text-xs text-neutral-10 dark:text-white/50">
          {savedAt && !dirty
            ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
            : dirty
              ? "Unsaved changes"
              : "Up to date"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!dirty || submitting}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={
              !dirty ||
              submitting ||
              isPending ||
              value.bio.length > BIO_MAX ||
              value.customInstructions.length > CUSTOM_INSTRUCTIONS_MAX
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--brand-gradient)" }}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  overLimit?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, description, hint, overLimit, children }: FieldProps) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-neutral-11 dark:text-white/70">
          {label}
        </label>
        {hint && (
          <span
            className={`text-[10px] tabular-nums ${overLimit ? "text-red-11" : "text-neutral-10 dark:text-white/40"}`}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
      {description && (
        <p className="mt-1 text-[11px] text-neutral-10 dark:text-white/40">{description}</p>
      )}
    </div>
  );
}
