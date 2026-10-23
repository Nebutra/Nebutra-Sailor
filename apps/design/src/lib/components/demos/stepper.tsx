"use client";

import {
  Button,
  Checkbox,
  ProgressStepper,
  Stepper,
  StepperContent,
  StepperNavigation,
  StepperProvider,
  useStepper,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

// Stepper's size is an inline lookup in the component, not a cva map or exported const,
// so it cannot be derived; this is the key list of that lookup.
const SIZES = ["sm", "md", "lg"];

const STEPS = [
  { id: "account", title: "Account" },
  { id: "workspace", title: "Workspace" },
  { id: "billing", title: "Billing" },
  { id: "review", title: "Review" },
];

const DETAILED_STEPS = [
  { id: "account", title: "Account", description: "Email and password" },
  { id: "workspace", title: "Workspace", description: "Name and region" },
  { id: "billing", title: "Billing", description: "Card or invoice", optional: true },
  { id: "review", title: "Review", description: "Confirm and create" },
];

const LONG_STEPS = [
  { id: "one", title: "Account" },
  { id: "two", title: LONG_LABEL },
  { id: "three", title: "Review" },
];

const MANY_STEPS = Array.from({ length: 8 }, (_, index) => ({
  id: `step-${index + 1}`,
  title: `Step ${index + 1}`,
}));

function HookDemo() {
  const stepper = useStepper({ steps: STEPS });
  return (
    <Stack>
      <ProgressStepper
        currentStep={stepper.currentStep}
        labels={STEPS.map((step) => step.title)}
        totalSteps={STEPS.length}
      />
      <Row>
        <Button disabled={stepper.isFirstStep} onClick={stepper.prevStep} variant="outline">
          Back
        </Button>
        <Button disabled={stepper.isLastStep} onClick={stepper.nextStep}>
          Next
        </Button>
        <Button onClick={stepper.reset} variant="ghost">
          Reset
        </Button>
        <span className="font-mono text-muted-foreground text-xs">
          currentStepData = {stepper.currentStepData?.title} · progress = {stepper.progress}%
        </span>
      </Row>
    </Stack>
  );
}

function GatedWizard() {
  const [accepted, setAccepted] = React.useState(false);
  const [done, setDone] = React.useState(false);
  return (
    <StepperProvider initialStep={1} steps={STEPS}>
      <Stepper />
      <StepperContent step={0}>
        <p className="m-0 mt-4 text-muted-foreground text-sm">Account details.</p>
      </StepperContent>
      <StepperContent step={1}>
        <div className="mt-4">
          <Checkbox checked={accepted} onCheckedChange={setAccepted}>
            I accept the data processing terms
          </Checkbox>
        </div>
      </StepperContent>
      <StepperContent step={2}>
        <p className="m-0 mt-4 text-muted-foreground text-sm">Billing details.</p>
      </StepperContent>
      <StepperContent step={3}>
        <p className="m-0 mt-4 text-muted-foreground text-sm">
          {done ? "Workspace created." : "Review and create the workspace."}
        </p>
      </StepperContent>
      <StepperNavigation disableNext={!accepted} onFinish={() => setDone(true)} />
    </StepperProvider>
  );
}

export default function StepperDemo(_: DemoProps) {
  return (
    <DemoPage>
      <State
        breaks="A current step that is not marked, or Previous enabled on the first step. Press Next and Previous and watch the indicators and the panel move together."
        code={`<StepperProvider steps={steps}>
  <Stepper />
  <StepperContent step={0}>Account details</StepperContent>
  <StepperContent step={1}>Workspace details</StepperContent>
  <StepperNavigation />
</StepperProvider>`}
        id="default"
        note="The provider owns the current step; Stepper, StepperContent and StepperNavigation all read it. Previous is disabled on the first step and Next becomes Finish on the last."
        title="Default"
      >
        <StepperProvider steps={STEPS}>
          <Stepper />
          <StepperContent step={0}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Account details.</p>
          </StepperContent>
          <StepperContent step={1}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Workspace details.</p>
          </StepperContent>
          <StepperContent step={2}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Billing details.</p>
          </StepperContent>
          <StepperContent step={3}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Review and create.</p>
          </StepperContent>
          <StepperNavigation />
        </StepperProvider>
      </State>

      <State
        breaks="A size where the indicator, the number or the connector falls out of proportion with the others."
        id="sizes"
        note="Indicators are 24, 32 and 40px; connectors thicken at lg. Step 2 is current in each."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue="md"
          render={(size) => (
            <StepperProvider initialStep={1} steps={STEPS}>
              <Stepper size={size as "sm" | "md" | "lg"} />
            </StepperProvider>
          )}
          values={SIZES}
        />
      </State>

      <State
        breaks="A vertical layout whose connector no longer meets the indicators, or whose labels do not sit beside their indicator."
        id="vertical"
        note="Vertical lays the label to the side of each indicator; the connector runs between them."
        title="Vertical"
      >
        <Row align="start" className="gap-12">
          <StepperProvider initialStep={2} steps={DETAILED_STEPS}>
            <Stepper orientation="vertical" />
          </StepperProvider>
          <StepperProvider initialStep={1} steps={STEPS}>
            <Stepper orientation="vertical" showConnector={false} size="sm" />
          </StepperProvider>
        </Row>
      </State>

      <State
        breaks="A clickable stepper whose indicators are not real buttons, or one that blocks jumping ahead without saying so. This one allows it: click step 4 from step 1."
        id="clickable"
        note="With clickable, each indicator is a button that calls goToStep, including steps ahead of the current one. Without it the indicators are disabled buttons."
        title="Clickable"
      >
        <StepperProvider steps={STEPS}>
          <Stepper clickable />
          <StepperContent step={0}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Account details.</p>
          </StepperContent>
          <StepperContent step={1}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Workspace details.</p>
          </StepperContent>
          <StepperContent step={2}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Billing details.</p>
          </StepperContent>
          <StepperContent step={3}>
            <p className="m-0 mt-4 text-muted-foreground text-sm">Review and create.</p>
          </StepperContent>
        </StepperProvider>
      </State>

      <State
        breaks="A description that pushes its indicator off the row, or an optional marker that reads as part of the title."
        id="details"
        note='description sits under the title; optional appends "(Optional)". The marker is cosmetic: the step is not skippable and the English text is not translatable.'
        title="Descriptions and optional steps"
      >
        <StepperProvider initialStep={1} steps={DETAILED_STEPS}>
          <Stepper />
        </StepperProvider>
      </State>

      <State
        breaks="Navigation that stays clickable while work is pending, or a Next button that cannot be held back until a step is valid."
        id="navigation"
        note="Step 2 is gated: Next stays disabled until the box is ticked (disableNext). The last step shows the finish action."
        title="Navigation — disabled next"
      >
        <GatedWizard />
      </State>

      <State
        breaks="A loading finish button that can still be pressed, or a spinner that shifts the label."
        id="loading"
        note="loading puts a spinner in the forward button and disables both buttons. Custom labels replace Previous, Next and Finish."
        title="Navigation — loading and labels"
      >
        <Row align="start" className="gap-10">
          <Specimen label="loading, last step">
            <StepperProvider initialStep={3} steps={STEPS}>
              <StepperNavigation className="gap-3" loading />
            </StepperProvider>
          </Specimen>
          <Specimen label="loading, middle step">
            <StepperProvider initialStep={1} steps={STEPS}>
              <StepperNavigation className="gap-3" loading />
            </StepperProvider>
          </Specimen>
          <Specimen label="custom labels">
            <StepperProvider initialStep={1} steps={STEPS}>
              <StepperNavigation className="gap-3" nextLabel="Continue" prevLabel="Go back" />
            </StepperProvider>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A progress bar that fills to the wrong share, or a label that does not light up with the bar."
        id="progress"
        note="ProgressStepper needs no provider. The bar fills through the current step; the caption is fixed Chinese text (步骤 N / M)."
        title="ProgressStepper"
      >
        <Stack className="max-w-md">
          {[0, 1, 3].map((current) => (
            <ProgressStepper
              currentStep={current}
              key={current}
              labels={STEPS.map((step) => step.title)}
              totalSteps={STEPS.length}
            />
          ))}
          <ProgressStepper currentStep={1} totalSteps={STEPS.length} />
        </Stack>
      </State>

      <State
        breaks="Hook state that drifts from the provider: Back at the first step or Next at the last must be a no-op, and progress must track the current step."
        id="hook"
        note="useStepper drives a ProgressStepper and plain buttons here; no provider is involved."
        title="useStepper"
      >
        <HookDemo />
      </State>

      <State
        breaks="Long titles that wrap or overlap the connector, and a row of steps wider than its container."
        id="overflow"
        note="Titles are not truncated and the horizontal row does not wrap, so a long title or many steps scroll the stage. The enclosing layout has to give."
        title="Overflow — long title, many steps"
      >
        <Stack>
          <div className="max-w-md overflow-x-auto rounded-lg bg-background p-3">
            <StepperProvider initialStep={1} steps={LONG_STEPS}>
              <Stepper />
            </StepperProvider>
          </div>
          <div className="max-w-md overflow-x-auto rounded-lg bg-background p-3">
            <StepperProvider initialStep={3} steps={MANY_STEPS}>
              <Stepper size="sm" />
            </StepperProvider>
          </div>
          <div className="max-w-xs rounded-lg bg-background p-3">
            <StepperProvider initialStep={1} steps={LONG_STEPS}>
              <Stepper orientation="vertical" />
            </StepperProvider>
          </div>
        </Stack>
      </State>

      <State
        breaks="A provider with no steps that throws, or a stepper outside a provider that crashes the page."
        id="empty"
        note="Zero steps render an empty wrapper, and a Stepper with no provider at all falls back to the same empty state. Both are call-site bugs that should be recognisable."
        title="Empty"
      >
        <Row align="start">
          <Specimen label="provider, no steps">
            <StepperProvider steps={[]}>
              <Stepper />
            </StepperProvider>
          </Specimen>
          <Specimen label="no provider">
            <Stepper />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A clickable indicator that cannot be reached by keyboard, or a non-clickable one that is a dead tab stop."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "visits each indicator of a clickable stepper, then the navigation buttons. Without clickable the indicators are disabled and skipped.",
            },
            { keys: "Enter Space", does: "on an indicator, jumps to that step." },
            {
              keys: "Enter Space",
              does: "on Previous or Next, moves one step; a disabled button is skipped.",
            },
          ]}
        >
          <StepperProvider steps={STEPS}>
            <Stepper clickable />
            <StepperNavigation />
          </StepperProvider>
        </KeyboardPath>
      </State>

      <Aside title="What Stepper does not do">
        <p>
          The error status is declared on the status type and styled, but the provider only produces
          pending, current and completed, so there is no way to mark a step as failed. The markup is
          a row of buttons in plain divs: no list, and no <code>aria-current</code> on the current
          step, so assistive tech cannot tell which step is active. The "(Optional)" marker and the
          ProgressStepper caption are fixed strings. <code>initialStep</code> is read once.
        </p>
      </Aside>
    </DemoPage>
  );
}
