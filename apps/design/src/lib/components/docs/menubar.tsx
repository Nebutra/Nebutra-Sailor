"use client";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const ALIGNS = ["start", "center", "end"] as const;
const SIDES = ["bottom", "top"] as const;
const PROFILES = ["Andy", "Benoit", "Luis"] as const;
const SHARE = ["Email link", "Messages", "Notes"] as const;

const KNOBS: Knob[] = [
  { name: "fileLabel", type: "text", defaultValue: "File" },
  { name: "align", type: "select", options: ALIGNS, defaultValue: "start" },
  { name: "side", type: "select", options: SIDES, defaultValue: "bottom" },
  { name: "loopFocus", type: "boolean", defaultValue: true },
  { name: "disabledBar", type: "boolean", defaultValue: false },
  { name: "disabledTrigger", type: "boolean", defaultValue: false, hint: "Disables View." },
  { name: "disableItem", type: "boolean", defaultValue: false },
  { name: "showShortcuts", type: "boolean", defaultValue: true },
  { name: "showSubmenu", type: "boolean", defaultValue: true },
  { name: "showCheckbox", type: "boolean", defaultValue: true },
  { name: "showRadio", type: "boolean", defaultValue: true },
  {
    name: "defaultChecked",
    type: "boolean",
    defaultValue: true,
    hint: "Initial preference when showCheckbox is enabled.",
  },
];

