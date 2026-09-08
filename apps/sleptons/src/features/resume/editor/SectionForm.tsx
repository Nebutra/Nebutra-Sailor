"use client";

import { ChevronDown, ChevronUp, Plus, Trash } from "@nebutra/icons";
import { Button, Field } from "@nebutra/ui/primitives";
import type { Dispatch } from "react";
import { TECH_STACK_OPTIONS } from "@/lib/constants";
import { FieldControl, TokenList } from "./FieldControl";
import type { SectionDef } from "./sections";
import { type EditorAction, type EditorContent, itemTitle, type ListItem } from "./state";
import { type FieldIssue, issueFor } from "./useResumeAutosave";

interface SectionFormProps {
  section: SectionDef;
  content: EditorContent;
  issues: FieldIssue[];
  dispatch: Dispatch<EditorAction>;
}

const grid = "grid grid-cols-1 gap-4 md:grid-cols-2";
const span = (wide?: boolean) => (wide ? "md:col-span-2" : "");

export function SectionForm({ section, content, issues, dispatch }: SectionFormProps) {
  switch (section.kind) {
    case "object": {
      const data = (content[section.id] ?? {}) as Record<string, unknown>;
      return (
        <div className={grid}>
          {section.fields.map((f) => (
            <div key={f.key} className={span(f.wide)}>
              <FieldControl
                field={f}
                value={data[f.key]}
                error={issueFor(issues, `${section.id}.${f.key}`)}
                onChange={(value) =>
                  dispatch({ type: "setField", section: section.id, key: f.key, value })
                }
              />
            </div>
          ))}
        </div>
      );
    }

    case "list": {
      const items = ((content[section.id] as ListItem[] | undefined) ?? []) as ListItem[];
      return (
        <div className="grid gap-4">
          {items.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </p>
          )}
          {items.map((item, index) => (
            <article
              key={`${section.id}-${index}`}
              className="rounded-lg border border-border bg-background p-4"
              aria-label={`${section.title} ${index + 1}`}
            >
              <header className="mb-3 flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium text-foreground">
                  {itemTitle(item, section.itemTitleKey, `${section.title} ${index + 1}`)}
                </h3>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() =>
                      dispatch({ type: "moveItem", section: section.id, index, direction: -1 })
                    }
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Move down"
                    disabled={index === items.length - 1}
                    onClick={() =>
                      dispatch({ type: "moveItem", section: section.id, index, direction: 1 })
                    }
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remove"
                    onClick={() => dispatch({ type: "removeItem", section: section.id, index })}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </header>
              <div className={grid}>
                {section.fields.map((f) => (
                  <div key={f.key} className={span(f.wide)}>
                    <FieldControl
                      field={f}
                      value={item[f.key]}
                      error={issueFor(issues, `${section.id}.${index}.${f.key}`)}
                      onChange={(value) =>
                        dispatch({
                          type: "setItemField",
                          section: section.id,
                          index,
                          key: f.key,
                          value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </article>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: "addItem", section: section.id })}
            >
              <Plus className="mr-1 h-4 w-4" />
              {section.addLabel}
            </Button>
          </div>
        </div>
      );
    }

    case "skills": {
      const skills = (content.skills ?? {}) as Partial<Record<string, string[]>>;
      return (
        <div className={grid}>
          {section.categories.map((c) => (
            <Field key={c.key} label={c.label} htmlFor={`skills-${c.key}`}>
              <TokenList
                id={`skills-${c.key}`}
                values={skills[c.key] ?? []}
                placeholder="Type and press Enter"
                maxItems={20}
                suggestions={TECH_STACK_OPTIONS}
                inline
                onChange={(values) => dispatch({ type: "setSkills", category: c.key, values })}
              />
            </Field>
          ))}
        </div>
      );
    }

    case "tags":
      return (
        <FieldControl
          field={section.field}
          value={content.interests}
          error={issueFor(issues, "interests")}
          onChange={(value) =>
            dispatch({ type: "setInterests", values: (value as string[]) ?? [] })
          }
        />
      );

    default:
      return null;
  }
}
