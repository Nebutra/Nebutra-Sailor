"use client";

import { CursorClick } from "@nebutra/icons";
import type { CSSProperties } from "react";
import { Chip } from "@/components/ui/chip";
import { generatableModes } from "@/domain/generation";
import { featuredModel } from "@/domain/models";
import { availableTemplates, type TemplateMeta } from "@/domain/templates";
import { isGatewayMode } from "@/lib/gateway-api";
import { applyTemplate } from "@/stores/apply-template";
import { NodeGlyph } from "./node-glyph";

const STARTERS = availableTemplates(generatableModes(isGatewayMode));

/**
 * The icon plate behind each starter — a colour per kind of work, as LibTV does, drawn from the
 * status and brand tokens rather than a private palette. Mixed toward the neutral ground so the
 * four read as a set.
 */
const PLATE: Record<TemplateMeta["id"], string> = {
  "story-script": "var(--status-success)",
  "character-sheet": "var(--status-danger)",
  "frame-to-video": "var(--blue-7)",
  "text-to-video": "var(--brand-tertiary)",
};

function plate(id: TemplateMeta["id"]): CSSProperties {
  const c = PLATE[id];
  return {
    background: `linear-gradient(145deg, color-mix(in srgb, ${c} 72%, var(--neutral-12)) 0%, color-mix(in srgb, ${c} 55%, var(--neutral-3)) 100%)`,
  };
}

/**
 * A fresh canvas, as LibTV opens one: one line on what to do ("双击画布 自由生成节点") and a row of
 * starters that each drop a small pre-built graph onto the canvas. Nothing here is modal — the
 * canvas stays live underneath, and the first node that lands replaces this.
 */
export function EmptyCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-10 px-4">
      <p className="flex items-center gap-2 text-body text-muted-foreground">
        <CursorClick aria-hidden="true" className="size-4 text-foreground" />
        <span className="text-foreground">双击画布</span>
        自由生成节点
      </p>
      <div className="pointer-events-auto flex flex-wrap justify-center gap-2.5">
        {STARTERS.map((t) => {
          const model = t.mode === "video" ? featuredModel(t.mode) : undefined;
          return (
            <Chip
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className="h-14 w-60 gap-3 rounded-xl border border-border/60 bg-card px-2 text-body hover:border-border hover:bg-accent"
            >
              <span
                aria-hidden="true"
                style={plate(t.id)}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground"
              >
                <NodeGlyph type={t.mode} className="size-4.5" />
              </span>
              <span className="truncate font-medium text-foreground">{t.name}</span>
              {model?.tag && (
                <span className="shrink-0 rounded-sm bg-accent px-1 text-meta text-muted-foreground">
                  {model.tag}
                </span>
              )}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