function LiveMenubar({
  fileLabel,
  align,
  side,
  loopFocus,
  disabledBar,
  disabledTrigger,
  disableItem,
  showShortcuts,
  showSubmenu,
  showCheckbox,
  showRadio,
  defaultChecked,
}: {
  fileLabel: string;
  align: (typeof ALIGNS)[number];
  side: (typeof SIDES)[number];
  loopFocus: boolean;
  disabledBar: boolean;
  disabledTrigger: boolean;
  disableItem: boolean;
  showShortcuts: boolean;
  showSubmenu: boolean;
  showCheckbox: boolean;
  showRadio: boolean;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [profile, setProfile] = useState<string>(PROFILES[0]);
  const [action, setAction] = useState("No action selected.");
  return (
    <div className="grid max-w-full gap-3">
      <Menubar disabled={disabledBar} loopFocus={loopFocus}>
        <MenubarMenu>
          <MenubarTrigger>{fileLabel || "File"}</MenubarTrigger>
          <MenubarContent align={align} side={side}>
            <MenubarItem onClick={() => setAction("New tab selected.")}>
              New tab
              {showShortcuts ? <MenubarShortcut>⌘T</MenubarShortcut> : null}
            </MenubarItem>
            <MenubarItem onClick={() => setAction("New window selected.")}>
              New window
              {showShortcuts ? <MenubarShortcut>⌘N</MenubarShortcut> : null}
            </MenubarItem>
            <MenubarItem disabled={disableItem} onClick={() => setAction("Incognito selected.")}>
              New incognito window
            </MenubarItem>
            {showSubmenu ? (
              <>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>Share</MenubarSubTrigger>
                  <MenubarSubContent>
                    {SHARE.map((target) => (
                      <MenubarItem key={target} onClick={() => setAction(`${target} selected.`)}>
                        {target}
                      </MenubarItem>
                    ))}
                  </MenubarSubContent>
                </MenubarSub>
              </>
            ) : null}
            <MenubarSeparator />
            <MenubarItem onClick={() => setAction("Print selected.")}>
              Print
              {showShortcuts ? <MenubarShortcut>⌘P</MenubarShortcut> : null}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger disabled={disabledTrigger}>View</MenubarTrigger>
          <MenubarContent align={align} side={side}>
            {showCheckbox ? (
              <MenubarCheckboxItem checked={checked} onCheckedChange={setChecked}>
                Always show bookmarks bar
              </MenubarCheckboxItem>
            ) : null}
            {showCheckbox && showRadio ? <MenubarSeparator /> : null}
            {showRadio ? (
              <>
                <MenubarLabel inset>Profile</MenubarLabel>
                <MenubarRadioGroup onValueChange={setProfile} value={profile}>
                  {PROFILES.map((name) => (
                    <MenubarRadioItem key={name} value={name}>
                      {name}
                    </MenubarRadioItem>
                  ))}
                </MenubarRadioGroup>
              </>
            ) : null}
            {!(showCheckbox || showRadio) ? (
              <MenubarItem disabled>Nothing to show</MenubarItem>
            ) : null}
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
      {showCheckbox || showRadio ? (
        <p className="text-muted-foreground">
          {showCheckbox ? `Bookmarks bar: ${checked ? "shown" : "hidden"}. ` : ""}
          {showRadio ? `Profile: ${profile}.` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Open a menu, then use the arrow keys: left and right move between File and View, up and down move through items, and right opens Share. Escape closes the menu and returns focus to its trigger."
      code={(v) => {
        const content = (children: string[]) =>
          jsx({
            name: "MenubarContent",
            defaults: { align: "start", side: "bottom" },
            props: { align: String(v.align), side: String(v.side) },
            children,
          });
        const shortcut = (keys: string) =>
          v.showShortcuts ? [jsx({ name: "MenubarShortcut", props: {}, children: keys })] : [];
        const item = (label: string, keys?: string, disabled = false) =>
          jsx({
            name: "MenubarItem",
            defaults: { disabled: false },
            props: {
              disabled,
              onClick: raw(`() => setAction("${label} selected.")`),
            },
            children: [label, ...(keys ? shortcut(keys) : [])],
          });

        const fileItems = [
          item("New tab", "⌘T"),
          item("New window", "⌘N"),
          jsx({
            name: "MenubarItem",
            defaults: { disabled: false },
            props: {
              disabled: v.disableItem,
              onClick: raw('() => setAction("Incognito selected.")'),
            },
            children: "New incognito window",
          }),
          ...(v.showSubmenu
            ? [
                "<MenubarSeparator />",
                jsx({
                  name: "MenubarSub",
                  props: {},
                  children: [
                    jsx({ name: "MenubarSubTrigger", props: {}, children: "Share" }),
                    jsx({
                      name: "MenubarSubContent",
                      props: {},
                      children: SHARE.map((target) => item(target)),
                    }),
                  ],
                }),
              ]
            : []),
          "<MenubarSeparator />",
          item("Print", "⌘P"),
        ];
        const viewItems = [
          ...(v.showCheckbox
            ? [
                jsx({
                  name: "MenubarCheckboxItem",
                  props: { checked: raw("checked"), onCheckedChange: raw("setChecked") },
                  children: "Always show bookmarks bar",
                }),
              ]
            : []),
          ...(v.showCheckbox && v.showRadio ? ["<MenubarSeparator />"] : []),
          ...(v.showRadio
            ? [
                jsx({ name: "MenubarLabel", props: { inset: true }, children: "Profile" }),
                jsx({
                  name: "MenubarRadioGroup",
                  props: { value: raw("profile"), onValueChange: raw("setProfile") },
                  children: PROFILES.map((name) =>
                    jsx({ name: "MenubarRadioItem", props: { value: name }, children: name }),
                  ),
                }),
              ]
            : []),
          ...(v.showCheckbox || v.showRadio
            ? []
            : [
                jsx({
                  name: "MenubarItem",
                  props: { disabled: true },
                  children: "Nothing to show",
                }),
              ]),
        ];

        const body = jsx({
          name: "div",
          props: { className: "grid max-w-full gap-3" },
          children: [
            jsx({
              name: "Menubar",
              defaults: { disabled: false, loopFocus: true },
              props: { disabled: v.disabledBar, loopFocus: v.loopFocus },
              children: [
                jsx({
                  name: "MenubarMenu",
                  props: {},
                  children: [
                    jsx({
                      name: "MenubarTrigger",
                      props: {},
                      children: String(v.fileLabel) || "File",
                    }),
                    content(fileItems),
                  ],
                }),
                jsx({
                  name: "MenubarMenu",
                  props: {},
                  children: [
                    jsx({
                      name: "MenubarTrigger",
                      defaults: { disabled: false },
                      props: { disabled: v.disabledTrigger },
                      children: "View",
                    }),
                    content(viewItems),
                  ],
                }),
              ],
            }),
            jsx({
              name: "p",
              props: { "aria-live": "polite", className: "text-muted-foreground" },
              children: raw("action"),
            }),
          ],
        });
        const names = [
          "Menubar",
          "MenubarContent",
          "MenubarItem",
          "MenubarMenu",
          "MenubarSeparator",
          "MenubarTrigger",
          ...(v.showShortcuts ? ["MenubarShortcut"] : []),
          ...(v.showSubmenu ? ["MenubarSub", "MenubarSubContent", "MenubarSubTrigger"] : []),
          ...(v.showCheckbox ? ["MenubarCheckboxItem"] : []),
          ...(v.showRadio ? ["MenubarLabel", "MenubarRadioGroup", "MenubarRadioItem"] : []),
        ];
        return `"use client";\n\n${snippet({
          imports: [
            { names, from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function AppMenubar(): ReactElement {\n  const [action, setAction] = useState("No action selected.");\n${v.showCheckbox ? `  const [checked, setChecked] = useState(${Boolean(v.defaultChecked)});\n` : ""}${v.showRadio ? `  const [profile, setProfile] = useState("${PROFILES[0]}");\n` : ""}  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveMenubar
          align={v.align as (typeof ALIGNS)[number]}
          defaultChecked={Boolean(v.defaultChecked)}
          disableItem={Boolean(v.disableItem)}
          disabledBar={Boolean(v.disabledBar)}
          disabledTrigger={Boolean(v.disabledTrigger)}
          fileLabel={String(v.fileLabel)}
          key={String(v.defaultChecked)}
          loopFocus={Boolean(v.loopFocus)}
          showCheckbox={Boolean(v.showCheckbox)}
          showRadio={Boolean(v.showRadio)}
          showShortcuts={Boolean(v.showShortcuts)}
          showSubmenu={Boolean(v.showSubmenu)}
          side={v.side as (typeof SIDES)[number]}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "enabled", label: "Enabled" },
        { id: "disabled-item", label: "Disabled item" },
        { id: "unchecked", label: "Unchecked preference" },
        { id: "disabled-trigger", label: "Disabled trigger" },
        { id: "disabled-bar", label: "Disabled bar" },
      ]}
      note="Open File or View in each cell to inspect the real menu. Actions, the checkbox and the profile choice are local to their cell. Disabled item dims New incognito window in File; Disabled trigger disables View; Disabled bar disables the whole Menubar. Menubar has no loading or error state of its own."
      render={(align, state) => (
        <LiveMenubar
          align={align as (typeof ALIGNS)[number]}
          defaultChecked={state !== "unchecked"}
          disableItem={state === "disabled-item"}
          disabledBar={state === "disabled-bar"}
          disabledTrigger={state === "disabled-trigger"}
          fileLabel="File"
          loopFocus
          showCheckbox
          showRadio
          showShortcuts
          showSubmenu
          side="bottom"
        />
      )}
      rows={ALIGNS.map((align) => ({ id: align, label: align }))}
      rowsLabel="Panel alignment"
    />
  );
}
