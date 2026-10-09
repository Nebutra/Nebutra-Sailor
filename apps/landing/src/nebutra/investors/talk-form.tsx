"use client";

import { Button, ChoiceboxGroup, Field, Input, Textarea } from "@nebutra/ui/primitives";
import { useActionState, useEffect, useState } from "react";
import { type Intent, type IntroState, requestIntro } from "./actions";

const INITIAL: IntroState = { status: "idle" };

/** The form's copy, resolved on the server from `sitePages.investors.talk.form` (the client catalog stays small). */
export interface TalkCopy {
  intent: string;
  intents: Record<Intent, { title: string; description: string }>;
  name: string;
  email: string;
  firm: string;
  message: string;
  optional: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
  note: string;
}
const INTENTS: readonly Intent[] = ["deck", "call", "partner"];

/** `#talk-call` / `#talk-partner` preselect the intent; anything else is the deck. */
function intentFromHash(hash: string): Intent | null {
  const m = /^#talk-(call|partner|deck)$/.exec(hash);
  return m ? (m[1] as Intent) : null;
}

/**
 * The page's one form. State: Form (useActionState owns submission; the
 * intent is local UI state mirrored into a hidden field). States evaluated:
 * idle, pending (button busy, fields disabled), success (replaces the form),
 * error (inline alert, fields kept).
 *
 * Responsive: Stack. Name and email side by side from sm up.
 */
export function TalkForm({ copy }: { copy: TalkCopy }) {
  const [state, action, pending] = useActionState(requestIntro, INITIAL);
  const [intent, setIntent] = useState<Intent>("deck");

  useEffect(() => {
    const sync = () => {
      const next = intentFromHash(window.location.hash);
      if (next) setIntent(next);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-[var(--radius-lg)] border border-border bg-card p-8">
        <p className="text-lg text-foreground">{copy.success}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-[var(--radius-lg)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-strong"
        >
          {copy.error}
        </div>
      ) : null}

      <input type="hidden" name="intent" value={intent} data-allow-native />
      <ChoiceboxGroup
        type="radio"
        direction="column"
        label={copy.intent}
        showLabel
        value={intent}
        onValueChange={(v) => setIntent(v as Intent)}
        disabled={pending}
      >
        {INTENTS.map((k) => (
          <ChoiceboxGroup.Item
            key={k}
            value={k}
            title={copy.intents[k].title}
            description={copy.intents[k].description}
          />
        ))}
      </ChoiceboxGroup>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={copy.name} htmlFor="inv-name">
          <Input id="inv-name" name="name" autoComplete="name" required disabled={pending} />
        </Field>
        <Field label={copy.email} htmlFor="inv-email">
          <Input
            id="inv-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </Field>
      </div>
      <Field label={copy.firm} htmlFor="inv-firm">
        <Input id="inv-firm" name="firm" autoComplete="organization" disabled={pending} />
      </Field>
      <Field label={`${copy.message} (${copy.optional})`} htmlFor="inv-message">
        <Textarea id="inv-message" name="message" rows={4} disabled={pending} />
      </Field>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{copy.note}</p>
        <Button type="submit" size="lg" aria-busy={pending} disabled={pending}>
          {pending ? copy.sending : copy.submit}
        </Button>
      </div>
    </form>
  );
}
