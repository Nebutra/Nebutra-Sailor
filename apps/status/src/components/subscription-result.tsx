import { CheckCircleFill, Information } from "@nebutra/icons";
import type { ReactNode } from "react";

/** The card a subscriber lands on from an email or bot link. */
export function SubscriptionResult({
  ok,
  title,
  body,
  back,
  children,
}: {
  ok: boolean;
  title: string;
  body: string;
  back: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={`flex items-center gap-2.5 px-4 py-3 ${ok ? "bg-green-200" : "bg-muted"}`}>
        {ok ? (
          <CheckCircleFill aria-hidden className="size-4.5 text-green-900" />
        ) : (
          <Information aria-hidden className="size-4.5 text-muted-foreground" />
        )}
        <h1 className="text-base font-medium text-foreground">{title}</h1>
      </div>
      <div className="grid gap-4 px-4 py-4">
        <p className="text-sm text-foreground">{body}</p>
        {children}
        <a
          href={back.href}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {back.label}
        </a>
      </div>
    </section>
  );
}
