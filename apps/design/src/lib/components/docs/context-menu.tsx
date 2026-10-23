"use client";
// @primitive-exempt: the trigger is a bare button on purpose: it shows a focusable trigger passed through asChild, styled as the right-click region.

import { Copy, Download, Pencil, Trash } from "@nebutra/icons";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const ALIGNS = ["start", "center", "end"] as const;
const SIDES = ["bottom", "top", "right", "left"] as const;
const SORTS = ["Name", "Date modified"] as const;
const SHARE = ["Email link", "Copy link"] as const;
const REGION =
  "flex h-32 w-64 max-w-full items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-muted-foreground text-sm break-words";

const KNOBS: Knob[] = [
  { name: "triggerLabel", type: "text", defaultValue: "Right click or long press here" },
  { name: "align", type: "select", options: ALIGNS, defaultValue: "start" },
  { name: "side", type: "select", options: SIDES, defaultValue: "bottom" },
  {
    name: "focusable",
    type: "boolean",
    defaultValue: false,
    hint: "Renders the region as a button so Tab reaches it.",
  },
  { name: "showIcons", type: "boolean", defaultValue: true },
  { name: "showShortcuts", type: "boolean", defaultValue: true },
  { name: "disableItem", type: "boolean", defaultValue: false, hint: "Disables Export." },
  { name: "showSubmenu", type: "boolean", defaultValue: true },
  { name: "showCheckbox", type: "boolean", defaultValue: true },
  {
    name: "defaultChecked",
    type: "boolean",
    defaultValue: true,
    hint: "Initial preference when showCheckbox is enabled.",
  },
  { name: "showRadio", type: "boolean", defaultValue: true },
  { name: "showDestructive", type: "boolean", defaultValue: true },
];

