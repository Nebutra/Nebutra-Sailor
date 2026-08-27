"use client";

import { Tabs } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, MissingAxis, Stack, State } from "../demo-kit";
import type { DemoProps } from "../derived";
import { axis } from "../derived";

const TABS = [
  { title: "Overview", value: "overview" },
  { title: "Deployments", value: "deployments" },
  { title: "Analytics", value: "analytics" },
];

export default function TabsDemo({ derived }: DemoProps) {
  const variants = axis(derived, "list", "variant");
  const shapes = axis(derived, "list", "shape");
  const [selected, setSelected] = React.useState("overview");
  const [selectedLong, setSelectedLong] = React.useState("a");

  return (
    <DemoPage>
      <State
        breaks="A tab bar built from divs. This component is controlled and takes a tabs array — the selection lives with the caller, which is what makes it URL-addressable."
        id="default"
        note={`Controlled. Current tab: ${selected}.`}
        title="Default"
      >
        <div className="max-w-md">
          <Tabs
            aria-label="Project views"
            selected={selected}
            setSelected={setSelected}
            tabs={TABS}
          />
        </div>
      </State>

      <State
        breaks="A variant added to tabsListVariants that nobody checked against the others. All of these come out of that cva map at build time, so a new one appears here on its own."
        id="variants"
        note={`${variants.length} variants crossed with ${shapes.length} shapes.`}
        title="Every variant"
      >
        {variants.length === 0 ? (
          <MissingAxis axisName="variant" />
        ) : (
          <div className="flex flex-col gap-6">
            {shapes.map((shape) => (
              <div className="flex flex-col gap-3" key={shape}>
                <code className="font-mono text-[11px] text-muted-foreground">shape="{shape}"</code>
                {variants.map((variant) => (
                  <div className="flex flex-col gap-1" key={variant}>
                    <code className="font-mono text-[10px] text-muted-foreground">{variant}</code>
                    <div className="max-w-md">
                      <Tabs
                        aria-label={`Project views — ${variant} ${shape}`}
                        selected="overview"
                        setSelected={() => undefined}
                        shape={shape as never}
                        tabs={TABS}
                        variant={variant as never}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </State>

      <State
        breaks="A disabled tab that is still selectable, or a whole disabled bar that keeps its active-tab indicator at full strength."
        id="disabled"
        note="A single disabled tab with a tooltip explaining why, and the whole bar disabled."
        title="Disabled — one tab and the whole bar"
      >
        <Stack>
          <div className="max-w-md">
            <Tabs
              aria-label="Project views with a locked tab"
              selected="overview"
              setSelected={() => undefined}
              tabs={[
                { title: "Overview", value: "overview" },
                { title: "Deployments", value: "deployments" },
                {
                  title: "Audit log",
                  value: "audit",
                  disabled: true,
                  tooltip: "Audit log requires an Enterprise plan.",
                },
              ]}
            />
          </div>
          <div className="max-w-md">
            <Tabs
              aria-label="Disabled project views"
              disabled
              selected="overview"
              setSelected={() => undefined}
              tabs={TABS}
            />
          </div>
        </Stack>
      </State>

      <State
        breaks="A tab bar that wraps onto two lines, or one that clips its last tab with no way to reach it. Either is a defect; scrolling within the bar is the fix."
        id="overflow"
        note="Eight tabs with long titles in a narrow container."
        title="Overflow — too many tabs"
      >
        <div className="max-w-[20rem] rounded-lg bg-background p-3">
          <Tabs
            aria-label="Many views"
            selected={selectedLong}
            setSelected={setSelectedLong}
            tabs={[
              { title: "Overview", value: "a" },
              { title: "Deployments", value: "b" },
              { title: "Analytics", value: "c" },
              { title: "Speed Insights", value: "d" },
              { title: "Observability", value: "e" },
              { title: "Firewall", value: "f" },
              { title: "Storage", value: "g" },
              { title: "Settings", value: "h" },
            ]}
          />
        </div>
      </State>

      <State
        breaks="An empty tab array rendering a bare rule where a bar should be. A tab bar with nothing in it is a call-site bug; this is what it looks like."
        id="empty"
        note="tabs={[]}."
        title="Empty"
      >
        <div className="max-w-md">
          <Tabs aria-label="No views" selected="" setSelected={() => undefined} tabs={[]} />
        </div>
      </State>

      <State
        breaks="A tab bar where every tab is a tab stop, or where arrow keys move focus without moving the selection. Six files across the apps hand-rolled a role=tablist and got this part wrong."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "enters the bar once, on the selected tab." },
            { keys: "← →", does: "moves between tabs, skipping the disabled one." },
            { keys: "Home / End", does: "jumps to the first and last tab." },
            { keys: "Tab", does: "leaves the bar and reaches the panel content." },
          ]}
        >
          <div className="max-w-md">
            <Tabs
              aria-label="Project views"
              selected={selected}
              setSelected={setSelected}
              tabs={[...TABS, { title: "Audit log", value: "audit", disabled: true }]}
            />
            <div className="mt-4 text-muted-foreground text-sm">
              Panel content for “{selected}”.
            </div>
          </div>
        </KeyboardPath>
      </State>

      <Aside title="This component does not own the panels">
        <p>
          Tabs renders the bar only. The caller renders the panel and is responsible for wiring{" "}
          <code>aria-controls</code> / <code>role="tabpanel"</code> if the panel needs to be
          announced as one. That split is why the panel above is plain text rather than a second
          compound part.
        </p>
      </Aside>
    </DemoPage>
  );
}
