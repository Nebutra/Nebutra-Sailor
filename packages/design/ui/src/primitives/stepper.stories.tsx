import type { Meta, StoryObj } from "@storybook/react";
import {
  ProgressStepper,
  type Step,
  Stepper,
  StepperContent,
  StepperNavigation,
  StepperProvider,
} from "./stepper";

const steps: Step[] = [
  { id: "account", title: "Account", description: "Create your login" },
  { id: "workspace", title: "Workspace", description: "Name your team" },
  { id: "billing", title: "Billing", description: "Choose a plan", optional: true },
  { id: "launch", title: "Launch", description: "Review and ship" },
];

const meta = {
  title: "Primitives/Stepper",
  component: Stepper,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Multi-step progress. Wrap `Stepper`, `StepperContent` and `StepperNavigation` in a `StepperProvider`, which owns the current step. `ProgressStepper` is the compact bar form and needs no provider.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    clickable: { control: "boolean" },
    showConnector: { control: "boolean" },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-[40rem]">
      <StepperProvider steps={steps} initialStep={1}>
        <Stepper {...args} clickable />
      </StepperProvider>
    </div>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <StepperProvider steps={steps} initialStep={2}>
      <Stepper {...args} orientation="vertical" />
    </StepperProvider>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex w-[40rem] flex-col gap-8">
      {(["sm", "md", "lg"] as const).map((size) => (
        <StepperProvider key={size} steps={steps} initialStep={1}>
          <Stepper size={size} />
        </StepperProvider>
      ))}
    </div>
  ),
};

export const WithContentAndNavigation: Story = {
  name: "With content and navigation",
  render: () => (
    <div className="w-[36rem]">
      <StepperProvider steps={steps}>
        <Stepper />
        {steps.map((step, index) => (
          <StepperContent key={step.id} step={index} className="py-6 text-sm text-muted-foreground">
            {step.title}: {step.description}
          </StepperContent>
        ))}
        <StepperNavigation />
      </StepperProvider>
    </div>
  ),
};

export const Progress: Story = {
  render: () => (
    <div className="flex w-[32rem] flex-col gap-8">
      <ProgressStepper currentStep={1} totalSteps={4} />
      <ProgressStepper
        currentStep={3}
        totalSteps={4}
        labels={["Account", "Workspace", "Billing", "Launch"]}
      />
    </div>
  ),
};
