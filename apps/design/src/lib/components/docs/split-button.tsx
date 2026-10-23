"use client";

import { Copy, GitBranch, Sparkles } from "@nebutra/icons";
import { SplitButton } from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const TYPES = ["default", "secondary"] as const;
// Geist names. The component also accepts tiny, sm, default, lg as aliases.
const SIZES = ["tiny", "small", "medium", "large"] as const;
const ALIGNMENTS = ["bottom-start", "bottom-end"] as const;

type SplitType = (typeof TYPES)[number];
type SplitSize = (typeof SIZES)[number];
type Alignment = (typeof ALIGNMENTS)[number];

const ITEMS = [
  {
    action: "preview",
    title: "Deploy to preview",
    description: "Build this branch without promoting it",
    icon: <GitBranch />,
    iconName: "GitBranch",
  },
  {
    action: "promote",
    title: "Deploy and promote",
    description: "Replace production once checks pass",
    icon: <Sparkles />,
    iconName: "Sparkles",
  },
  {
    action: "duplicate",
    title: "Duplicate deployment",
    description: "Start from this deployment's settings",
    icon: <Copy />,
    iconName: "Copy",
  },
  {
    action: "rebuild",
    title: "Redeploy without cache",
    description: "Rebuild every dependency from scratch",
    icon: null,
    iconName: null,
  },
  {
    action: "rollback",
    title: "Roll back",
    description: "Return to the previous production deployment",
    icon: null,
    iconName: null,
  },
  {
    action: "archive",
    title: "Archive deployment",
    description: "Hide it from the list without deleting logs",
    icon: null,
    iconName: null,
  },
];

