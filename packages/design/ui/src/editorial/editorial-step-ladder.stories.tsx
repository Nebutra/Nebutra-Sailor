import type { Meta, StoryObj } from "@storybook/react";
import { EditorialStepLadder } from "./editorial-step-ladder";

const meta: Meta<typeof EditorialStepLadder> = {
  title: "Editorial/StepLadder",
  component: EditorialStepLadder,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Ordered procedure. Distinct from Timeline: a timeline reports what happened, a ladder instructs.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialStepLadder>;

export const Default: Story = {
  args: {
    label: "Publishing runbook",
    steps: [
      { title: "Write both locales", body: "One file per language, sharing one translation key." },
      { title: "Dry-run the parser", body: "Confirm the reported block types match your intent." },
      {
        title: "Generate the cover",
        body: "Original posts do not ship without editorial cover art.",
      },
      { title: "Publish and verify", body: "Open both URLs and check the language switch." },
    ],
  },
};

export const TitlesOnly: Story = {
  name: "Titles only",
  args: {
    steps: [{ title: "Classify intake" }, { title: "Normalize to AST" }, { title: "Localize" }],
  },
};
