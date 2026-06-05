"use client";

import { Plus } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import type { ContextLayer } from "@/lib/startup-os/company-context/model";
import { FieldCard } from "./field-card";
import type { FieldActionHandlers } from "./types";

/**
 * BrandKitFloor — the L8 (身份 · identity) expanded body. A responsive sub-grid
 * of FieldCards for the brand kit (name / logo / colors / fonts / images /
 * design_guide / brand_guide / archetype / tone) plus a quiet "[+ field]"
 * affordance. Composes the existing FieldCard wheel only — Geist-restrained,
 * not a marketing kit. Field order follows the seed registry order so the grid
 * stays stable across renders.
 *
 * The "[+ field]" button is disabled when no edit handler is wired (read-only
 * mode) — never a dead button. Adding a custom field routes through the same
 * `onEditField` seam the FieldCards use; the host opens its add-field flow.
 */

export interface BrandKitFloorProps extends FieldActionHandlers {
  /** The L8 layer slice — its field definitions + stored values. */
  readonly layer: ContextLayer;
}

export function BrandKitFloor({
  layer,
  onGenerateField,
  onUploadField,
  onEditField,
}: BrandKitFloorProps) {
  const fieldKeys = Object.keys(layer.fields);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col divide-y divide-neutral-6/60">
        {fieldKeys.map((fieldKey) => (
          <FieldCard
            key={fieldKey}
            layerId={layer.id}
            fieldKey={fieldKey}
            definition={layer.fields[fieldKey]}
            value={layer.values[fieldKey]}
            onGenerateField={onGenerateField}
            onUploadField={onUploadField}
            onEditField={onEditField}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        prefix={<Plus aria-hidden="true" />}
        disabled={onEditField === undefined}
        aria-label="Add a brand-kit field"
        onClick={() => onEditField?.(layer.id, "")}
        className="self-start text-neutral-10"
      >
        field
      </Button>
    </div>
  );
}

BrandKitFloor.displayName = "BrandKitFloor";
