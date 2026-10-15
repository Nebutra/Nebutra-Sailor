"use client";

import { CopyButton, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-marks";
import type { ListingProvider } from "@/lib/listing-catalog";

type Sample = { model: string; provider: ListingProvider };

/**
 * The hero's product shot: the product itself, not an illustration — a
 * request against the real base URL for a model on the shelf, and a reply
 * streaming in below it.
 *
 * Honest by construction: the reply is labelled as an example, no latency,
 * cost or token figure is shown (none would be real here), and the model
 * chips are models the catalogue actually lists. Switching a chip rewrites
 * the request and replays the stream. Reduced motion shows the reply whole.
 */
export function RequestPreview({
  baseUrl,
  samples,
  reply,
}: {
  baseUrl: string;
  samples: readonly Sample[];
  reply: string;
}) {
  const t = useTranslations("shelf.preview");
  const [index, setIndex] = useState(0);
  const sample = samples[index] ?? samples[0];
  const [shown, setShown] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: replays when the chosen model changes
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(reply.length);
      return;
    }
    setShown(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 3;
      setShown(Math.min(n, reply.length));
      if (n >= reply.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [index, reply]);

  if (!sample) return null;
  const done = shown >= reply.length;
  const code = [
    `curl ${baseUrl}/chat/completions \\`,
    `  -H "Authorization: Bearer $ROUTER_API_KEY" \\`,
    "  -d '{",
    `    "model": "${sample.model}",`,
    `    "stream": true,`,
    `    "messages": [`,
    `      { "role": "user", "content": "${t("prompt")}" }`,
    "    ]",
    "  }'",
  ].join("\n");

  return (
    <figure className="relative min-w-0 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-lg">
      <div className="flex h-11 items-center gap-1.5 border-b border-border px-3">
        <ToggleGroup
          type="single"
          size="sm"
          aria-label={t("models")}
          value={String(index)}
          onValueChange={(value) => {
            if (typeof value === "string" && value) setIndex(Number(value));
          }}
          className="min-w-0 bg-transparent p-0"
        >
          {samples.map((s, i) => (
            <ToggleGroupItem
              key={s.model}
              value={String(i)}
              className="h-7 min-w-0 gap-1.5 rounded-full px-2.5 font-mono text-xs data-[state=on]:shadow-sm"
            >
              <BrandMark provider={s.provider} size={12} />
              <span className="truncate">{s.model}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="ml-auto">
          <CopyButton value={code} aria-label={t("copy")} />
        </div>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-muted-foreground sm:whitespace-pre sm:break-normal">
        <code>
          {code.split("\n").map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static lines of one snippet
            <span key={i} className="block">
              {line.startsWith("curl") ? (
                <>
                  <span className="text-foreground">curl</span>
                  {line.slice(4)}
                </>
              ) : line.includes(`"${sample.model}"`) ? (
                <>
                  {line.split(`"${sample.model}"`)[0]}
                  <span className="text-ring">"{sample.model}"</span>
                  {line.split(`"${sample.model}"`)[1]}
                </>
              ) : (
                line
              )}
            </span>
          ))}
        </code>
      </pre>
      <div className="border-t border-border bg-background/60 px-4 py-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", done ? "bg-success" : "animate-pulse bg-ring")}
          />
          {done ? t("done") : t("streaming")}
          <span className="ml-auto">{t("example")}</span>
        </div>
        <p className="min-h-[4.5rem] text-sm leading-relaxed text-foreground" aria-live="off">
          {reply.slice(0, shown)}
          {!done ? (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-foreground/70"
            />
          ) : null}
        </p>
        <span className="sr-only">{reply}</span>
      </div>
    </figure>
  );
}
