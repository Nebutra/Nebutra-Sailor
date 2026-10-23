"use client";

import { MultipleSelector, type MultipleSelectorOption, Spinner } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const OPTIONS: MultipleSelectorOption[] = [
  { value: "react", label: "React", group: "Library" },
  { value: "vue", label: "Vue", group: "Library" },
  { value: "svelte", label: "Svelte", group: "Compiler" },
  { value: "solid", label: "Solid", group: "Compiler" },
  { value: "angular", label: "Angular", group: "Framework", disable: true },
  { value: "next", label: "Next.js", group: "Framework" },
];

const PRESELECTED: MultipleSelectorOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
];

/** What the snippet shows for an option: the plain object a reader would write. */
function literal(options: MultipleSelectorOption[]): string {
  return JSON.stringify(options, null, 2);
}

function matches(query: string): MultipleSelectorOption[] {
  return OPTIONS.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
}

/** Holds the selection when the playground controls it, and reports the limit. */
function LiveSelector({
  initial,
  maxSelected,
  search,
  ...props
}: {
  initial: MultipleSelectorOption[] | undefined;
  maxSelected: number | undefined;
  search: string;
} & Omit<
  React.ComponentProps<typeof MultipleSelector>,
  "value" | "onValueChange" | "maxSelected"
>) {
  const [value, setValue] = React.useState<MultipleSelectorOption[] | undefined>(initial);
  const [limit, setLimit] = React.useState<number | null>(null);
  const controlled = value !== undefined;
  return (
    <div className="flex min-h-72 w-80 max-w-full flex-col gap-2">
      <MultipleSelector
        {...props}
        {...(controlled ? { value } : {})}
        {...(search === "async"
          ? {
              onSearch: async (query: string) => {
                await new Promise((resolve) => setTimeout(resolve, 600));
                return matches(query);
              },
              loadingIndicator: (
                <p className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                  <Spinner size="sm" /> Searching
                </p>
              ),
            }
          : {})}
        {...(search === "sync" ? { onSearchSync: matches } : {})}
        {...(maxSelected === undefined
          ? {}
          : { maxSelected, onMaxSelected: (max: number) => setLimit(max) })}
        onValueChange={(next) => {
          setLimit(null);
          if (controlled) setValue(next);
        }}
      />
      {limit === null ? null : (
        <p className="text-muted-foreground text-xs" role="status">
          Limit of {limit} reached. Remove one to add another.
        </p>
      )}
    </div>
  );
}

