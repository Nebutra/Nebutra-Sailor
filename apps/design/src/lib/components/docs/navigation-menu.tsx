"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

interface Panel {
  value: string;
  label: string;
  links: { title: string; body: string }[];
}

const PANELS: Panel[] = [
  {
    value: "products",
    label: "Products",
    links: [
      { title: "Analytics", body: "Track traffic and conversion across every project." },
      { title: "Deployments", body: "Ship previews on every push and promote with one click." },
      { title: "Observability", body: "Logs, traces and alerts in one place." },
    ],
  },
  {
    value: "resources",
    label: "Resources",
    links: [
      { title: "Guides", body: "Step-by-step walkthroughs." },
      { title: "Changelog", body: "What shipped this week." },
    ],
  },
];

const ITEM_CLASS =
  "block rounded-md p-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground";
const LIST_CLASS = "grid w-72 max-w-[calc(100vw-2rem)] gap-1 p-2";
const DELAYS = ["0", "50", "200", "600"];
const slugOf = (title: string) => title.toLowerCase();

const KNOBS: Knob[] = [
  { name: "triggerLabel", type: "text", defaultValue: "Products" },
  {
    name: "initialPanel",
    type: "select",
    options: ["none", ...PANELS.map((panel) => panel.value)],
    defaultValue: "none",
    hint: "Which panel is open on first render.",
  },
  {
    name: "orientation",
    type: "select",
    options: ["horizontal", "vertical"],
    defaultValue: "horizontal",
    hint: "Changes which arrow keys move between triggers. The layout does not change.",
  },
  {
    name: "delay",
    type: "select",
    options: DELAYS,
    defaultValue: "50",
    hint: "Hover open, in ms.",
  },
  { name: "closeDelay", type: "select", options: DELAYS, defaultValue: "50" },
  { name: "sideOffset", type: "select", options: ["6", "12", "24"], defaultValue: "6" },
  { name: "showResources", type: "boolean", defaultValue: true },
  { name: "showDocsLink", type: "boolean", defaultValue: true },
  { name: "activeLink", type: "boolean", defaultValue: true, hint: "Marks the Docs link active." },
  { name: "showDescriptions", type: "boolean", defaultValue: true },
];

