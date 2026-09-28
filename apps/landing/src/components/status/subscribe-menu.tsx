"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";

/**
 * "Subscribe to updates" — the feeds a reader can follow without an account.
 * Email and chat subscriptions arrive with the incident core; until then the
 * menu offers only what actually works.
 */
export function SubscribeMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sheen transition-opacity hover:opacity-90"
        >
          Subscribe to updates
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <SubscribeOption
          href="/status.atom"
          title="Atom / RSS feed"
          body="Every incident and update, in any feed reader or a Slack/Feishu RSS app."
        />
        <SubscribeOption
          href="/status.json"
          title="JSON API"
          body="Current status and 90-day history for dashboards and scripts."
        />
      </PopoverContent>
    </Popover>
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
