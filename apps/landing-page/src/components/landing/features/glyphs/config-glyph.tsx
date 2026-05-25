"use client";

import { Check, SettingsGear } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * ConfigGlyph
 *
 * Typed config schema preview. Four rows pair a config key (mono
 * foreground) with its type chip (blue-subtle Badge) and default value
 * (muted). Footer signals that the schema is validated at startup.
 */

type ConfigRow = {
  key: string;
  type: "string" | "number";
  detail: string;
};

const ROWS: ReadonlyArray<ConfigRow> = [
  { key: "config.database.url", type: "string", detail: "required" },
  {
    key: "config.ai.defaultModel",
    type: "string",
    detail: 'default "claude-sonnet-4-6"',
  },
  { key: "config.ai.maxTokens", type: "number", detail: "default 4096" },
  { key: "config.cache.ttl", type: "number", detail: "default 60" },
];

export function ConfigGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-lg bg-[var(--neutral-2)] px-3 py-2"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--neutral-11)]">
          <SettingsGear className="h-3 w-3" />
          config.schema.ts
        </span>
        <Badge variant="outline" size="sm" className="font-mono text-[9px]">
          {ROWS.length}
        </Badge>
      </div>

      {/* Config rows */}
      <ul className="flex min-h-0 flex-1 flex-col justify-between gap-1">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-2 rounded-md bg-[var(--neutral-1)] px-2 py-1"
          >
            <span className="shrink-0 truncate font-mono text-[10px] text-[var(--neutral-12)]">
              {row.key}
            </span>
            <Badge
              variant="secondary"
              size="sm"
              className="ml-auto shrink-0 bg-[var(--blue-3)] font-mono text-[9px] text-[var(--blue-11)]"
            >
              {row.type}
            </Badge>
            <span className="shrink-0 truncate text-right font-mono text-[9px] text-[var(--neutral-11)]">
              &middot; {row.detail}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <p className="flex items-center justify-center gap-1 font-mono text-[9px] text-[var(--neutral-11)]">
        <Badge
          variant="secondary"
          size="sm"
          className="bg-[var(--green-3)] px-1 py-0 font-mono text-[9px] text-[var(--green-11)]"
        >
          <Check className="h-2.5 w-2.5" />
        </Badge>
        validated at startup
      </p>
    </div>
  );
}
