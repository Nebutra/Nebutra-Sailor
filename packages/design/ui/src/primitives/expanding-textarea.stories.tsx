import type { Meta, StoryObj } from "@storybook/react";
import { ExpandingTextarea } from "./expanding-textarea";

// TextareaProps is a labelled/unlabelled union, which Storybook cannot infer args from,
// so each story renders the component directly.
const meta: Meta = {
  title: "Primitives/ExpandingTextarea",
  component: ExpandingTextarea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Textarea that grows with its content. It uses native `field-sizing: content` where available and measures in JS elsewhere.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <ExpandingTextarea aria-label="Message" placeholder="Type a few lines to see it grow" />
  ),
};

export const Prefilled: Story = {
  render: () => (
    <ExpandingTextarea
      aria-label="Release notes"
      defaultValue={
        "Release notes\n\n- Toggle redesigned with a visible off state\n- Brand page logo fixed in dark mode\n- Dependencies upgraded"
      }
    />
  ),
};

export const WithLabel: Story = {
  render: () => (
    <ExpandingTextarea
      id="expanding-notes"
      label="Notes"
      description="Grows as you type."
      placeholder="Write something"
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <ExpandingTextarea
      aria-label="Locked"
      disabled
      defaultValue="This field is read-only for now."
    />
  ),
};

export const Invalid: Story = {
  render: () => (
    <ExpandingTextarea
      id="expanding-invalid"
      label="Summary"
      error="Write at least 20 characters."
      defaultValue="Too short"
    />
  ),
};
