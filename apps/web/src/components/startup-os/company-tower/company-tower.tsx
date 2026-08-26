"use client";

import { ArrowUp, Sparkles } from "@nebutra/icons";
import { buildManifest } from "@nebutra/startup-os/company-context/completeness";
import type {
  CompanyContext,
  ContextManifestLayer,
  LayerId,
  Stage,
} from "@nebutra/startup-os/company-context/model";
import { companyName } from "@nebutra/startup-os/company-context/projection";
import { Badge, Button, DotPattern } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { BrandKitFloor } from "./brand-kit-floor";
import { ControlDeck } from "./control-deck";
import { TowerFloor } from "./tower-floor";
import type { CompanyTowerProps, FieldActionHandlers } from "./types";
import { countFilledFields } from "./types";

/**
 * CompanyTower — the nine-floor "stratigraphy" surface for a Startup OS project.
 * Bottom-heavy: L9 (执行) crowns the top, L1 (本质) is the engraved base. Calm
 * strategic minimalism — floors collapsed by default, monochrome neutral palette
 * with a single blue accent, dense LEFT-ALIGNED rows (Linear/Geist density),
 * hairline borders, and a barely-visible DotPattern blueprint texture behind it.
 *
 * Collapsed-row summaries come from the value-free `buildManifest`; field VALUES
 * appear only inside expanded content (progressive disclosure). Every wheel is
 * composed, never hand-rolled. The ONE permitted `hsl(var(--primary))` use is
 * the overall-completeness ring in the header; the L9 floor's live edge is a
 * solid blue hairline.
 */

/** Floors render top (L9) -> bottom (L1): the crown sits above the base. */
const FLOORS_TOP_DOWN: readonly LayerId[] = ["L9", "L8", "L7", "L6", "L5", "L4", "L3", "L2", "L1"];

/** Human-friendly stage label for the quiet header badge. */
const STAGE_LABEL: Readonly<Record<Stage, string>> = {
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  post_a: "Post-A",
};

/** Total-fields completeness across the nine layers, 0..1 (all fields filled = 1). */
function overallCompleteness(
  context: CompanyContext,
  layers: readonly ContextManifestLayer[],
): number {
  let filled = 0;
  let total = 0;
  for (const entry of layers) {
    const counts = countFilledFields(context.layers[entry.id]?.values ?? {}, entry.fieldKeys);
    filled += counts.filled;
    total += counts.total;
  }
  return total > 0 ? filled / total : 0;
}

/** Whole-percent integer for the header ring's mono label. */
function toPercent(ratio: number): number {
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

export function CompanyTower({
  context,
  onGenerateField,
  onUploadField,
  onEditField,
  onCompile,
  onUploadDoc,
}: CompanyTowerProps) {
  const manifest = buildManifest(context);
  const byId = new Map<LayerId, ContextManifestLayer>(
    manifest.layers.map((layer) => [layer.id, layer]),
  );
  const name = companyName(context);
  const overall = overallCompleteness(context, manifest.layers);
  const overallPercent = toPercent(overall);
  const handlers: FieldActionHandlers = { onGenerateField, onUploadField, onEditField };

  return (
    <section
      aria-label={`${name} company tower`}
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-1"
    >
      {/* Barely-visible blueprint texture — the DotPattern wheel, ~8% neutral. */}
      <DotPattern
        aria-hidden="true"
        cr={0.75}
        width={20}
        height={20}
        className="text-neutral-7/[0.08]"
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col">
        {/* Header — left-aligned tool chrome, NOT a centered marketing hero. */}

        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-neutral-7 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* The ONE brand-gradient use: the overall-completeness ring. */}
            <OverallRing percent={overallPercent} />
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-base font-semibold text-neutral-12">{name}</h2>
              <span className="font-mono text-[10px] tabular-nums text-neutral-9">
                {overallPercent}% complete · 9 layers
              </span>
            </div>
          </div>

          <Badge variant="gray-subtle" size="sm" className="font-mono">
            {STAGE_LABEL[context.stage]}
          </Badge>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              prefix={<ArrowUp aria-hidden="true" />}
              disabled={onUploadDoc === undefined}
              aria-label="Upload a source document"
              onClick={() => onUploadDoc?.()}
            >
              Upload doc
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              prefix={<Sparkles aria-hidden="true" />}
              disabled={onCompile === undefined}
              aria-label="Compile the company tower"
              onClick={() => onCompile?.()}
              className="border-0 text-white disabled:opacity-50"
              style={{ background: "hsl(var(--primary))" }}
            >
              Compile
            </Button>
          </div>
        </header>

        {/* The stratigraphy — nine floors, crown (L9) -> base (L1). */}
        <div className="flex flex-col">
          {FLOORS_TOP_DOWN.map((layerId) => {
            const layer = context.layers[layerId];
            const manifestEntry = byId.get(layerId);
            if (layer === undefined || manifestEntry === undefined) {
              return null;
            }
            return (
              <TowerFloor
                key={layerId}
                layerId={layerId}
                layer={layer}
                manifestEntry={manifestEntry}
                renderBody={renderBodyFor(layerId)}
                {...handlers}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

CompanyTower.displayName = "CompanyTower";

/** Pick the custom expanded body for special floors (L8 / L9), else default. */
function renderBodyFor(layerId: LayerId): TowerFloorBodyRenderer | undefined {
  if (layerId === "L8") {
    return (layer, handlers) => <BrandKitFloor layer={layer} {...handlers} />;
  }
  if (layerId === "L9") {
    return (layer) => <ControlDeck layer={layer} />;
  }
  return undefined;
}

type TowerFloorBodyRenderer = NonNullable<React.ComponentProps<typeof TowerFloor>["renderBody"]>;

/**
 * OverallRing — a thin gradient-masked ring carrying the single permitted
 * `hsl(var(--primary))`. The arc is a conic-gradient progress mask (a quiet
 * geometric primitive, not an icon), with the mono % at center. This is the one
 * place the brand gradient appears in the whole tower.
 */
function OverallRing({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="relative grid size-12 shrink-0 place-items-center rounded-full"
      role="img"
      aria-label={`${clamped}% overall complete`}
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${clamped}%, hsl(var(--muted)) ${clamped}% 100%)`,
      }}
    >
      <div className="grid size-9 place-items-center rounded-full bg-neutral-1">
        <span className={cn("font-mono text-[11px] font-medium tabular-nums text-neutral-12")}>
          {clamped}%
        </span>
      </div>
    </div>
  );
}
