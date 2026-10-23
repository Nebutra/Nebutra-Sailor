import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroupStacked, RadioGroupStackedItem } from "./radio-group-stacked";

const meta = {
  title: "Primitives/RadioGroupStacked",
  component: RadioGroupStacked,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Vertical list of full-width radio rows, for choices that need a title and a line of explanation.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroupStacked>;

export default meta;
type Story = StoryObj<typeof meta>;

const options = [
  { value: "main", title: "Deploy from main", note: "Every merge ships to production." },
  { value: "tag", title: "Deploy from tags", note: "Only tagged releases ship." },
  { value: "manual", title: "Manual", note: "Nothing ships until you trigger it." },
];

export const Default: Story = {
  render: (args) => (
    <RadioGroupStacked {...args} defaultValue="main" aria-label="Deploy trigger" className="w-96">
      {options.map((option) => (
        <RadioGroupStackedItem key={option.value} value={option.value}>
          <span className="flex flex-col pl-7 text-left">
            <span className="text-sm font-medium text-foreground">{option.title}</span>
            <span className="text-xs text-muted-foreground">{option.note}</span>
          </span>
        </RadioGroupStackedItem>
      ))}
    </RadioGroupStacked>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <RadioGroupStacked
      {...args}
      disabled
      defaultValue="tag"
      aria-label="Deploy trigger"
      className="w-96"
    >
      {options.map((option) => (
        <RadioGroupStackedItem key={option.value} value={option.value}>
          <span className="pl-7 text-sm text-foreground">{option.title}</span>
        </RadioGroupStackedItem>
      ))}
    </RadioGroupStacked>
  ),
};
