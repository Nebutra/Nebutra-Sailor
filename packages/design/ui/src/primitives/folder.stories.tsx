import type { Meta, StoryObj } from "@storybook/react";
import { Folder, type FolderColor } from "./folder";

const meta: Meta<typeof Folder> = {
  title: "Primitives/Folder",
  component: Folder,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Decorative animated folder with hover-reveal papers. Renders as " +
          "an aria-hidden <div> when purely decorative, or as a real <button> " +
          "with full keyboard support when `onClick` is provided.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Folder>;

const COLORS: FolderColor[] = ["blue", "black", "grey", "yellow", "orange", "red"];

export const Default: Story = {
  name: "Default",
  render: () => <Folder label="Components" />,
};

export const Sizes: Story = {
  name: "Sizes",
  render: () => (
    <div className="flex items-end gap-6">
      <Folder size="sm" label="sm" />
      <Folder size="md" label="md" />
      <Folder size="lg" label="lg" />
    </div>
  ),
};

export const AllColors: Story = {
  name: "All colors",
  render: () => (
    <div className="grid grid-cols-3 gap-6">
      {COLORS.map((color) => (
        <Folder key={color} color={color} size="md" label={color} />
      ))}
    </div>
  ),
};

export const Decorative: Story = {
  name: "Decorative (no onClick → aria-hidden)",
  parameters: {
    docs: {
      description: {
        story:
          "Without `onClick`, the folder is a pure visual — aria-hidden, no focus ring, no cursor: pointer. Use this on marketing surfaces where surrounding context provides the semantics.",
      },
    },
  },
  render: () => <Folder color="orange" label="Q3 reports" />,
};

export const Interactive: Story = {
  name: "Interactive (Tab to focus reveals hover)",
  parameters: {
    docs: {
      description: {
        story:
          "With `onClick`, the folder becomes a real <button>. Tab to focus — `whileFocus` mirrors the hover animation so keyboard users see the same papers-fan-out treatment that mouse users get.",
      },
    },
  },
  render: () => (
    <Folder
      color="blue"
      label="Open"
      onClick={() => {
        // biome-ignore lint/suspicious/noConsole: storybook demo
        console.log("Folder clicked");
      }}
    />
  ),
};

export const NoLabel: Story = {
  name: "No label",
  render: () => <Folder color="grey" />,
};

export const Grid: Story = {
  name: "Folder grid (marketing surface)",
  parameters: {
    docs: {
      description: {
        story:
          "Typical marketing-page composition — three folders side by side with hover-staggered reveal.",
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-3 gap-8">
      <Folder color="blue" size="md" label="Design" />
      <Folder color="yellow" size="md" label="Docs" />
      <Folder color="red" size="md" label="Archive" />
    </div>
  ),
};