function LiveContextMenu({
  triggerLabel,
  align,
  side,
  focusable,
  showIcons,
  showShortcuts,
  disableItem,
  showSubmenu,
  showCheckbox,
  defaultChecked,
  showRadio,
  showDestructive,
  regionClassName = REGION,
}: {
  triggerLabel: string;
  align: (typeof ALIGNS)[number];
  side: (typeof SIDES)[number];
  focusable: boolean;
  showIcons: boolean;
  showShortcuts: boolean;
  disableItem: boolean;
  showSubmenu: boolean;
  showCheckbox: boolean;
  defaultChecked: boolean;
  showRadio: boolean;
  showDestructive: boolean;
  regionClassName?: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [sort, setSort] = useState<string>(SORTS[0]);
  const [action, setAction] = useState("No action selected.");
  const label = triggerLabel || "Right click or long press here";
  const shortcut = (keys: string) =>
    showShortcuts ? <ContextMenuShortcut>{keys}</ContextMenuShortcut> : undefined;
  return (
    <div className="grid max-w-full gap-3">
      <ContextMenu>
        {focusable ? (
          <ContextMenuTrigger asChild>
            <button className={regionClassName} type="button">
              {label}
            </button>
          </ContextMenuTrigger>
        ) : (
          <ContextMenuTrigger className={regionClassName}>{label}</ContextMenuTrigger>
        )}
        <ContextMenuContent align={align} side={side}>
          <ContextMenuGroup>
            <ContextMenuLabel>File</ContextMenuLabel>
            <ContextMenuItem
              onSelect={() => setAction("Copy selected.")}
              prefix={showIcons ? <Copy /> : undefined}
              suffix={shortcut("⌘C")}
            >
              Copy
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => setAction("Rename selected.")}
              prefix={showIcons ? <Pencil /> : undefined}
              suffix={shortcut("F2")}
            >
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              disabled={disableItem}
              onSelect={() => setAction("Export selected.")}
              prefix={showIcons ? <Download /> : undefined}
            >
              Export
            </ContextMenuItem>
          </ContextMenuGroup>
          {showSubmenu ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {SHARE.map((target) => (
                    <ContextMenuItem key={target} onSelect={() => setAction(`${target} selected.`)}>
                      {target}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          ) : null}
          {showCheckbox ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
                Show hidden files
              </ContextMenuCheckboxItem>
            </>
          ) : null}
          {showRadio ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuLabel>Sort by</ContextMenuLabel>
                <ContextMenuRadioGroup onValueChange={setSort} value={sort}>
                  {SORTS.map((name) => (
                    <ContextMenuRadioItem key={name} value={name}>
                      {name}
                    </ContextMenuRadioItem>
                  ))}
                </ContextMenuRadioGroup>
              </ContextMenuGroup>
            </>
          ) : null}
          {showDestructive ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => setAction("Delete selected.")}
                prefix={showIcons ? <Trash /> : undefined}
                suffix={shortcut("⌫")}
                variant="destructive"
              >
                Delete
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
      {showCheckbox || showRadio ? (
        <p className="text-muted-foreground">
          {showCheckbox ? `Hidden files: ${checked ? "shown" : "hidden"}. ` : ""}
          {showRadio ? `Sorted by: ${sort}.` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Right click the dashed region, or press and hold on a touch screen, to open the menu at the pointer. Then use the arrow keys, Enter and Escape. The region is not focusable by itself; turn on focusable to give it a button."
      code={(v) => {
        const shortcut = (keys: string) =>
          v.showShortcuts ? raw(`<ContextMenuShortcut>${keys}</ContextMenuShortcut>`) : undefined;
        const icon = (name: string) => (v.showIcons ? raw(`<${name} />`) : undefined);
        const item = (
          label: string,
          extra: { icon?: string; keys?: string; disabled?: boolean; destructive?: boolean } = {},
        ) =>
          jsx({
            name: "ContextMenuItem",
            defaults: { disabled: false, variant: "default" },
            props: {
              disabled: extra.disabled ?? false,
              variant: extra.destructive ? "destructive" : "default",
              prefix: extra.icon ? icon(extra.icon) : undefined,
              suffix: extra.keys ? shortcut(extra.keys) : undefined,
              onSelect: raw(`() => setAction("${label} selected.")`),
            },
            children: label,
          });

        const trigger = v.focusable
          ? jsx({
              name: "ContextMenuTrigger",
              props: { asChild: true },
              children: [
                jsx({
                  name: "button",
                  props: { className: REGION, type: "button" },
                  children: String(v.triggerLabel) || "Right click or long press here",
                }),
              ],
            })
          : jsx({
              name: "ContextMenuTrigger",
              props: { className: REGION },
              children: String(v.triggerLabel) || "Right click or long press here",
            });

        const content = jsx({
          name: "ContextMenuContent",
          defaults: { align: "start", side: "bottom" },
          props: { align: String(v.align), side: String(v.side) },
          children: [
            jsx({
              name: "ContextMenuGroup",
              props: {},
              children: [
                jsx({ name: "ContextMenuLabel", props: {}, children: "File" }),
                item("Copy", { icon: "Copy", keys: "⌘C" }),
                item("Rename", { icon: "Pencil", keys: "F2" }),
                item("Export", { icon: "Download", disabled: Boolean(v.disableItem) }),
              ],
            }),
            ...(v.showSubmenu
              ? [
                  "<ContextMenuSeparator />",
                  jsx({
                    name: "ContextMenuSub",
                    props: {},
                    children: [
                      jsx({ name: "ContextMenuSubTrigger", props: {}, children: "Share" }),
                      jsx({
                        name: "ContextMenuSubContent",
                        props: {},
                        children: SHARE.map((target) => item(target)),
                      }),
                    ],
                  }),
                ]
              : []),
            ...(v.showCheckbox
              ? [
                  "<ContextMenuSeparator />",
                  jsx({
                    name: "ContextMenuCheckboxItem",
                    props: { checked: raw("checked"), onCheckedChange: raw("setChecked") },
                    children: "Show hidden files",
                  }),
                ]
              : []),
            ...(v.showRadio
              ? [
                  "<ContextMenuSeparator />",
                  jsx({
                    name: "ContextMenuGroup",
                    props: {},
                    children: [
                      jsx({ name: "ContextMenuLabel", props: {}, children: "Sort by" }),
                      jsx({
                        name: "ContextMenuRadioGroup",
                        props: { value: raw("sort"), onValueChange: raw("setSort") },
                        children: SORTS.map((name) =>
                          jsx({
                            name: "ContextMenuRadioItem",
                            props: { value: name },
                            children: name,
                          }),
                        ),
                      }),
                    ],
                  }),
                ]
              : []),
            ...(v.showDestructive
              ? [
                  "<ContextMenuSeparator />",
                  item("Delete", { icon: "Trash", keys: "⌫", destructive: true }),
                ]
              : []),
          ],
        });

        const body = jsx({
          name: "div",
          props: { className: "grid max-w-full gap-3" },
          children: [
            jsx({ name: "ContextMenu", props: {}, children: [trigger, content] }),
            jsx({
              name: "p",
              props: { "aria-live": "polite", className: "text-muted-foreground" },
              children: raw("action"),
            }),
          ],
        });

        const icons = v.showIcons
          ? ["Copy", "Download", "Pencil", ...(v.showDestructive ? ["Trash"] : [])]
          : [];
        const names = [
          "ContextMenu",
          "ContextMenuContent",
          "ContextMenuGroup",
          "ContextMenuItem",
          "ContextMenuLabel",
          "ContextMenuTrigger",
          ...(v.showShortcuts ? ["ContextMenuShortcut"] : []),
          ...(v.showSubmenu
            ? ["ContextMenuSub", "ContextMenuSubContent", "ContextMenuSubTrigger"]
            : []),
          ...(v.showSubmenu || v.showCheckbox || v.showRadio || v.showDestructive
            ? ["ContextMenuSeparator"]
            : []),
          ...(v.showCheckbox ? ["ContextMenuCheckboxItem"] : []),
          ...(v.showRadio ? ["ContextMenuRadioGroup", "ContextMenuRadioItem"] : []),
        ];
        return `"use client";\n\n${snippet({
          imports: [
            { names, from: "@nebutra/ui/primitives" },
            ...(icons.length > 0 ? [{ names: icons, from: "@nebutra/icons" }] : []),
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function FileMenu(): ReactElement {\n  const [action, setAction] = useState("No action selected.");\n${v.showCheckbox ? `  const [checked, setChecked] = useState(${Boolean(v.defaultChecked)});\n` : ""}${v.showRadio ? `  const [sort, setSort] = useState("${SORTS[0]}");\n` : ""}  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveContextMenu
          align={v.align as (typeof ALIGNS)[number]}
          defaultChecked={Boolean(v.defaultChecked)}
          disableItem={Boolean(v.disableItem)}
          focusable={Boolean(v.focusable)}
          key={`${v.defaultChecked}-${v.focusable}`}
          showCheckbox={Boolean(v.showCheckbox)}
          showDestructive={Boolean(v.showDestructive)}
          showIcons={Boolean(v.showIcons)}
          showRadio={Boolean(v.showRadio)}
          showShortcuts={Boolean(v.showShortcuts)}
          showSubmenu={Boolean(v.showSubmenu)}
          side={v.side as (typeof SIDES)[number]}
          triggerLabel={String(v.triggerLabel)}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "default", label: "Default" },
        { id: "disabled-item", label: "Disabled item" },
        { id: "unchecked", label: "Unchecked preference" },
        { id: "plain", label: "No icons or shortcuts" },
      ]}
      note="Right click or long press each region to open that cell's own menu. Actions, the checkbox and the sort choice are local to the cell. The menu opens at the pointer, so the alignment rows only shift the panel against it. ContextMenu has no loading or error state of its own."
      render={(align, state) => (
        <LiveContextMenu
          align={align as (typeof ALIGNS)[number]}
          defaultChecked={state !== "unchecked"}
          disableItem={state === "disabled-item"}
          focusable={false}
          regionClassName="flex h-16 w-44 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground text-sm"
          showCheckbox
          showDestructive
          showIcons={state !== "plain"}
          showRadio
          showShortcuts={state !== "plain"}
          showSubmenu
          side="bottom"
          triggerLabel="Right click here"
        />
      )}
      rows={ALIGNS.map((align) => ({ id: align, label: align }))}
      rowsLabel="Panel alignment"
    />
  );
}
