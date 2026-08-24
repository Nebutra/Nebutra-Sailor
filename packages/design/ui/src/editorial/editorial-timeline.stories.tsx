import type { Meta, StoryObj } from "@storybook/react";
import { EditorialTimeline } from "./editorial-timeline";

const meta: Meta<typeof EditorialTimeline> = {
  title: "Editorial/Timeline",
  component: EditorialTimeline,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Chronology along a single rail. Markers sit in the left margin in tabular figures so the dates align regardless of digit width.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialTimeline>;

export const Default: Story = {
  args: {
    label: "How we got here",
    items: [
      {
        marker: "1997",
        title: "Think Different ships",
        body: "Grammarians object to the adjective. It wins an Emmy the following year.",
      },
      {
        marker: "2023",
        title: "Cursor raises an $8M seed",
        body: "The models are not yet strong enough for the product it describes.",
      },
      {
        marker: "2025",
        title: "A quarter of a YC batch is 95% AI-generated code",
      },
      {
        marker: "2026",
        title: "Interface similarity across chatbot products measured at 92%",
      },
    ],
  },
};

export const Compact: Story = {
  name: "Markers without bodies",
  args: {
    items: [
      { marker: "v1", title: "Markdown only" },
      { marker: "v2", title: "PortableText passthrough" },
      { marker: "v3", title: "Editorial block vocabulary" },
    ],
  },
};
