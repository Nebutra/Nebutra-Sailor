import type { Meta, StoryObj } from "@storybook/react";
import { Heading } from "./heading";

const meta = {
  title: "Primitives/Heading",
  component: Heading,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Semantic heading primitive rendering h1–h6 elements with typography tokens. Supports display style for hero headings and SEO override via the `as` prop.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    level: { control: { type: "select" }, options: [1, 2, 3, 4, 5, 6] },
    color: {
      control: "select",
      options: ["default", "muted", "accent", "inherit"],
    },
    display: { control: "boolean" },
    align: { control: "select", options: ["left", "center", "right"] },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllLevels: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <Heading level={1}>Heading Level 1</Heading>
      <Heading level={2}>Heading Level 2</Heading>
      <Heading level={3}>Heading Level 3</Heading>
      <Heading level={4}>Heading Level 4</Heading>
      <Heading level={5}>Heading Level 5</Heading>
      <Heading level={6}>Heading Level 6</Heading>
    </div>
  ),
};

export const DisplayStyle: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Heading level={1} display>
        Display Heading 1
      </Heading>
      <Heading level={2} display>
        Display Heading 2
      </Heading>
    </div>
  ),
};

export const HeroSection: Story = {
  render: () => (
    <div className="space-y-4 max-w-lg text-center">
      <Heading level={1} display align="center">
        Build something great
      </Heading>
      <Heading level={2} color="muted" align="center" className="font-normal">
        The platform for modern teams to move fast without breaking things.
      </Heading>
    </div>
  ),
};

export const WithColorTokens: Story = {
  render: () => (
    <div className="space-y-3 w-64">
      <Heading level={3} color="default">
        Default color
      </Heading>
      <Heading level={3} color="muted">
        Muted color
      </Heading>
    </div>
  ),
};

export const SEOOverride: Story = {
  render: () => (
    <div className="space-y-2 w-80">
      <p className="text-xs text-muted-foreground mb-4">
        Both appear as h1 visually, but the second renders as &lt;h2&gt; in DOM.
      </p>
      <Heading level={1}>Visual h1 → DOM h1</Heading>
      <Heading level={1} as="h2">
        Visual h1 → DOM h2 (SEO override)
      </Heading>
    </div>
  ),
};

export const Centered: Story = {
  render: () => (
    <Heading level={2} align="center" className="w-80">
      Centered Section Title
    </Heading>
  ),
};
