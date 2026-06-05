"use client";

import { ArrowUp, Image, Link as LinkIcon, LockClosed, Pencil, Sparkles } from "@nebutra/icons";
import { Badge, Button, Card } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import type {
  ContextFieldDefinition,
  FieldValue,
  LayerId,
} from "@/lib/startup-os/company-context/model";
import { ProvenanceBadge, StatusBadge } from "./provenance-badge";
import type { FieldActionHandlers } from "./types";
import { isFieldFilled } from "./types";

/**
 * FieldCard — one field inside an expanded floor. A hairline-bordered `Card`
 * (border-neutral-6, no shadow — Linear/Geist density) carrying:
 *   - mono field key + ✓/— filled marker
 *   - kind-specific value render (line/text -> text · list -> chips ·
 *     asset -> tile · structured -> key/val · link -> ref count)
 *   - provenance + status chips (only once filled)
 *   - the action row [✦ Generate][↑ Upload][✎ Edit][🔒]
 *
 * All renderers are pure; absent handlers render disabled controls (read-only),
 * never dead buttons. Composes existing wheels only — nothing hand-rolled.
 */

export interface FieldCardProps extends FieldActionHandlers {
  readonly layerId: LayerId;
  readonly fieldKey: string;
  readonly definition: ContextFieldDefinition;
  readonly value: FieldValue | undefined;
  readonly className?: string;
}

const EMPTY_HINT = "Not yet filled";

/** Coerce an unknown stored value into a readable string, or undefined. */
function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

/** Coerce an unknown stored value into a string list (best-effort, total). */
function asList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asText(item)).filter((item): item is string => item !== undefined);
}

/** Render a `line` / `text` value as plain prose (Geist Sans). */
function LineValue({ value }: { value: unknown }) {
  const text = asText(value);
  if (text === undefined) {
    return <EmptyValue />;
  }
  return <p className="text-sm leading-relaxed text-neutral-12">{text}</p>;
}

/** Render a `list` value as a row of quiet neutral chips. */
function ListValue({ value }: { value: unknown }) {
  const items = asList(value);
  if (items.length === 0) {
    return <EmptyValue />;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="gray-subtle" size="sm">
          {item}
        </Badge>
      ))}
    </div>
  );
}

/** Render a `structured` value as a compact mono key/value grid. */
function StructuredValue({ value }: { value: unknown }) {
  const entries =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>)
      : [];
  if (entries.length === 0) {
    return <EmptyValue />;
  }
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1">
      {entries.map(([key, raw]) => (
        <div key={key} className="contents">
          <dt className="font-mono text-[10px] uppercase tracking-wide text-neutral-9">{key}</dt>
          <dd className="text-xs text-neutral-11">{asText(raw) ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Render an `asset` value as a small bordered tile (filename / placeholder). */
function AssetValue({ value }: { value: unknown }) {
  const label = asText(value);
  return (
    <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-neutral-6 bg-neutral-2 px-2.5 py-1.5">
      <Image aria-hidden="true" className="size-4 text-neutral-9" />
      <span className="font-mono text-xs text-neutral-11">{label ?? "no asset"}</span>
    </div>
  );
}

/** Render a `link` value as a reference count (links are opaque here). */
function LinkValue({ value }: { value: unknown }) {
  const count = Array.isArray(value) ? value.length : asText(value) !== undefined ? 1 : 0;
  return (
    <div className="inline-flex items-center gap-1.5 text-neutral-11">
      <LinkIcon aria-hidden="true" className="size-3.5 text-neutral-9" />
      <span className="font-mono text-xs tabular-nums">
        {count} {count === 1 ? "ref" : "refs"}
      </span>
    </div>
  );
}

/** Shared empty-state line for any kind whose value is absent. */
function EmptyValue() {
  return <p className="text-sm italic text-neutral-9">{EMPTY_HINT}</p>;
}

/** Dispatch to the kind-specific renderer. */
function FieldValueRender({
  definition,
  value,
}: {
  definition: ContextFieldDefinition;
  value: FieldValue | undefined;
}) {
  const raw = value?.value;
  switch (definition.kind) {
    case "list":
      return <ListValue value={raw} />;
    case "structured":
      return <StructuredValue value={raw} />;
    case "asset":
      return <AssetValue value={raw} />;
    case "link":
      return <LinkValue value={raw} />;
    default:
      return <LineValue value={raw} />;
  }
}

export function FieldCard({
  layerId,
  fieldKey,
  definition,
  value,
  onGenerateField,
  onUploadField,
  onEditField,
  className,
}: FieldCardProps) {
  const filled = isFieldFilled(value);
  const locked = value?.status === "locked";

  return (
    <Card className={cn("flex flex-col gap-3 border-neutral-6 p-3 shadow-none", className)}>
      <header className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "font-mono text-xs tabular-nums",
              filled ? "text-neutral-11" : "text-neutral-8",
            )}
          >
            {filled ? "✓" : "—"}
          </span>
          <span className="font-mono text-xs text-neutral-12">{fieldKey}</span>
          {definition.required ? (
            <Badge variant="outline" size="sm">
              required
            </Badge>
          ) : null}
        </span>
        {filled && value ? (
          <span className="inline-flex items-center gap-1.5">
            <ProvenanceBadge provenance={value.provenance} />
            <StatusBadge status={value.status} />
          </span>
        ) : null}
      </header>

      <div className="min-h-5">
        <FieldValueRender definition={definition} value={value} />
      </div>

      <footer className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          prefix={<Sparkles aria-hidden="true" />}
          disabled={onGenerateField === undefined || locked}
          aria-label={`Generate ${definition.label}`}
          onClick={() => onGenerateField?.(layerId, fieldKey)}
        >
          Generate
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          prefix={<ArrowUp aria-hidden="true" />}
          disabled={onUploadField === undefined || locked}
          aria-label={`Upload ${definition.label}`}
          onClick={() => onUploadField?.(layerId, fieldKey)}
        >
          Upload
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          prefix={<Pencil aria-hidden="true" />}
          disabled={onEditField === undefined || locked}
          aria-label={`Edit ${definition.label}`}
          onClick={() => onEditField?.(layerId, fieldKey)}
        >
          Edit
        </Button>
        {locked ? (
          <span
            className="ml-auto inline-flex items-center gap-1 text-neutral-9"
            title="Locked — human-approved"
          >
            <LockClosed aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Locked</span>
          </span>
        ) : null}
      </footer>
    </Card>
  );
}

FieldCard.displayName = "FieldCard";
