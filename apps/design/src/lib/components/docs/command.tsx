"use client";

import {
  Button,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@nebutra/ui/primitives";
import { Fragment, useState } from "react";
import { ComponentPlayground, type Knob, type KnobValues } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

interface Item {
  group: "Suggestions" | "Settings";
  label: string;
  keys?: string[];
  spoken?: string;
}

const ITEMS: Item[] = [
  { group: "Suggestions", label: "Calendar" },
  { group: "Suggestions", label: "Search emoji" },
  { group: "Suggestions", label: "Calculator" },
  { group: "Settings", label: "Profile", keys: ["⌘", "P"], spoken: "Command P" },
  { group: "Settings", label: "Billing", keys: ["⌘", "B"], spoken: "Command B" },
  { group: "Settings", label: "Settings", keys: ["⌘", "S"], spoken: "Command S" },
];
const GROUPS = ["Suggestions", "Settings"] as const;
const DISABLED_LABEL = "Calculator";

const KNOBS: Knob[] = [
  { name: "presentation", type: "select", options: ["inline", "dialog"], defaultValue: "inline" },
  { name: "placeholder", type: "text", defaultValue: "Type a command or search..." },
  { name: "emptyText", type: "text", defaultValue: "No results found." },
  { name: "showGroups", type: "boolean", defaultValue: true },
  { name: "showShortcuts", type: "boolean", defaultValue: true },
  { name: "disableItem", type: "boolean", defaultValue: false },
  { name: "disableInput", type: "boolean", defaultValue: false },
  {
    name: "loop",
    type: "boolean",
    defaultValue: false,
    hint: "Inline only. CommandDialog does not forward Command props.",
  },
  {
    name: "shouldFilter",
    type: "boolean",
    defaultValue: true,
    hint: "Inline only. Off lists every item whatever you type.",
  },
];

function PaletteBody({
  placeholder,
  emptyText,
  showGroups,
  showShortcuts,
  disableItem,
  disableInput,
  search,
  onSearch,
  onChoose,
}: {
  placeholder: string;
  emptyText: string;
  showGroups: boolean;
  showShortcuts: boolean;
  disableItem: boolean;
  disableInput: boolean;
  search: string;
  onSearch: (search: string) => void;
  onChoose: (label: string) => void;
}) {
  const row = (item: Item) => (
    <CommandItem
      disabled={item.label === DISABLED_LABEL && disableItem}
      key={item.label}
      onSelect={() => onChoose(item.label)}
    >
      {item.label}
      {showShortcuts && item.keys ? (
        <CommandShortcut keys={item.keys} {...present({ label: item.spoken })} />
      ) : null}
    </CommandItem>
  );
  return (
    <>
      <CommandInput
        disabled={disableInput}
        onValueChange={onSearch}
        placeholder={placeholder || "Type a command or search..."}
        value={search}
      />
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>
        {showGroups
          ? GROUPS.map((group, index) => (
              <Fragment key={group}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group}>
                  {ITEMS.filter((item) => item.group === group).map(row)}
                </CommandGroup>
              </Fragment>
            ))
          : ITEMS.map(row)}
      </CommandList>
    </>
  );
}

