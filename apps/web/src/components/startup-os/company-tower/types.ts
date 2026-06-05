import type {
  CompanyContext,
  ContextFieldDefinition,
  FieldProvenance,
  FieldStatus,
  FieldValue,
  LayerId,
  Stability,
} from "@/lib/startup-os/company-context/model";

/**
 * Company Tower — shared view-model contracts for the nine-floor "stratigraphy"
 * surface (L9 crown at top -> L1 engraved base at bottom).
 *
 * These types are the seam between the pure company-context data API
 * (`@/lib/startup-os/company-context/*`) and the presentational tower atoms.
 * No logic lives here beyond tiny, pure view-model helpers — every renderer
 * stays dumb and reads the manifest / layer slices it is handed.
 */

/** A per-field action callback. Layer + field key identify the target. */
export type FieldAction = (layerId: LayerId, fieldKey: string) => void;

/**
 * Props for the whole Company Tower. Every action handler is OPTIONAL — when a
 * handler is absent the corresponding control renders disabled (read-only mode),
 * never a dead button.
 */
export interface CompanyTowerProps {
  /** The nine-layer company context to render. */
  readonly context: CompanyContext;
  /** Trigger an AI generation for one field. */
  readonly onGenerateField?: FieldAction;
  /** Open the upload flow for one field (asset / document). */
  readonly onUploadField?: FieldAction;
  /** Open the editor for one field. */
  readonly onEditField?: FieldAction;
  /** Compile the tower into the flat company view. */
  readonly onCompile?: () => void;
  /** Upload a source document that fans out across layers. */
  readonly onUploadDoc?: () => void;
}

/** Shared per-field handler bundle, threaded down to each FieldCard. */
export interface FieldActionHandlers {
  readonly onGenerateField?: FieldAction;
  readonly onUploadField?: FieldAction;
  readonly onEditField?: FieldAction;
}

/** Whether a stored field value counts as "filled" (any non-empty status). */
export function isFieldFilled(value: FieldValue | undefined): boolean {
  return value !== undefined && value.status !== "empty";
}

/** Count of filled vs total fields for a layer, for the collapsed-row preview. */
export interface FieldFillCount {
  readonly filled: number;
  readonly total: number;
}

/**
 * Filled / total counts for a layer, derived from its stored values. Pure and
 * value-blind beyond the boolean "is this filled" check — safe for the
 * progressive-disclosure preview line under a collapsed floor.
 */
export function countFilledFields(
  values: Readonly<Record<string, FieldValue>>,
  fieldKeys: readonly string[],
): FieldFillCount {
  const filled = fieldKeys.reduce(
    (running, key) => (isFieldFilled(values[key]) ? running + 1 : running),
    0,
  );
  return { filled, total: fieldKeys.length };
}

/** Map a 0..1 completeness ratio to a rounded whole-percent integer. */
export function toPercent(ratio: number): number {
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

/**
 * Human-readable stability cadence label (e.g. "century", "1-3y") for the mono
 * stability chip. Pure lookup — keeps cadence copy out of the JSX.
 */
const STABILITY_LABELS: Readonly<Record<Stability, string>> = {
  century: "century",
  decades: "decades",
  years: "years",
  years_1_3: "1-3y",
  years_1_2: "1-2y",
  years_5_plus: "5y+",
  quarter: "quarter",
  half_year: "half-year",
  weekly: "weekly",
};

/** Terse mono-friendly label for a stability cadence. */
export function stabilityLabel(stability: Stability): string {
  return STABILITY_LABELS[stability];
}

/**
 * The dominant provenance across a layer's filled fields, for the collapsed-row
 * provenance chip. Returns `undefined` when the layer has no filled field (the
 * caller then shows nothing rather than a misleading "agent" default).
 */
export function dominantProvenance(
  values: Readonly<Record<string, FieldValue>>,
  fieldKeys: readonly string[],
): FieldProvenance | undefined {
  const tally = new Map<FieldProvenance, number>();
  for (const key of fieldKeys) {
    const stored = values[key];
    if (!isFieldFilled(stored) || stored === undefined) {
      continue;
    }
    tally.set(stored.provenance, (tally.get(stored.provenance) ?? 0) + 1);
  }

  let dominant: FieldProvenance | undefined;
  let best = 0;
  for (const [provenance, count] of tally) {
    if (count > best) {
      best = count;
      dominant = provenance;
    }
  }
  return dominant;
}

// Re-export the data-API types most tower atoms consume, so component files can
// import their full vocabulary from this single view-model module.
export type {
  CompanyContext,
  ContextFieldDefinition,
  FieldProvenance,
  FieldStatus,
  FieldValue,
  LayerId,
  Stability,
};
