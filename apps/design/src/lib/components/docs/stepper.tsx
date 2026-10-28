"use client";

import {
  Stepper,
  StepperContent,
  StepperNavigation,
  StepperProvider,
} from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const SIZES = ["sm", "md", "lg"];
const STEP_TITLES = ["Account", "Workspace", "Billing", "Review"] as const;

function stepsOf({
  descriptions,
  optional,
  longTitle,
}: {
  descriptions: boolean;
  optional: boolean;
  longTitle: boolean;
}) {
  return STEP_TITLES.map((title, index) => ({
    id: title.toLowerCase(),
    title: longTitle && index === 1 ? "Workspace and regional data residency" : title,
    ...(descriptions ? { description: `Step ${index + 1} of ${STEP_TITLES.length}` } : {}),
    ...(optional && title === "Billing" ? { optional: true } : {}),
  }));
}

const KNOBS: Knob[] = [
  {
    name: "orientation",
    type: "select",
    options: ["horizontal", "vertical"],
    defaultValue: "horizontal",
  },
  { name: "size", type: "select", options: SIZES, defaultValue: "md" },
  {
    name: "initialStep",
    type: "select",
    options: ["0", "1", "2", "3"],
    defaultValue: "1",
    hint: "Zero-based; the provider reads it once, so changing it remounts the demo.",
  },
  {
    name: "clickable",
    type: "boolean",
    defaultValue: false,
    hint: "Indicators jump straight to any step, including ones ahead.",
  },
  { name: "showConnector", type: "boolean", defaultValue: true },
  { name: "descriptions", type: "boolean", defaultValue: false },
  { name: "optional", label: "optional step", type: "boolean", defaultValue: false },
  { name: "longTitle", label: "long title", type: "boolean", defaultValue: false },
  {
    name: "navigation",
    label: "content and navigation",
    type: "boolean",
    defaultValue: true,
    hint: "Adds StepperContent panels and StepperNavigation buttons.",
  },
  { name: "loading", type: "boolean", defaultValue: false, hint: "StepperNavigation only." },
  { name: "disableNext", type: "boolean", defaultValue: false, hint: "StepperNavigation only." },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Stepper only draws the steps; StepperProvider owns the current step. Next and Previous move it, and with clickable on the indicators do too. Steps before the current one are completed; a step with error set shows the error status instead."
      code={(v) => {
        const steps = stepsOf({
          descriptions: Boolean(v.descriptions),
          optional: Boolean(v.optional),
          longTitle: Boolean(v.longTitle),
        });
        const navigation = Boolean(v.navigation);
        const initialStep = Number(v.initialStep);
        const body = jsx({
          name: "StepperProvider",
          defaults: { initialStep: 0 },
          props: { initialStep, steps: raw("steps") },
          children: [
            jsx({
              name: "Stepper",
              defaults: {
                orientation: "horizontal",
                size: "md",
                clickable: false,
                showConnector: true,
              },
              props: {
                orientation: String(v.orientation),
                size: String(v.size),
                clickable: v.clickable,
                showConnector: v.showConnector,
              },
            }),
            ...(navigation
              ? [
                  ...steps.map((step, index) =>
                    jsx({
                      name: "StepperContent",
                      props: { step: index },
                      children: `${step.title} details`,
                    }),
                  ),
                  jsx({
                    name: "StepperNavigation",
                    defaults: { loading: false, disableNext: false },
                    props: { loading: v.loading, disableNext: v.disableNext },
                  }),
                ]
              : []),
          ],
        });
        return snippet({
          imports: [
            {
              names: [
                "Stepper",
                "StepperProvider",
                ...(navigation ? ["StepperContent", "StepperNavigation"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: `const steps = ${JSON.stringify(steps, null, 2)};\n\n${body}`,
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const steps = stepsOf({
          descriptions: Boolean(v.descriptions),
          optional: Boolean(v.optional),
          longTitle: Boolean(v.longTitle),
        });
        return (
          <div className="max-w-full overflow-x-auto p-1">
            <StepperProvider
              initialStep={Number(v.initialStep)}
              key={String(v.initialStep)}
              steps={steps}
            >
              <Stepper
                clickable={Boolean(v.clickable)}
                orientation={v.orientation as "horizontal" | "vertical"}
                showConnector={Boolean(v.showConnector)}
                size={v.size as "sm" | "md" | "lg"}
              />
              {v.navigation ? (
                <>
                  {steps.map((step, index) => (
                    <StepperContent key={step.id} step={index}>
                      <p className="m-0 mt-4 text-muted-foreground text-sm">{step.title} details</p>
                    </StepperContent>
                  ))}
                  <StepperNavigation
                    disableNext={Boolean(v.disableNext)}
                    loading={Boolean(v.loading)}
                  />
                </>
              ) : null}
            </StepperProvider>
          </div>
        );
      }}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  const steps = stepsOf({ descriptions: false, optional: false, longTitle: false });
  const initial: Record<string, number> = {
    first: 0,
    middle: 2,
    last: 3,
    clickable: 1,
    vertical: 1,
  };

  return (
    <ComponentStatesMatrix
      columns={[
        { id: "first", label: "First step" },
        { id: "middle", label: "Middle step" },
        { id: "last", label: "Last step" },
        { id: "clickable", label: "Clickable" },
        { id: "vertical", label: "Vertical" },
      ]}
      note="Rows are the Stepper size prop. Each cell is its own provider with four steps: earlier steps are completed, the current one is ringed, later ones are pending. Clickable cells jump on click; other indicators are disabled buttons. Stepper has no loading state (StepperNavigation does). The error status comes from Step.error and is shown on the demo page. Hover is live."
      render={(size, column) => (
        <StepperProvider initialStep={initial[column] ?? 0} steps={steps}>
          <Stepper
            clickable={column === "clickable"}
            orientation={column === "vertical" ? "vertical" : "horizontal"}
            size={size as "sm" | "md" | "lg"}
          />
        </StepperProvider>
      )}
      rows={SIZES.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
