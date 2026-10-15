import type { Meta, StoryObj } from "@storybook/react";
import { GhostPreview } from "./ghost-preview";

const meta: Meta<typeof GhostPreview> = {
  title: "Primitives/GhostPreview",
  component: GhostPreview,
  tags: ["autodocs"],
  args: { kind: "chart" },
};
export default meta;

type Story = StoryObj<typeof GhostPreview>;

export const Default: Story = {};

export const AllKinds: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-6">
      {(["chart", "table", "list", "metrics"] as const).map((kind) => (
        <div key={kind} className="rounded-xl border border-border bg-card">
          <GhostPreview kind={kind} />
        </div>
      ))}
    </div>
  ),
};
