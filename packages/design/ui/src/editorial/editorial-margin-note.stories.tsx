import type { Meta, StoryObj } from "@storybook/react";
import { EditorialMarginNote } from "./editorial-margin-note";

const meta: Meta<typeof EditorialMarginNote> = {
  title: "Editorial/MarginNote",
  component: EditorialMarginNote,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Short aside that steps into the right margin at `xl` and degrades to an indented inline note below it. Widen the preview to see it float.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialMarginNote>;

export const Default: Story = {
  args: {
    label: "Aside",
    title: "Line shafts",
    children: "Factories kept the central shaft for decades after the motor arrived.",
  },
};

export const InProse: Story = {
  name: "Beside prose",
  render: () => (
    <div className="mx-auto max-w-3xl">
      <EditorialMarginNote label="Aside" title="Paul David, 1990">
        The productivity paradox took roughly forty years to resolve.
      </EditorialMarginNote>
      <p className="text-[1.03rem] leading-[1.95] text-muted-foreground">
        In the 1890s, American factory owners lined up to buy electric motors. They removed the
        boiler, placed one new electric motor where the steam engine used to sit, and waited for
        profits to double. Profits did not double. They had installed a new engine inside an old
        body — the factory was still designed around a central line shaft, and wherever the shaft
        went, the machines had to cluster.
      </p>
    </div>
  ),
};
