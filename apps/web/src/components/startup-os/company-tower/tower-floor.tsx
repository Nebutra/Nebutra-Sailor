"use client";

import { ChevronDown } from "@nebutra/icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import type { ContextLayer, ContextManifestLayer } from "@/lib/startup-os/company-context/model";
import { getLayerMeta } from "@/lib/startup-os/company-context/registry";
import { CompletenessRing } from "./completeness-ring";
import { FieldCard } from "./field-card";
import { ProvenanceBadge, StabilityBadge } from "./provenance-badge";
import type { FieldActionHandlers, LayerId } from "./types";
import { countFilledFields, dominantProvenance } from "./types";

/**
 * TowerFloor — one stratum of the nine-floor company tower, rendered as a
 * `Collapsible` (the wheel — never hand-rolled). Calm-but-deep: collapsed by
 * default, every floor a dense LEFT-ALIGNED directory row that earns its place.
 *
 *   COLLAPSED trigger row:
 *     [mono floor id 09..01] · [Sans "执行 · Execution"] · [thin Gauge + mono %]
 *     · [mono stability cadence] · [dominant provenance chip] · [chevron]
 *   plus a muted ONE-LINE preview (filled/total + terse summary) computed from
 *   the value-free manifest entry — progressive disclosure, no field values.
 *
 *   EXPANDED content:
 *     hairline-bordered grid of FieldCards. L8 / L9 swap in a custom body via
 *     `renderBody`; L1 collapses to a single engraved line on a heavier base
 *     rule. The L9 trigger carries the ONE permitted brand-gradient "live"
 *     accent as a hairline left edge.
 *
 * Composes wheels only; absent handlers render disabled controls downstream.
 */

export interface TowerFloorProps extends FieldActionHandlers {
  /** Which stratum this floor renders. */
  readonly layerId: LayerId;
  /** The layer slice — field definitions + stored values (expanded body only). */
  readonly layer: ContextLayer;
  /** The value-free manifest entry — drives the collapsed row + preview. */
  readonly manifestEntry: ContextManifestLayer;
  /**
   * Custom expanded body (L8 brand-kit, L9 control-deck). When absent the floor
   * renders the default FieldCard grid from its own layer slice.
   */
  readonly renderBody?: (layer: ContextLayer, handlers: FieldActionHandlers) => React.ReactNode;
  /** Open by default. Tower keeps floors collapsed (calm) unless asked. */
  readonly defaultOpen?: boolean;
  /** Notified when the floor expands / collapses. */
  readonly onOpenChange?: (open: boolean) => void;
}

/** Floor id as a two-digit mono token, e.g. order 9 -> "09". */
function floorIdLabel(order: number): string {
  return order.toString().padStart(2, "0");
}

/**
 * The muted one-line preview under a collapsed floor. Computed from the
 * value-free manifest (+ a non-empty count over the layer's stored statuses):
 * "3/5 filled · mission · why · technical_belief". Field VALUES never appear —
 * only keys, honouring progressive disclosure.
 */
function previewLine(layer: ContextLayer, manifestEntry: ContextManifestLayer): string {
  const { filled, total } = countFilledFields(layer.values, manifestEntry.fieldKeys);
  const keys = manifestEntry.fieldKeys.slice(0, 3).join(" · ");
  const fillText = `${filled}/${total} filled`;
  return keys.length > 0 ? `${fillText} · ${keys}` : fillText;
}

/** The default expanded body: a dense divided stack of FieldCard rows. */
function DefaultFloorBody({
  layer,
  handlers,
}: {
  layer: ContextLayer;
  handlers: FieldActionHandlers;
}) {
  const keys = Object.keys(layer.fields);
  return (
    <div className="flex flex-col divide-y divide-neutral-6/60">
      {keys.map((fieldKey) => (
        <FieldCard
          key={fieldKey}
          layerId={layer.id}
          fieldKey={fieldKey}
          definition={layer.fields[fieldKey]}
          value={layer.values[fieldKey]}
          {...handlers}
        />
      ))}
    </div>
  );
}

export function TowerFloor({
  layerId,
  layer,
  manifestEntry,
  renderBody,
  defaultOpen = false,
  onOpenChange,
  onGenerateField,
  onUploadField,
  onEditField,
}: TowerFloorProps) {
  const meta = getLayerMeta(layerId);
  const handlers: FieldActionHandlers = { onGenerateField, onUploadField, onEditField };
  const contentId = `floor-${layerId}-content`;
  const isCrown = layerId === "L9";
  const isBase = layerId === "L1";

  // Display completeness is over ALL fields (intuitive: "100%" = every field
  // filled), not just the required ones — keeps the % consistent with the
  // filled/total preview. The ring colour follows the same all-fields reading.
  const { filled, total } = countFilledFields(layer.values, manifestEntry.fieldKeys);
  const fillRatio = total > 0 ? filled / total : 0;
  const fillStatus = filled === 0 ? "empty" : filled >= total ? "ready" : "partial";

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      className={cn(
        "relative border-b border-neutral-6",
        // L1 sits on a slightly heavier base rule (engraved foundation).
        isBase && "border-b-2 border-neutral-7",
      )}
    >
      {/* A solid blue "live" edge on L9 (the brand gradient is reserved for the
          one overall-completeness ring in the header). */}
      {isCrown ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-blue-9" />
      ) : null}

      <CollapsibleTrigger
        aria-controls={contentId}
        aria-label={`Expand ${meta.zh} · ${meta.key} layer`}
        className={cn(
          "group flex w-full items-center gap-3 px-3 text-left transition-colors hover:bg-neutral-2",
          // L1 is a thin engraved single line; other floors get breathing room.
          isBase ? "py-2" : "py-2.5",
          isCrown && "pl-4",
        )}
      >
        {/* Floor id — mono, the tower's spine. */}
        <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-neutral-9">
          {floorIdLabel(meta.order)}
        </span>

        {/* Layer name — Geist Sans prose. */}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-neutral-12">
            {meta.zh} · <span className="capitalize">{meta.key}</span>
          </span>
          {/* Muted one-line preview — keys only, never values. */}
          {isBase ? null : (
            <span className="truncate font-mono text-[10px] text-neutral-8">
              {previewLine(layer, manifestEntry)}
            </span>
          )}
        </span>

        {/* Completeness — thin Gauge + adjacent mono %. */}
        <CompletenessRing value={fillRatio} status={fillStatus} className="ml-auto shrink-0" />

        {/* Stability cadence — quiet mono ColorBadge. */}
        <StabilityBadge
          stability={manifestEntry.stability}
          className="hidden shrink-0 sm:inline-flex"
        />

        {/* Dominant provenance — shown only once the floor has a filled field. */}
        <DominantProvenanceChip layer={layer} manifestEntry={manifestEntry} />

        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-neutral-9 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>

      <CollapsibleContent id={contentId} className="px-3 pb-4 pt-1">
        {renderBody ? (
          renderBody(layer, handlers)
        ) : (
          <DefaultFloorBody layer={layer} handlers={handlers} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

TowerFloor.displayName = "TowerFloor";

/** The dominant-provenance chip — renders nothing when no field is filled. */
function DominantProvenanceChip({
  layer,
  manifestEntry,
}: {
  layer: ContextLayer;
  manifestEntry: ContextManifestLayer;
}) {
  const provenance = dominantProvenance(layer.values, manifestEntry.fieldKeys);
  if (provenance === undefined) {
    return null;
  }
  return <ProvenanceBadge provenance={provenance} className="hidden shrink-0 md:inline-flex" />;
}
