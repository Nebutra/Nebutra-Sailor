"use client";

import type { Icon } from "@nebutra/icons";
import { ArrowUp, Image, Link as LinkIcon, LockClosed, Pencil, Sparkles } from "@nebutra/icons";
import { Badge, Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import type {
  ContextFieldDefinition,
  FieldValue,
  LayerId,
} from "@/lib/startup-os/company-context/model";
import { ProvenanceBadge } from "./provenance-badge";
import type { FieldActionHandlers } from "./types";
import { isFieldFilled } from "./types";

/**
 * FieldCard — one field inside an expanded floor, rendered as a dense
 * Linear/Notion-style PROPERTY ROW (not a boxed card): a fixed mono key column,
 * the value inline, a quiet provenance chip, and icon-only actions that reveal
 * on hover/focus. Empty fields collapse to a muted "—" instead of a big block.
 * Composes existing wheels only — nothing hand-rolled.
 */

export interface FieldCardProps extends FieldActionHandlers {
  readonly layerId: LayerId;
  readonly fieldKey: string;
  readonly definition: ContextFieldDefinition;
  readonly value: FieldValue | undefined;
  readonly className?: string;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function asList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter((item): item is string => item !== undefined);
}

function EmptyValue() {
  return <span className="text-[13px] text-neutral-8">—</span>;
}

function LineValue({ value }: { value: unknown }) {
  const text = asText(value);
  return text === undefined ? (
    <EmptyValue />
  ) : (
    <p className="text-[13px] leading-snug text-neutral-12">{text}</p>
  );
}

function ListValue({ value }: { value: unknown }) {
  const items = asList(value);
  return items.length === 0 ? (
    <EmptyValue />
  ) : (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="gray-subtle" size="sm">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function StructuredValue({ value }: { value: unknown }) {
  const entries =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>)
      : [];
  if (entries.length === 0) return <EmptyValue />;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      {entries.map(([key, raw]) => (
        <span key={key} className="text-[13px] text-neutral-11">
          <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-9">
            {key}
          </span>
          <span className="ml-1 text-neutral-12">{asText(raw) ?? "—"}</span>
        </span>
      ))}
    </div>
  );
}

function AssetValue({ value }: { value: unknown }) {
  const items = asList(value);
  const label = asText(value);
  if (items.length === 0 && label === undefined) return <EmptyValue />;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-11">
      <Image aria-hidden="true" className="size-3.5 text-neutral-9" />
      <span className="font-mono text-xs">
        {items.length > 0 ? `${items.length} asset${items.length === 1 ? "" : "s"}` : label}
      </span>
    </span>
  );
}

function LinkValue({ value }: { value: unknown }) {
  const count = Array.isArray(value) ? value.length : asText(value) !== undefined ? 1 : 0;
  if (count === 0) return <EmptyValue />;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-11">
      <LinkIcon aria-hidden="true" className="size-3.5 text-neutral-9" />
      <span className="font-mono text-xs tabular-nums">
        {count} {count === 1 ? "ref" : "refs"}
      </span>
    </span>
  );
}

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

/** Icon-only ghost action — revealed on row hover/focus. */
function RowAction({
  icon: IconCmp,
  label,
  disabled,
  onClick,
}: {
  icon: Icon;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className="size-7 shrink-0 p-0 text-neutral-9 hover:text-neutral-12"
    >
      <IconCmp aria-hidden="true" className="size-3.5" />
    </Button>
  );
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
    <div className={cn("group/field flex items-start gap-3 py-2", className)}>
      {/* Key column — fixed, mono; a tiny dot marks filled vs empty. */}
      <div className="flex w-36 shrink-0 items-center gap-1.5 pt-px">
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", filled ? "bg-blue-9" : "bg-neutral-6")}
        />
        <span className="truncate font-mono text-xs text-neutral-11" title={definition.label}>
          {fieldKey}
        </span>
        {definition.required ? (
          <span className="font-mono text-[10px] text-neutral-8" title="required">
            *
          </span>
        ) : null}
      </div>

      {/* Value — inline, flex. */}
      <div className="min-w-0 flex-1 pt-px">
        <FieldValueRender definition={definition} value={value} />
      </div>

      {/* Meta + actions. */}
      <div className="flex shrink-0 items-center gap-1">
        {filled && value ? <ProvenanceBadge provenance={value.provenance} /> : null}
        {locked ? (
          <span
            className="inline-flex items-center px-1 text-neutral-9"
            title="Locked — human-approved"
          >
            <LockClosed aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Locked</span>
          </span>
        ) : (
          <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/field:opacity-100">
            <RowAction
              icon={Sparkles}
              label={`Generate ${definition.label}`}
              disabled={onGenerateField === undefined}
              onClick={() => onGenerateField?.(layerId, fieldKey)}
            />
            <RowAction
              icon={ArrowUp}
              label={`Upload ${definition.label}`}
              disabled={onUploadField === undefined}
              onClick={() => onUploadField?.(layerId, fieldKey)}
            />
            <RowAction
              icon={Pencil}
              label={`Edit ${definition.label}`}
              disabled={onEditField === undefined}
              onClick={() => onEditField?.(layerId, fieldKey)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

FieldCard.displayName = "FieldCard";
