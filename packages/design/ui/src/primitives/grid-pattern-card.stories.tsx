import type { Meta, StoryObj } from "@storybook/react";
import { Shield, Sparkles, Zap } from "lucide-react";
import { GridPatternCard, GridPatternCardBody } from "./grid-pattern-card";

const meta = {
  title: "Primitives/GridPatternCard",
  component: GridPatternCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card with an animated grid ellipsis background pattern. Automatically switches between light and dark mode SVG patterns via CSS variables. Includes a fade-in entrance animation.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    disableAnimation: { control: "boolean" },
  },
} satisfies Meta<typeof GridPatternCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <GridPatternCard className="max-w-sm">
      <GridPatternCardBody>
        <h3 className="text-xl font-semibold">AI Integration</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          Seamlessly connect your workflow with the latest AI models.
        </p>
      </GridPatternCardBody>
    </GridPatternCard>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <GridPatternCard className="max-w-sm">
      <GridPatternCardBody>
        <Sparkles className="h-8 w-8 mb-4 text-primary" />
        <h3 className="text-xl font-semibold">AI Native</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          Built-in intelligence that learns from your team's patterns.
        </p>
      </GridPatternCardBody>
    </GridPatternCard>
  ),
};

export const NoAnimation: Story = {
  render: () => (
    <GridPatternCard disableAnimation className="max-w-sm">
      <GridPatternCardBody>
        <h3 className="text-xl font-semibold">Static Render</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          No fade-in animation — instant render for server-side contexts.
        </p>
      </GridPatternCardBody>
    </GridPatternCard>
  ),
};

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 w-[720px]">
      {[
        { icon: Sparkles, title: "AI Native", desc: "Built-in intelligence." },
        { icon: Shield, title: "Secure", desc: "Zero-trust architecture." },
        { icon: Zap, title: "Fast", desc: "Sub-second response times." },
      ].map(({ icon: Icon, title, desc }) => (
        <GridPatternCard key={title}>
          <GridPatternCardBody>
            <Icon className="h-6 w-6 mb-3 text-primary" />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          </GridPatternCardBody>
        </GridPatternCard>
      ))}
    </div>
  ),
};
