"use client";

import { ArrowRight, Box, Check, Sparkles } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

/**
 * ThreeDPipelineGlyph
 *
 * Three-stage 3D asset pipeline: mesh ingest → decimation → GLB pack.
 * Stage cards sit horizontally separated by ArrowRight connectors.
 */
function ExtChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-[16px] items-center rounded-[3px] px-1 font-mono text-[9.5px] leading-none"
      style={{
        background: "var(--neutral-3)",
        border: "1px solid var(--neutral-6)",
        color: "var(--neutral-11)",
      }}
    >
      {label}
    </span>
  );
}

function StageCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[6px] px-2 py-2"
      style={{
        background: "var(--neutral-1)",
        border: "1px solid var(--neutral-6)",
      }}
    >
      <div className="flex items-center gap-1">
        <span style={{ color: "var(--neutral-10)" }}>{icon}</span>
        <span
          className="truncate font-mono text-[10px] leading-none"
          style={{ color: "var(--neutral-12)" }}
        >
          {title}
        </span>
      </div>
      <div className="flex min-h-[18px] flex-col justify-center gap-1">{children}</div>
    </div>
  );
}

export function ThreeDPipelineGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-md p-3"
      style={{
        height: 160,
        background: "var(--neutral-2)",
      }}
    >
      <div className="flex items-start justify-end">
        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
          Three.js &middot; GLTF 2.0
        </Badge>
      </div>

      <div className="flex items-stretch gap-1.5">
        <StageCard icon={<Box size={11} />} title="Mesh ingest">
          <div className="flex flex-wrap gap-1">
            <ExtChip label=".obj" />
            <ExtChip label=".fbx" />
            <ExtChip label=".usd" />
          </div>
        </StageCard>

        <div className="flex items-center" style={{ color: "var(--neutral-9)" }}>
          <ArrowRight size={12} />
        </div>

        <StageCard icon={<Sparkles size={11} />} title="Decimate">
          <div className="flex flex-col gap-1">
            <span
              className="font-mono text-[9.5px] leading-none"
              style={{ color: "var(--neutral-11)" }}
            >
              18k &rarr; 4k tris
            </span>
            <Progress value={22} max={100} size="sm" animated={false} />
          </div>
        </StageCard>

        <div className="flex items-center" style={{ color: "var(--neutral-9)" }}>
          <ArrowRight size={12} />
        </div>

        <StageCard icon={<Box size={11} />} title="Pack GLB">
          <div className="flex items-center gap-1">
            <Check size={11} style={{ color: "var(--status-success)" }} />
            <span
              className="font-mono text-[9.5px] leading-none"
              style={{ color: "var(--neutral-11)" }}
            >
              2.4 MB
            </span>
          </div>
        </StageCard>
      </div>

      <div className="font-mono text-[10px] leading-none" style={{ color: "var(--neutral-10)" }}>
        cinema &middot; atelier-canvas pipeline
      </div>
    </div>
  );
}