function LiveCommand({
  presentation,
  placeholder,
  emptyText,
  showGroups,
  showShortcuts,
  disableItem,
  disableInput,
  loop,
  shouldFilter,
  initialSearch = "",
}: {
  presentation: "inline" | "dialog";
  placeholder: string;
  emptyText: string;
  showGroups: boolean;
  showShortcuts: boolean;
  disableItem: boolean;
  disableInput: boolean;
  loop: boolean;
  shouldFilter: boolean;
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("No command run.");
  const body = (close: boolean) => (
    <PaletteBody
      disableInput={disableInput}
      disableItem={disableItem}
      emptyText={emptyText}
      onChoose={(label) => {
        setAction(`${label} selected.`);
        if (close) setOpen(false);
      }}
      onSearch={setSearch}
      placeholder={placeholder}
      search={search}
      showGroups={showGroups}
      showShortcuts={showShortcuts}
    />
  );
  return (
    <div className="grid w-80 max-w-full gap-3">
      {presentation === "dialog" ? (
        <>
          <Button onClick={() => setOpen(true)} variant="outline">
            Open command palette
          </Button>
          <CommandDialog onOpenChange={setOpen} open={open}>
            {body(true)}
          </CommandDialog>
        </>
      ) : (
        <Command className="border border-border" loop={loop} shouldFilter={shouldFilter}>
          {body(false)}
        </Command>
      )}
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
    </div>
  );
}

function itemNode(item: Item, v: KnobValues, dialog: boolean): string {
  return jsx({
    name: "CommandItem",
    defaults: { disabled: false },
    props: {
      disabled: item.label === DISABLED_LABEL ? Boolean(v.disableItem) : false,
      onSelect: raw(
        dialog
          ? `() => { setAction("${item.label} selected."); setOpen(false); }`
          : `() => setAction("${item.label} selected.")`,
      ),
    },
    children: [
      item.label,
      ...(v.showShortcuts && item.keys
        ? [
            jsx({
              name: "CommandShortcut",
              props: { keys: raw(JSON.stringify(item.keys)), label: item.spoken },
            }),
          ]
        : []),
    ],
  });
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Type to filter, use the arrow keys to move the highlighted row, and press Enter to run it. In dialog mode the palette opens over the page and Escape closes it."
      code={(v) => {
        const dialog = v.presentation === "dialog";
        const list = jsx({
          name: "CommandList",
          props: {},
          children: [
            jsx({
              name: "CommandEmpty",
              props: {},
              children: String(v.emptyText),
            }),
            ...(v.showGroups
              ? GROUPS.flatMap((group, index) => [
                  ...(index > 0 ? ["<CommandSeparator />"] : []),
                  jsx({
                    name: "CommandGroup",
                    props: { heading: group },
                    children: ITEMS.filter((item) => item.group === group).map((item) =>
                      itemNode(item, v, dialog),
                    ),
                  }),
                ])
              : ITEMS.map((item) => itemNode(item, v, dialog))),
          ],
        });
        const input = jsx({
          name: "CommandInput",
          defaults: { disabled: false },
          props: {
            placeholder: String(v.placeholder) || "Type a command or search...",
            disabled: v.disableInput,
          },
        });
        const palette = dialog
          ? jsx({
              name: "CommandDialog",
              props: { open: raw("open"), onOpenChange: raw("setOpen") },
              children: [input, list],
            })
          : jsx({
              name: "Command",
              defaults: { loop: false, shouldFilter: true },
              props: {
                className: "border border-border",
                loop: v.loop,
                shouldFilter: v.shouldFilter,
              },
              children: [input, list],
            });
        const body = jsx({
          name: "div",
          props: { className: "grid w-80 max-w-full gap-3" },
          children: [
            ...(dialog
              ? [
                  jsx({
                    name: "Button",
                    props: { variant: "outline", onClick: raw("() => setOpen(true)") },
                    children: "Open command palette",
                  }),
                ]
              : []),
            palette,
            jsx({
              name: "p",
              props: { "aria-live": "polite", className: "text-muted-foreground" },
              children: raw("action"),
            }),
          ],
        });
        const names = [
          dialog ? "CommandDialog" : "Command",
          "CommandEmpty",
          "CommandInput",
          "CommandItem",
          "CommandList",
          ...(dialog ? ["Button"] : []),
          ...(v.showGroups ? ["CommandGroup", "CommandSeparator"] : []),
          ...(v.showShortcuts ? ["CommandShortcut"] : []),
        ];
        return `"use client";\n\n${snippet({
          imports: [
            { names, from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function CommandPalette(): ReactElement {\n  const [action, setAction] = useState("No command run.");\n${dialog ? "  const [open, setOpen] = useState(false);\n" : ""}  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveCommand
          disableInput={Boolean(v.disableInput)}
          disableItem={Boolean(v.disableItem)}
          emptyText={String(v.emptyText)}
          key={String(v.presentation)}
          loop={Boolean(v.loop)}
          placeholder={String(v.placeholder)}
          presentation={v.presentation as "inline" | "dialog"}
          shouldFilter={Boolean(v.shouldFilter)}
          showGroups={Boolean(v.showGroups)}
          showShortcuts={Boolean(v.showShortcuts)}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "idle", label: "Idle" },
        { id: "filtered", label: "Filtered" },
        { id: "empty", label: "No results" },
        { id: "disabled-item", label: "Disabled item" },
        { id: "disabled-input", label: "Disabled input" },
      ]}
      note="Every cell is a live inline palette with its own query. The highlighted row is the one cmdk selects first; hover or the arrow keys move it. Filtered starts with the query set, No results starts with one nothing matches, and Disabled item dims Calculator and skips it. Command has no loading or error state of its own."
      render={(layout, state) => (
        <div className="w-64">
          <LiveCommand
            disableInput={state === "disabled-input"}
            disableItem={state === "disabled-item"}
            emptyText="No results found."
            initialSearch={state === "filtered" ? "set" : state === "empty" ? "zzz" : ""}
            loop={false}
            placeholder="Search..."
            presentation="inline"
            shouldFilter
            showGroups={layout === "grouped"}
            showShortcuts={layout === "grouped"}
          />
        </div>
      )}
      rows={[
        { id: "flat", label: "Flat list" },
        { id: "grouped", label: "Grouped with shortcuts" },
      ]}
      rowsLabel="Layout"
    />
  );
}
