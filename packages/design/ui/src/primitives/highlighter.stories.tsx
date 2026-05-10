import type { Meta, StoryObj } from "@storybook/react";
import { Highlighter } from "./highlighter";

const meta = {
  title: "Primitives/Highlighter",
  component: Highlighter,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Hand-drawn style text annotation effects using rough-notation. Supports 7 annotation types including highlight, underline, circle, box, and more.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    action: {
      control: "select",
      options: [
        "highlight",
        "underline",
        "box",
        "circle",
        "strike-through",
        "crossed-off",
        "bracket",
      ],
    },
    color: { control: "color" },
    strokeWidth: { control: { type: "range", min: 0.5, max: 5, step: 0.5 } },
    animationDuration: {
      control: { type: "range", min: 100, max: 2000, step: 100 },
    },
    iterations: { control: { type: "range", min: 1, max: 5, step: 1 } },
    padding: { control: { type: "range", min: 0, max: 10, step: 1 } },
  },
} satisfies Meta<typeof Highlighter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <p className="text-xl">
      This is <Highlighter>very important</Highlighter> information.
    </p>
  ),
};

export const Underline: Story = {
  render: () => (
    <p className="text-xl">
      <Highlighter action="underline" color="#FF9800">
        Underlined text
      </Highlighter>{" "}
      draws the eye naturally.
    </p>
  ),
};

export const Circle: Story = {
  render: () => (
    <p className="text-xl">
      Focus on{" "}
      <Highlighter action="circle" color="#ef4444" strokeWidth={2}>
        this key point
      </Highlighter>{" "}
      in the paragraph.
    </p>
  ),
};

export const Box: Story = {
  render: () => (
    <p className="text-xl">
      The{" "}
      <Highlighter action="box" color="#8b5cf6" strokeWidth={2}>
        boxed text
      </Highlighter>{" "}
      stands out with a border.
    </p>
  ),
};

export const StrikeThrough: Story = {
  render: () => (
    <p className="text-xl">
      Old price:{" "}
      <Highlighter action="strike-through" color="#ef4444">
        $99/month
      </Highlighter>{" "}
      now $49/month
    </p>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-6 max-w-lg">
      {(
        [
          "highlight",
          "underline",
          "box",
          "circle",
          "strike-through",
          "crossed-off",
          "bracket",
        ] as const
      ).map((action) => (
        <p key={action} className="text-lg">
          <span className="mr-3 text-sm text-muted-foreground w-32 inline-block">{action}:</span>
          <Highlighter action={action}>Sample annotated text</Highlighter>
        </p>
      ))}
    </div>
  ),
};

export const RichParagraph: Story = {
  render: () => (
    <p className="text-xl leading-relaxed max-w-lg">
      The{" "}
      <Highlighter action="underline" color="#FF9800">
        Magic UI Highlighter
      </Highlighter>{" "}
      makes important{" "}
      <Highlighter action="highlight" color="#87CEFA">
        text stand out
      </Highlighter>{" "}
      effortlessly. Use it to{" "}
      <Highlighter action="circle" color="#4ade80" strokeWidth={2}>
        emphasize key points
      </Highlighter>{" "}
      and guide readers through your content.
    </p>
  ),
};

export const ViewportTriggered: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Scroll down to see the annotation trigger</p>
      <div className="h-32" />
      <p className="text-xl">
        <Highlighter triggerOnView color="#a5f3fc">
          Triggers when scrolled into view
        </Highlighter>
      </p>
    </div>
  ),
};
