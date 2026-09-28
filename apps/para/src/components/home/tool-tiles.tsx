"use client";

// @primitive-exempt: square launch tiles, not controls; Button's control recipe (height, padding) does not apply.

import { FileText, Image } from "@nebutra/icons";
import type { ComponentType, SVGProps } from "react";
import type { SeedMode } from "@/domain/seed";
import { useCreateCanvas } from "@/lib/create-canvas";

const TOOLS: readonly {
  seed: SeedMode;
  label: string;
  hint: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { seed: "image", label: "Image", hint: "Start an image generator", icon: Image },
  { seed: "text", label: "Script", hint: "Start a text generator", icon: FileText },
];

/**
 * Start with a specific generator. Only modes the origin serves today have a tile — video and audio
 * exist in the node model but not in the backend, and a tile for them would open a Generate button
 * that can only fail.
 */
export function ToolTiles() {
  const { create, pending, failed } = useCreateCanvas();
  return (
    <section aria-labelledby="tools-heading">
      <h2 id="tools-heading" className="mb-4 text-label text-muted-foreground">
        Tools
      </h2>
      {/* LibTV's launcher row: a wide icon plate with the label under it, outside the plate,
          at a fixed width so two tiles read as a row that has room to grow, not a stretched grid. */}
      <div className="flex flex-wrap gap-x-6 gap-y-5">
        {TOOLS.map(({ seed, label, hint, icon: Icon }) => (
          <button
            key={seed}
            type="button"
            title={hint}
            onClick={() => void create(seed)}
            disabled={pending !== null}
            aria-busy={pending === seed || undefined}
            className="group flex w-32 flex-col items-center gap-3 disabled:cursor-wait"
          >
            <span className="flex h-[4.5rem] w-full items-center justify-center rounded-2xl bg-card text-muted-foreground transition-colors group-hover:bg-neutral-4 group-hover:text-foreground">
              <Icon className="size-6" />
            </span>
            <span className="text-body text-muted-foreground transition-colors group-hover:text-foreground">
              {label}
            </span>
          </button>
        ))}
      </div>
      {failed ? (
        <p role="status" className="mt-3 text-label text-muted-foreground">
          The canvas could not be created. Sign in and try again.
        </p>
      ) : null}
    </section>
  );
}