const KNOBS: Knob[] = [
  { name: "placeholder", type: "text", defaultValue: "Select frameworks" },
  { name: "emptyIndicator", type: "text", defaultValue: "No results." },
  {
    name: "preselected",
    type: "boolean",
    defaultValue: false,
    hint: "Starts with React and Vue selected, and controls the value.",
  },
  {
    name: "fixedFirst",
    label: "fixed (first token)",
    type: "boolean",
    defaultValue: false,
    hint: "Needs preselected. A fixed token has no remove button and survives clear-all.",
  },
  { name: "creatable", type: "boolean", defaultValue: false },
  { name: "maxSelected", type: "select", options: ["none", "2", "3"], defaultValue: "none" },
  { name: "groupBy", label: "groupBy (group)", type: "boolean", defaultValue: false },
  { name: "search", type: "select", options: ["off", "sync", "async"], defaultValue: "off" },
  { name: "triggerSearchOnFocus", type: "boolean", defaultValue: false },
  { name: "hidePlaceholderWhenSelected", type: "boolean", defaultValue: false },
  { name: "hideClearAllButton", type: "boolean", defaultValue: false },
  { name: "disabled", type: "boolean", defaultValue: false },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Focus the field to open the list. Type to filter, Enter picks the highlighted option, Backspace on an empty field removes the last token. Async search waits for the debounce, then shows the loading indicator."
      code={(v) => {
        const search = String(v.search);
        const limit = String(v.maxSelected);
        const initial = v.preselected
          ? PRESELECTED.map((option, index) =>
              index === 0 && v.fixedFirst ? { ...option, fixed: true } : option,
            )
          : undefined;
        const lines = [`const OPTIONS = ${literal(OPTIONS)};`];
        if (search !== "off") {
          lines.push(
            `const search = ${search === "async" ? "async " : ""}(query: string) =>\n  OPTIONS.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));`,
          );
        }
        if (initial) {
          lines.push(
            `const [selected, setSelected] = useState<MultipleSelectorOption[]>(${literal(initial)});`,
          );
        }
        return snippet({
          imports: [
            {
              names: ["MultipleSelector", ...(initial ? ["type MultipleSelectorOption"] : [])],
              from: "@nebutra/ui/primitives",
            },
            ...(initial ? [{ names: ["useState"], from: "react" }] : []),
          ],
          body: `${lines.join("\n\n")}\n\n${jsx({
            name: "MultipleSelector",
            defaults: { selectFirstItem: true },
            props: {
              defaultOptions: raw("OPTIONS"),
              value: initial ? raw("selected") : undefined,
              onValueChange: initial ? raw("setSelected") : undefined,
              placeholder: String(v.placeholder) || undefined,
              emptyIndicator: String(v.emptyIndicator) || undefined,
              inputProps: raw('{ "aria-label": "Frameworks" }'),
              creatable: v.creatable,
              maxSelected: limit === "none" ? undefined : Number(limit),
              groupBy: v.groupBy ? "group" : undefined,
              onSearch: search === "async" ? raw("search") : undefined,
              onSearchSync: search === "sync" ? raw("search") : undefined,
              triggerSearchOnFocus: v.triggerSearchOnFocus,
              hidePlaceholderWhenSelected: v.hidePlaceholderWhenSelected,
              hideClearAllButton: v.hideClearAllButton,
              disabled: v.disabled,
            },
          })}`,
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const search = String(v.search);
        const limit = String(v.maxSelected);
        const initial = v.preselected
          ? PRESELECTED.map((option, index) =>
              index === 0 && v.fixedFirst ? { ...option, fixed: true } : option,
            )
          : undefined;
        // A new key restarts the component when a knob changes what it starts from.
        const key = [v.preselected, v.fixedFirst, search, v.groupBy, v.triggerSearchOnFocus].join();
        return (
          <LiveSelector
            creatable={Boolean(v.creatable)}
            defaultOptions={OPTIONS}
            disabled={Boolean(v.disabled)}
            hideClearAllButton={Boolean(v.hideClearAllButton)}
            hidePlaceholderWhenSelected={Boolean(v.hidePlaceholderWhenSelected)}
            initial={initial}
            inputProps={{ "aria-label": "Frameworks" }}
            key={key}
            maxSelected={limit === "none" ? undefined : Number(limit)}
            search={search}
            triggerSearchOnFocus={Boolean(v.triggerSearchOnFocus)}
            {...present({
              emptyIndicator: String(v.emptyIndicator) || undefined,
              groupBy: v.groupBy ? "group" : undefined,
              placeholder: String(v.placeholder) || undefined,
            })}
          />
        );
      }}
    />
  );
}

const SELECTIONS: Record<string, MultipleSelectorOption[]> = {
  empty: [],
  one: [{ value: "react", label: "React" }],
  many: [
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "svelte", label: "Svelte" },
    { value: "solid", label: "Solid" },
    { value: "next", label: "Next.js" },
  ],
  fixed: [
    { value: "react", label: "React", fixed: true },
    { value: "vue", label: "Vue" },
  ],
};

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "disabled", label: "Disabled" },
  { id: "no-clear", label: "Clear-all hidden" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="MultipleSelector has no size, invalid or loading prop. Rows are what is selected; fixed tokens drop their remove button. A loading state only exists inside the open list, when onSearch is pending. Focus a cell to open its list; hover and focus are live."
      render={(selection, column) => (
        <div className="w-72">
          <MultipleSelector
            defaultOptions={OPTIONS}
            disabled={column === "disabled"}
            hideClearAllButton={column === "no-clear"}
            inputProps={{ "aria-label": `${selection} ${column}` }}
            placeholder="Select frameworks"
            value={SELECTIONS[selection] ?? []}
          />
        </div>
      )}
      rows={Object.keys(SELECTIONS).map((id) => ({ id, label: id }))}
      rowsLabel="Selection"
    />
  );
}
