import type { Meta, StoryObj } from "@storybook/react";
import { Rocket, Shield, Star, Zap } from "lucide-react";
import { AnimatedExportIcon, InteractiveCard } from "./interactive-card";

const meta = {
  title: "Primitives/InteractiveCard",
  component: InteractiveCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Step-based card with an animated icon on hover. Hover the card to trigger the upload/export animation. Supports custom icons for different use cases.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    step: { control: "text" },
    title: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof InteractiveCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    step: "STEP 1",
    title: "Export Project",
    description: "Download your project as a PowerPoint presentation ready to share.",
  },
};

export const CustomStep: Story = {
  args: {
    step: "STEP 2",
    title: "Review & Edit",
    description: "Make final adjustments to your exported slides before sharing.",
  },
};

export const CustomIcon: Story = {
  render: () => (
    <InteractiveCard
      step="STEP 1"
      title="Launch Feature"
      description="Deploy your feature to production with a single click."
      icon={
        <div className="relative mb-8 flex h-40 w-full items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-12 w-12 text-primary" />
          </div>
        </div>
      }
    />
  ),
};

export const ThreeSteps: Story = {
  render: () => (
    <div className="flex gap-6">
      {[
        {
          step: "STEP 1",
          title: "Create Project",
          description: "Start by setting up your new project workspace.",
          Icon: Star,
        },
        {
          step: "STEP 2",
          title: "Configure",
          description: "Set your preferences and connect your integrations.",
          Icon: Zap,
        },
        {
          step: "STEP 3",
          title: "Deploy",
          description: "Go live with confidence using our automated pipeline.",
          Icon: Shield,
        },
      ].map(({ step, title, description, Icon }) => (
        <InteractiveCard
          key={step}
          step={step}
          title={title}
          description={description}
          icon={
            <div className="relative mb-8 flex h-40 w-full items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-12 w-12 text-primary" />
              </div>
            </div>
          }
        />
      ))}
    </div>
  ),
};

export const DefaultAnimatedIcon: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        Hover the card to trigger the animated export icon
      </p>
      <InteractiveCard
        step="STEP 1"
        title="Export Data"
        description="The default animated icon shows a file being exported from a folder."
      />
    </div>
  ),
};

export const AnimatedIconOnly: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">AnimatedExportIcon used standalone</p>
      <div className="w-64 rounded-xl border bg-card p-8">
        <AnimatedExportIcon />
        <p className="text-center text-sm text-muted-foreground">Hover the card above to animate</p>
      </div>
    </div>
  ),
};
