"use client";

import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { type FormEvent, useState } from "react";

/**
 * "Subscribe to updates" — email first (double opt-in), then the feeds a
 * reader can follow without giving anything.
 */
export function SubscribeMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ink">
          Subscribe to updates
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <EmailForm />
        <div className="border-t border-border p-2">
          <SubscribeOption
            href="/status.atom"
            title="Atom / RSS feed"
            body="Every incident and update, in any feed reader."
          />
          <SubscribeOption
            href="/status.json"
            title="JSON API"
            body="Current status and 90-day history for dashboards and scripts."
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

type FormState = "idle" | "sending" | "sent" | "error";

function EmailForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      const response = await fetch("/api/status/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setState("sent");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong. Try again.");
      setState("error");
    } catch {
      setError("Could not reach the server. Try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="p-4">
        <p className="text-sm font-medium text-foreground">Check your inbox</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          We sent a link to {email}. Updates start once you confirm.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="p-4">
      <label htmlFor="status-subscribe-email" className="text-sm font-medium text-foreground">
        Get email updates
      </label>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
        Incidents and scheduled maintenance. Unsubscribe any time.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          id="status-subscribe-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" variant="ink" disabled={state === "sending"}>
          {state === "sending" ? "Sending" : "Subscribe"}
        </Button>
      </div>
      {state === "error" ? (
        <p role="alert" className="mt-2 text-xs text-destructive-strong">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function SubscribeOption({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <a href={href} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-muted">
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{body}</span>
    </a>
  );
}
