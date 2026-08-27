import type { Meta, StoryObj } from "@storybook/react";
import { MultipleSelector } from "./multiple-selector";

const meta = {
  title: "Primitives/MultipleSelector",
  component: MultipleSelector,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Multi-select combobox with badge tags. Supports fixed options, grouped options, async search, max selection limit, and keyboard navigation.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MultipleSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const frameworks = [
  { value: "next", label: "Next.js" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "svelte", label: "Svelte" },
  { value: "astro", label: "Astro" },
  { value: "remix", label: "Remix" },
];

const groupedOptions = [
  { value: "frontend-react", label: "React", group: "Frontend" },
  { value: "frontend-vue", label: "Vue", group: "Frontend" },
  { value: "backend-node", label: "Node.js", group: "Backend" },
  { value: "backend-go", label: "Go", group: "Backend" },
  { value: "db-postgres", label: "PostgreSQL", group: "Database" },
  { value: "db-mongo", label: "MongoDB", group: "Database" },
];

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <MultipleSelector
        defaultOptions={frameworks}
        placeholder="Select frameworks..."
        emptyIndicator={
          <p className="text-sm text-muted-foreground text-center py-2">No frameworks found</p>
        }
      />
    </div>
  ),
};

export const WithGroupedOptions: Story = {
  render: () => (
    <div className="w-96">
      <MultipleSelector
        defaultOptions={groupedOptions}
        groupBy="group"
        placeholder="Select stack..."
      />
    </div>
  ),
};

export const WithMaxSelection: Story = {
  render: () => (
    <div className="w-96 space-y-2">
      <MultipleSelector
        defaultOptions={frameworks}
        placeholder="Select up to 3 frameworks..."
        maxSelected={3}
        onMaxSelected={(max) => alert(`Max ${max} selections allowed`)}
      />
      <p className="text-xs text-muted-foreground">Maximum 3 selections</p>
    </div>
  ),
};

export const WithFixedOption: Story = {
  render: () => (
    <div className="w-96">
      <MultipleSelector
        value={[{ value: "react", label: "React", fixed: true }]}
        defaultOptions={frameworks}
        placeholder="Add more frameworks..."
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-96">
      <MultipleSelector
        defaultOptions={frameworks}
        value={[
          { value: "next", label: "Next.js" },
          { value: "react", label: "React" },
        ]}
        disabled
        placeholder="Select frameworks..."
      />
    </div>
  ),
};
