"use client";

// @brand-exempt: a verbatim recording of a real create-sailor run; its output names the upstream repository.

import { AnimatedSpan, Terminal, TypingAnimation } from "@nebutra/ui/primitives";

/**
 * A real run of the published CLI, replayed — not a mock. Recorded 2026-09-27
 * from `npx create-sailor@latest acme -y --no-install --no-git`; the lines are
 * its output verbatim, with the download progress folded to its last line.
 * Re-record when the CLI's output changes.
 */
const OUTPUT: { text: string; tone?: "muted" | "strong" }[] = [
  { text: "Sailor v2.0.0", tone: "strong" },
  { text: "AI-Native SaaS Unicorn Template", tone: "muted" },
  { text: "  Resolving Nebutra/Sailor-Template@main…", tone: "muted" },
  { text: "  Downloading template  19.7 MB", tone: "muted" },
  { text: "  Extracting template…", tone: "muted" },
  { text: "  Writing project files…", tone: "muted" },
  { text: "  ✓ Template ready (68.6 MB from Nebutra/Sailor-Template@main)", tone: "strong" },
  {
    text: "  License: MIT — commercial use, closed source, no fee, no attribution.",
    tone: "muted",
  },
  { text: "   - Done in 17s · ./acme/", tone: "strong" },
  { text: "   Next:", tone: "muted" },
  { text: "     -> cd ./acme", tone: "muted" },
  { text: "     -> npm install", tone: "muted" },
  { text: "     -> nebutra status   → what is live, what needs a key", tone: "muted" },
  { text: "     -> npm dev          → http://localhost:3000", tone: "muted" },
];

export function SailorCli() {
  return (
    <figure>
      <Terminal className="w-full max-w-4xl max-h-none">
        <TypingAnimation>npx create-sailor@latest acme</TypingAnimation>
        {OUTPUT.map((l) => (
          <AnimatedSpan
            key={l.text}
            className={l.tone === "strong" ? "text-foreground" : "text-muted-foreground"}
          >
            {l.text}
          </AnimatedSpan>
        ))}
      </Terminal>
      <figcaption className="mt-4 text-sm text-muted-foreground">
        A real run of the published CLI, recorded on 27 September 2026 — install and git skipped.
      </figcaption>
    </figure>
  );
}
