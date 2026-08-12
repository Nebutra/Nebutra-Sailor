"use client";

/**
 * The community surface, drawn as an interface rather than as a population.
 *
 * This used to name five people — Sarah K., Marco R., Priya S., Tom H., Yuki M.
 * — put them in a conversation about RAG latency and HNSW indexes, and print
 * "12.4k" beside a members icon. None of them exist. On a page whose pricing
 * table sells a private support channel and names Discord, that reads as a
 * claim about how many people are already there, not as a drawing of a chat UI.
 *
 * What the mockup is for is showing the shape of the surface: channels, a
 * thread, a presence rail. It does that without inventing anybody. The message
 * bodies are bars because the point is the layout, and a bar cannot be mistaken
 * for a quote.
 */

import { Message as MessageSquare, MagnifyingGlass as Search } from "@nebutra/icons";
import { AnimateIn } from "../../AnimateIn";

const channels = ["# general", "# models", "# showcase", "# help"];

/** Widths only — the thread's shape, with nothing attributed to anyone. */
const thread = [
  { indent: false, lines: ["62%", "38%"] },
  { indent: true, lines: ["45%"] },
  { indent: false, lines: ["71%", "29%"] },
  { indent: true, lines: ["52%"] },
];

export function OPCMockup() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <AnimateIn
        className="flex h-[420px] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-card shadow-ambient-sm"
        preset="fadeUp"
      >
        <div className="flex shrink-0 items-center gap-2 px-3 py-2">
          <div className="h-5 w-5 rounded bg-primary" />
          <span className="font-semibold text-foreground text-xs">Community</span>
          <div className="ml-auto flex items-center gap-1 rounded bg-muted px-2 py-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Search</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-36 shrink-0 space-y-0.5 bg-muted/30 p-2">
            <div className="px-2 py-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Channels
            </div>
            {channels.map((channel, i) => (
              <div
                className={`rounded px-2 py-1 text-[11px] ${i === 0 ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground"}`}
                key={channel}
              >
                {channel}
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> general
            </div>
            <div className="flex-1 space-y-3 overflow-hidden p-3">
              {thread.map((message, i) => (
                <div className="flex gap-2" key={`${message.indent}-${i}`}>
                  <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                  <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                    {message.lines.map((width, j) => (
                      <div
                        className="h-2 rounded-full bg-foreground/10"
                        key={`${width}-${j}`}
                        style={{ width }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-32 shrink-0 bg-muted/30 p-2">
            <div className="px-1 py-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Online
            </div>
            <div className="mt-1 space-y-2">
              {["58%", "44%", "66%", "38%", "51%"].map((width, i) => (
                <div className="flex items-center gap-1.5 px-1" key={`${width}-${i}`}>
                  <div className="relative">
                    <div className="h-4 w-4 rounded-full bg-muted" />
                    <div className="-bottom-0.5 -right-0.5 absolute h-1.5 w-1.5 rounded-full bg-success" />
                  </div>
                  <div className="h-2 rounded-full bg-foreground/10" style={{ width }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateIn>
    </div>
  );
}
