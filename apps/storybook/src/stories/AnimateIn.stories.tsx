import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof AnimateIn> = {
  title: "Components/AnimateIn",
  component: AnimateIn,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Entrance animation wrapper. All 5 presets: `emerge` (default), `flow`, `fade`, `fadeUp`, `scale`. " +
          "Respects `prefers-reduced-motion`. Use `inView` to trigger on scroll.",
      },
    },
  },
  argTypes: {
    preset: {
      control: "select",
      options: ["emerge", "flow", "fade", "fadeUp", "scale"],
    },
    inView: { control: "boolean" },
    delay: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
};
export default meta;

type Story = StoryObj<typeof AnimateIn>;

export const Default: Story = {
  args: {
    preset: "emerge",
    children: (
      <div className="rounded-lg border p-4">
        <p className="font-medium">Animated element</p>
        <p className="text-sm text-neutral-500">Uses emerge preset by default.</p>
      </div>
    ),
  },
};

export const AllPresets: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      {(["emerge", "flow", "fade", "fadeUp", "scale"] as const).map((preset) => (
        <AnimateIn key={preset} preset={preset}>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">preset="{preset}"</p>
          </div>
        </AnimateIn>
      ))}
    </div>
  ),
};

export const StaggeredGroup: Story = {
  render: () => (
    <AnimateInGroup stagger="normal" className="grid grid-cols-3 gap-4 p-4">
      {["analytics", "billing", "audit", "teams", "tokens", "deployments"].map((card) => (
        <AnimateIn key={card} preset="fadeUp">
          <div className="rounded-lg border p-4 text-center text-sm font-medium">{card}</div>
        </AnimateIn>
      ))}
    </AnimateInGroup>
  ),
};

export const WithDelay: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {[0, 0.15, 0.3, 0.45].map((delay) => (
        <AnimateIn key={`delay-${delay}`} preset="fadeUp" delay={delay}>
          <div className="rounded-lg border p-3">
            <p className="text-sm">delay={delay}s</p>
          </div>
        </AnimateIn>
      ))}
    </div>
  ),
};