function LiveNavigation({
  triggerLabel,
  initialPanel,
  orientation,
  delay,
  closeDelay,
  sideOffset,
  showResources,
  showDocsLink,
  activeLink,
  showDescriptions,
}: {
  triggerLabel: string;
  initialPanel: string;
  orientation: "horizontal" | "vertical";
  delay: number;
  closeDelay: number;
  sideOffset: number;
  showResources: boolean;
  showDocsLink: boolean;
  activeLink: boolean;
  showDescriptions: boolean;
}) {
  const [value, setValue] = useState(initialPanel === "none" ? "" : initialPanel);
  const [action, setAction] = useState("No link followed.");
  const panels = showResources ? PANELS : PANELS.slice(0, 1);
  return (
    <div className="grid max-w-full gap-3">
      <NavigationMenu
        closeDelay={closeDelay}
        delay={delay}
        onValueChange={setValue}
        orientation={orientation}
        sideOffset={sideOffset}
        value={value}
      >
        <NavigationMenuList>
          {panels.map((panel, index) => (
            <NavigationMenuItem key={panel.value} value={panel.value}>
              <NavigationMenuTrigger>
                {index === 0 ? triggerLabel || panel.label : panel.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className={LIST_CLASS}>
                  {panel.links.map((link) => (
                    <li key={link.title}>
                      <NavigationMenuLink
                        className={ITEM_CLASS}
                        href={`/${slugOf(link.title)}`}
                        onClick={(event) => {
                          event.preventDefault();
                          setAction(`${link.title} followed.`);
                        }}
                      >
                        <span className="block font-medium text-foreground">{link.title}</span>
                        {showDescriptions ? (
                          <span className="block text-muted-foreground">{link.body}</span>
                        ) : null}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
          {showDocsLink ? (
            <NavigationMenuItem>
              <NavigationMenuLink
                active={activeLink}
                className={navigationMenuTriggerStyle()}
                href="/docs"
                onClick={(event) => {
                  event.preventDefault();
                  setAction("Docs followed.");
                }}
              >
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
          ) : null}
        </NavigationMenuList>
      </NavigationMenu>
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
      <p className="text-muted-foreground">Open panel: {value || "none"}</p>
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Hover or press a trigger to open its panel, then move between triggers to watch one viewport resize between panels. Links here are intercepted so the docs page does not navigate."
      code={(v) => {
        const panels = v.showResources ? PANELS : PANELS.slice(0, 1);
        const link = (item: Panel["links"][number]) =>
          jsx({
            name: "li",
            props: {},
            children: [
              jsx({
                name: "NavigationMenuLink",
                props: { className: ITEM_CLASS, href: `/${slugOf(item.title)}` },
                children: [
                  jsx({
                    name: "span",
                    props: { className: "block font-medium text-foreground" },
                    children: item.title,
                  }),
                  ...(v.showDescriptions
                    ? [
                        jsx({
                          name: "span",
                          props: { className: "block text-muted-foreground" },
                          children: item.body,
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          });
        const body = jsx({
          name: "NavigationMenu",
          defaults: { delay: 50, closeDelay: 50, orientation: "horizontal", sideOffset: 6 },
          props: {
            value: raw("value"),
            onValueChange: raw("setValue"),
            orientation: String(v.orientation),
            delay: Number(v.delay),
            closeDelay: Number(v.closeDelay),
            sideOffset: Number(v.sideOffset),
          },
          children: [
            jsx({
              name: "NavigationMenuList",
              props: {},
              children: [
                ...panels.map((panel, index) =>
                  jsx({
                    name: "NavigationMenuItem",
                    props: { value: panel.value },
                    children: [
                      jsx({
                        name: "NavigationMenuTrigger",
                        props: {},
                        children: index === 0 ? String(v.triggerLabel) || panel.label : panel.label,
                      }),
                      jsx({
                        name: "NavigationMenuContent",
                        props: {},
                        children: [
                          jsx({
                            name: "ul",
                            props: { className: LIST_CLASS },
                            children: panel.links.map(link),
                          }),
                        ],
                      }),
                    ],
                  }),
                ),
                ...(v.showDocsLink
                  ? [
                      jsx({
                        name: "NavigationMenuItem",
                        props: {},
                        children: [
                          jsx({
                            name: "NavigationMenuLink",
                            defaults: { active: false },
                            props: {
                              active: v.activeLink,
                              className: raw("navigationMenuTriggerStyle()"),
                              href: "/docs",
                            },
                            children: "Docs",
                          }),
                        ],
                      }),
                    ]
                  : []),
              ],
            }),
          ],
        });
        const initial = v.initialPanel === "none" ? "" : String(v.initialPanel);
        return `"use client";\n\n${snippet({
          imports: [
            {
              names: [
                "NavigationMenu",
                "NavigationMenuContent",
                "NavigationMenuItem",
                "NavigationMenuLink",
                "NavigationMenuList",
                "NavigationMenuTrigger",
                ...(v.showDocsLink ? ["navigationMenuTriggerStyle"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function SiteNavigation(): ReactElement {\n  const [value, setValue] = useState("${initial}");\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveNavigation
          activeLink={Boolean(v.activeLink)}
          closeDelay={Number(v.closeDelay)}
          delay={Number(v.delay)}
          initialPanel={String(v.initialPanel)}
          key={String(v.initialPanel)}
          orientation={v.orientation as "horizontal" | "vertical"}
          showDescriptions={Boolean(v.showDescriptions)}
          showDocsLink={Boolean(v.showDocsLink)}
          showResources={Boolean(v.showResources)}
          sideOffset={Number(v.sideOffset)}
          triggerLabel={String(v.triggerLabel)}
        />
      )}
      stageClassName="min-h-72 items-start"
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "trigger", label: "Trigger" },
        { id: "link", label: "Link" },
        { id: "active", label: "Active link" },
      ]}
      note="Every cell is its own navigation that starts closed; hover or press a trigger to open its panel. Active link is the current-page mark. Orientation rows only swap the arrow keys that move between triggers and open a panel, so the two rows look the same. NavigationMenu has no disabled, loading or error state of its own."
      render={(orientation, state) => (
        <NavigationMenu orientation={orientation as "horizontal" | "vertical"}>
          <NavigationMenuList>
            <NavigationMenuItem>
              {state === "trigger" ? (
                <>
                  <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className={LIST_CLASS}>
                      <li>
                        <NavigationMenuLink
                          className={ITEM_CLASS}
                          href="/analytics"
                          onClick={(event) => event.preventDefault()}
                        >
                          <span className="block font-medium text-foreground">Analytics</span>
                          <span className="block text-muted-foreground">
                            Track traffic and conversion.
                          </span>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink
                  active={state === "active"}
                  className={navigationMenuTriggerStyle()}
                  href="/docs"
                  onClick={(event) => event.preventDefault()}
                >
                  Docs
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      )}
      rows={[
        { id: "horizontal", label: "Horizontal" },
        { id: "vertical", label: "Vertical" },
      ]}
      rowsLabel="Orientation"
    />
  );
}
