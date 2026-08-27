import type { Meta, StoryObj } from "@storybook/react";
import { EditorialCallout } from "./editorial-callout";
import { EDITORIAL_TONES } from "./editorial-surface";

const meta: Meta<typeof EditorialCallout> = {
  title: "Editorial/Callout",
  component: EditorialCallout,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Aside for a note, insight, caution or correction. Tone is a 2px rail plus a tinted icon plate rather than a filled panel, so stacked callouts still read as one document.",
      },
    },
  },
  argTypes: {
    tone: { control: "select", options: EDITORIAL_TONES },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialCallout>;

export const Note: Story = {
  args: {
    tone: "note",
    title: "Naming",
    children:
      "The publisher derives the document id from the translation key, so renaming a key creates a second document rather than moving the first.",
  },
};

export const Insight: Story = {
  args: {
    tone: "insight",
    title: "Field note",
    children:
      "Model capability will be democratized; product capability will not. The thing you build around the technology is the barrier.",
  },
};

export const AllTones: Story = {
  name: "All tones",
  render: () => (
    <div className="max-w-2xl">
      {EDITORIAL_TONES.map((tone) => (
        <EditorialCallout key={tone} tone={tone} title={tone}>
          Every tone shares one surface recipe and differs only by rail colour and icon.
        </EditorialCallout>
      ))}
    </div>
  ),
};

export const Untitled: Story = {
  name: "No title (localized label)",
  args: {
    tone: "warning",
    label: "注意",
    children: "标题缺省时，眉标位置回落到本地化的 label，而不是英文 tone 名。",
  },
};
