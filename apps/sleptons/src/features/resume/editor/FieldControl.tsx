"use client";

import { Cross, Plus } from "@nebutra/icons";
import { Button, Field, Input, Select, Textarea } from "@nebutra/ui/primitives";
import { useId, useState } from "react";
import type { FieldDef } from "./sections";

interface FieldControlProps {
  field: FieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

/** Renders one FieldDef with design-system primitives. No raw inputs (lint rule). */
export function FieldControl({ field, value, error, onChange }: FieldControlProps) {
  const id = useId();
  const label = field.required ? `${field.label} *` : field.label;

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={id}
          label={label}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          description={field.description}
          error={error}
          rows={5}
          onValueChange={onChange}
        />
      );

    case "select":
      return (
        <Field label={label} htmlFor={id} error={error} description={field.description}>
          <Select
            id={id}
            name={field.key}
            options={field.options ?? []}
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => onChange(v ?? undefined)}
          />
        </Field>
      );

    case "tags":
      return (
        <Field label={label} htmlFor={id} error={error} description={field.description}>
          <TokenList
            id={id}
            values={Array.isArray(value) ? (value as string[]) : []}
            placeholder={field.placeholder ?? "Type and press Enter"}
            maxItems={field.maxItems}
            suggestions={field.suggestions}
            onChange={onChange}
            inline
          />
        </Field>
      );

    case "bullets":
      return (
        <Field label={label} htmlFor={id} error={error} description={field.description}>
          <TokenList
            id={id}
            values={Array.isArray(value) ? (value as string[]) : []}
            placeholder={field.placeholder ?? "Add a line and press Enter"}
            maxItems={field.maxItems}
            onChange={onChange}
          />
        </Field>
      );

    case "number":
      return (
        <Input
          id={id}
          label={label}
          type="number"
          inputMode="numeric"
          value={typeof value === "number" ? String(value) : ""}
          placeholder={field.placeholder}
          description={field.description}
          error={error}
          onValueChange={(v) => onChange(v === "" ? undefined : Number(v))}
        />
      );

    default:
      return (
        <Input
          id={id}
          label={label}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          description={field.description}
          error={error}
          onValueChange={onChange}
        />
      );
  }
}

interface TokenListProps {
  id: string;
  values: string[];
  placeholder: string;
  maxItems?: number;
  suggestions?: readonly string[];
  onChange: (values: string[]) => void;
  /** Chips in a row (tags) vs one item per row (bullets). */
  inline?: boolean;
}

/** Shared list editor for `tags` and `bullets`: Enter adds, Backspace on empty removes last. */
export function TokenList({
  id,
  values,
  placeholder,
  maxItems,
  suggestions,
  onChange,
  inline,
}: TokenListProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const full = maxItems !== undefined && values.length >= maxItems;

  const add = () => {
    const v = draft.trim();
    if (!v || full) return;
    if (inline && values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="grid gap-2">
      {values.length > 0 && (
        <ul className={inline ? "flex flex-wrap gap-1.5" : "grid gap-1.5"}>
          {values.map((v, i) => (
            <li
              key={`${i}-${v}`}
              className={
                inline
                  ? "inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-sm text-foreground"
                  : "flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground"
              }
            >
              <span className={inline ? "" : "flex-1 whitespace-pre-wrap"}>{v}</span>
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => removeAt(i)}
              >
                <Cross className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={full ? `Max ${maxItems}` : placeholder}
          disabled={full}
          list={suggestions ? listId : undefined}
          onValueChange={setDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && draft === "" && values.length) {
              removeAt(values.length - 1);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          aria-label="Add"
          onClick={add}
          disabled={full || !draft.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
