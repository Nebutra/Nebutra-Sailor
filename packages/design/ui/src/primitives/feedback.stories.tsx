import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Feedback } from "./feedback";

const meta = {
  title: "Primitives/Feedback",
  component: Feedback,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Gather text feedback with an associated emotion, optional triage topic, and metadata.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "radio" },
      options: ["default", "inline"],
    },
  },
} satisfies Meta<typeof Feedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Feedback",
    dryRun: true,
  },
};

export const Inline: Story = {
  args: {
    label: "Feedback",
    type: "inline",
    dryRun: true,
  },
};

export const WithTopics: Story = {
  args: {
    label: "Report a Bug",
    showTopics: true,
    dryRun: true,
  },
};

export const WithMetadata: Story = {
  args: {
    label: "Feedback on Checkout",
    dryRun: true,
    metadata: {
      buildId: "build_12345",
      location: "post-checkout",
      plan: "pro",
      viewport: "desktop",
    },
  },
};

export const LongCopy: Story = {
  args: {
    label: "Feedback on Imports",
    copy: "How did the import from the production workspace go?",
    defaultOpen: true,
    dryRun: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Feedback",
    disabled: true,
    dryRun: true,
  },
};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Feedback",
    defaultOpen: true,
    dryRun: true,
  },
};

export const SubmitError: Story = {
  args: {
    label: "Feedback",
    defaultOpen: true,
    onSubmit: async () => {
      throw new Error("Couldn't send feedback. Try again.");
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByPlaceholderText("Your feedback..."),
      "The docs link is stale.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Send" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Couldn't send feedback. Try again.",
    );
  },
};

export const Accessibility: Story = {
  args: {
    label: "Feedback",
    defaultOpen: true,
    showTopics: true,
    dryRun: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Feedback" })).toBeVisible();
    await expect(
      canvas.getByRole("radiogroup", { name: "How was this experience?" }),
    ).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "How was this experience?" })).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Send" })).toBeDisabled();
  },
};