const KNOBS: Knob[] = [
  { name: "label", type: "text", defaultValue: "Deploy" },
  { name: "type", type: "select", options: TYPES, defaultValue: "default" },
  { name: "size", type: "select", options: SIZES, defaultValue: "medium" },
  { name: "menuAlignment", type: "select", options: ALIGNMENTS, defaultValue: "bottom-start" },
  { name: "items", type: "select", options: ["1", "3", "6"], defaultValue: "3" },
  { name: "descriptions", type: "boolean", defaultValue: true },
  { name: "icons", type: "boolean", defaultValue: true },
  { name: "menuWidth", type: "select", options: ["264", "200", "360"], defaultValue: "264" },
  {
    name: "prefix",
    type: "boolean",
    defaultValue: false,
    hint: "Adds a leading icon to the primary button.",
  },
  { name: "loading", type: "boolean", defaultValue: false, hint: "Disables both halves." },
  { name: "disabled", type: "boolean", defaultValue: false },
  { name: "menuButtonLabel", type: "text", defaultValue: "More deploy options" },
];

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function LiveSplit({
  label,
  type,
  size,
  menuAlignment,
  items,
  descriptions,
  icons,
  menuWidth,
  prefix,
  loading,
  disabled,
  menuButtonLabel,
}: {
  label: string;
  type: SplitType;
  size: SplitSize;
  menuAlignment: Alignment;
  items: number;
  descriptions: boolean;
  icons: boolean;
  menuWidth: number;
  prefix: boolean;
  loading: boolean;
  disabled: boolean;
  menuButtonLabel: string;
}) {
  const [action, setAction] = useState("Nothing deployed yet.");
  return (
    <div className="grid max-w-full gap-3">
      <SplitButton
        buttonProps={{
          loading,
          onClick: () => setAction("Deployed the primary action."),
          size,
          type,
          ...present({ prefix: prefix ? <Sparkles /> : undefined }),
        }}
        disabled={disabled}
        menuAlignment={menuAlignment}
        menuButtonLabel={menuButtonLabel || "More options"}
        menuItems={ITEMS.slice(0, items).map((item) => (
          <SplitButton.MenuItem
            key={item.action}
            menuItemProps={{ onClick: () => setAction(`Chose ${item.title}.`) }}
            title={item.title}
            {...present({
              description: descriptions ? item.description : undefined,
              icon: icons && item.icon ? item.icon : undefined,
            })}
          />
        ))}
        menuProps={{ width: menuWidth }}
      >
        {label || "Deploy"}
      </SplitButton>
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Click the label for the primary action, or the chevron for the menu. Loading and disabled both lock the pair. The readout under the button is local to this preview."
      code={(v) => {
        const entries = ITEMS.slice(0, Number(v.items));
        const showIcons = Boolean(v.icons);
        const iconNames = [
          ...(v.prefix ? ["Sparkles"] : []),
          ...(showIcons ? entries.flatMap((e) => (e.iconName ? [e.iconName] : [])) : []),
        ];

        const buttonProps = [
          v.type !== "default" ? `type: "${v.type}"` : null,
          v.size !== "medium" ? `size: "${v.size}"` : null,
          v.loading ? "loading: true" : null,
          v.prefix ? "prefix: <Sparkles />" : null,
          'onClick: () => setAction("Deployed the primary action.")',
        ].filter(Boolean);

        const menuItems = entries.map((entry) =>
          jsx({
            name: "SplitButton.MenuItem",
            props: {
              title: entry.title,
              description: v.descriptions ? entry.description : undefined,
              icon: showIcons && entry.iconName ? raw(`<${entry.iconName} />`) : undefined,
              menuItemProps: raw(`{ onClick: () => setAction("Chose ${entry.title}.") }`),
            },
          }),
        );

        const split = jsx({
          name: "SplitButton",
          defaults: { disabled: false, menuAlignment: "bottom-start" },
          props: {
            buttonProps: raw(`{ ${buttonProps.join(", ")} }`),
            disabled: v.disabled,
            menuAlignment: String(v.menuAlignment),
            menuButtonLabel: String(v.menuButtonLabel) || "More options",
            menuItems: raw("items"),
            menuProps: Number(v.menuWidth) === 264 ? undefined : raw(`{ width: ${v.menuWidth} }`),
          },
          children: String(v.label) || "Deploy",
        });

        return snippet({
          imports: [
            { names: ["SplitButton"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
            ...(iconNames.length > 0 ? [{ names: iconNames, from: "@nebutra/icons" }] : []),
          ],
          body: `export function DeployButton(): ReactElement {
  const [action, setAction] = useState("Nothing deployed yet.");
  const items = (
    <>
${indent(menuItems.join("\n"), 6)}
    </>
  );

  return (
    <div className="grid gap-3">
${indent(split, 6)}
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
    </div>
  );
}`,
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveSplit
          descriptions={Boolean(v.descriptions)}
          disabled={Boolean(v.disabled)}
          icons={Boolean(v.icons)}
          items={Number(v.items)}
          label={String(v.label)}
          loading={Boolean(v.loading)}
          menuAlignment={v.menuAlignment as Alignment}
          menuButtonLabel={String(v.menuButtonLabel)}
          menuWidth={Number(v.menuWidth)}
          prefix={Boolean(v.prefix)}
          size={v.size as SplitSize}
          type={v.type as SplitType}
        />
      )}
    />
  );
}

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "secondary", label: "Secondary" },
  { id: "prefix", label: "With prefix" },
  { id: "loading", label: "Loading" },
  { id: "disabled", label: "Disabled" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="Open the chevron in any enabled cell to see its real menu. Loading and disabled both disable the pair, so the menu cannot be opened. Hover and keyboard focus are live; the focused half is raised above the seam."
      render={(size, column) => (
        <SplitButton
          buttonProps={{
            loading: column === "loading",
            size: size as SplitSize,
            type: column === "secondary" ? "secondary" : "default",
            ...present({ prefix: column === "prefix" ? <Sparkles /> : undefined }),
          }}
          disabled={column === "disabled"}
          menuButtonLabel={`More options, ${size} ${column}`}
          menuItems={
            <>
              <SplitButton.MenuItem description="Build without promoting" title="Preview" />
              <SplitButton.MenuItem description="Replace production" title="Promote" />
            </>
          }
        >
          Deploy
        </SplitButton>
      )}
      rows={SIZES.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
