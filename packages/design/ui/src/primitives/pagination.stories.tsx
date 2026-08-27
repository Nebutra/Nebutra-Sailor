import type { Meta, StoryObj } from "@storybook/react";
import { Pagination } from "./pagination";

const meta = {
  title: "Primitives/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Sibling-page navigation for docs, blog posts, and onboarding sequences. Not a numbered dataset pager.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    previous: { title: "Home", href: "#home" },
    next: { title: "Introduction", href: "#introduction" },
  },
  render: (args) => (
    <div className="w-[var(--pagination-story-width)] [--pagination-story-width:640px]">
      <Pagination {...args} />
    </div>
  ),
};

export const StartOfSequence: Story = {
  args: {
    next: { title: "Introduction", href: "#introduction" },
  },
  render: (args) => (
    <div className="w-[var(--pagination-story-width)] [--pagination-story-width:640px]">
      <Pagination {...args} />
    </div>
  ),
};

export const EndOfSequence: Story = {
  args: {
    previous: { title: "Deploy Hooks", href: "#deploy-hooks" },
  },
  render: (args) => (
    <div className="w-[var(--pagination-story-width)] [--pagination-story-width:640px]">
      <Pagination {...args} />
    </div>
  ),
};

export const LongTitles: Story = {
  args: {
    previous: {
      title: "Environment Variables and Secret Rotation",
      href: "#environment-variables",
    },
    next: {
      title: "Deployment Protection Rules",
      href: "#deployment-protection",
    },
  },
  render: (args) => (
    <div className="w-[var(--pagination-story-width)] [--pagination-story-width:460px]">
      <Pagination {...args} />
    </div>
  ),
};

export const DarkMode: Story = {
  args: {
    previous: { title: "Home", href: "#home" },
    next: { title: "Introduction", href: "#introduction" },
  },
  render: (args) => (
    <div className="dark w-[var(--pagination-story-width)] rounded-[var(--radius-lg)] bg-background p-6 [--pagination-story-width:640px]">
      <Pagination {...args} />
    </div>
  ),
};
