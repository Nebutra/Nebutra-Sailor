"use client";

import { RadioGroupCard, RadioGroupCardItem } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const PLANS = [
  { value: "starter", title: "Starter", note: "For personal projects" },
  { value: "team", title: "Team", note: "For shared workspaces" },
  { value: "enterprise", title: "Enterprise", note: "For larger organizations" },
] as const;

const LONG_TITLE = "Enterprise with dedicated single-tenant infrastructure";

const KNOBS: Knob[] = [
  {
    name: "layout",
    type: "select",
    options: ["stacked", "columns"],
    defaultValue: "columns",
    hint: "Stacked is the group's default; columns adds grid-cols-3 through className.",
  },
  {
    name: "defaultValue",
    type: "select",
    options: ["none", "starter", "team", "enterprise"],
    defaultValue: "team",
  },
  { name: "descriptions", type: "boolean", defaultValue: true },
  { name: "longTitle", label: "long last title", type: "boolean", defaultValue: false },
  { name: "disableTeam", label: "disable Team", type: "boolean", defaultValue: false },
  { name: "disabled", type: "boolean", defaultValue: false },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Each card is a radio. Selecting one swaps its edge for the primary colour and adds a ring and a faint wash; the unselected edge stays visible on the surface. Arrow keys move and select, and a click selects. Cards do not truncate, so a long title grows its card."
      code={(v) => {
        const columns = v.layout === "columns";
        return snippet({
          imports: [
            { names: ["RadioGroupCard", "RadioGroupCardItem"], from: "@nebutra/ui/primitives" },
          ],
          body: jsx({
            name: "RadioGroupCard",
            defaults: { disabled: false },
            props: {
              "aria-label": "Plan",
              className: columns ? "grid-cols-3" : undefined,
              defaultValue: v.defaultValue === "none" ? undefined : String(v.defaultValue),
              disabled: v.disabled,
            },
            children: PLANS.map((plan) =>
              jsx({
                name: "RadioGroupCardItem",
                defaults: { disabled: false },
                props: {
                  value: plan.value,
                  className: "gap-1",
                  disabled: plan.value === "team" && Boolean(v.disableTeam),
                },
                children: [
                  jsx({
                    name: "span",
                    props: { className: "text-center font-medium text-foreground text-sm" },
                    children: plan.value === "enterprise" && v.longTitle ? LONG_TITLE : plan.title,
                  }),
                  ...(v.descriptions
                    ? [
                        jsx({
                          name: "span",
                          props: { className: "text-center text-muted-foreground text-xs" },
                          children: plan.note,
                        }),
                      ]
                    : []),
                ],
              }),
            ),
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <div className="max-w-full overflow-x-auto p-1">
          <RadioGroupCard
            aria-label="Plan"
            className={v.layout === "columns" ? "w-[34rem] grid-cols-3" : "w-72"}
            {...(v.defaultValue === "none" ? {} : { defaultValue: String(v.defaultValue) })}
            disabled={Boolean(v.disabled)}
            key={String(v.defaultValue)}
          >
            {PLANS.map((plan) => (
              <RadioGroupCardItem
                className="gap-1"
                disabled={plan.value === "team" && Boolean(v.disableTeam)}
                key={plan.value}
                value={plan.value}
              >
                <span className="text-center font-medium text-foreground text-sm">
                  {plan.value === "enterprise" && v.longTitle ? LONG_TITLE : plan.title}
                </span>
                {v.descriptions ? (
                  <span className="text-center text-muted-foreground text-xs">{plan.note}</span>
                ) : null}
              </RadioGroupCardItem>
            ))}
          </RadioGroupCard>
        </div>
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "none", label: "None selected" },
        { id: "selected", label: "Selected" },
        { id: "disabled-item", label: "Item disabled" },
        { id: "disabled", label: "Group disabled" },
      ]}
      note="Rows are the group layout, set through className. RadioGroupCard has no size, loading or invalid styling of its own. Hover and Tab are live: the group is one tab stop and the arrow keys move and select."
      render={(layout, state) => (
        <RadioGroupCard
          aria-label={`${layout} ${state} plan`}
          className={layout === "columns" ? "grid-cols-2" : ""}
          {...(state === "none" ? {} : { defaultValue: "starter" })}
          disabled={state === "disabled"}
        >
          <RadioGroupCardItem className="w-40 gap-1" value="starter">
            <span className="text-center font-medium text-foreground text-sm">Starter</span>
            <span className="text-center text-muted-foreground text-xs">For personal projects</span>
          </RadioGroupCardItem>
          <RadioGroupCardItem
            className="w-40 gap-1"
            disabled={state === "disabled-item"}
            value="team"
          >
            <span className="text-center font-medium text-foreground text-sm">Team</span>
            <span className="text-center text-muted-foreground text-xs">For shared workspaces</span>
          </RadioGroupCardItem>
        </RadioGroupCard>
      )}
      rows={[
        { id: "stacked", label: "Stacked" },
        { id: "columns", label: "Columns" },
      ]}
      rowsLabel="Layout"
    />
  );
}
