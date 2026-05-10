import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Combobox } from "./combobox";
import { CommandList } from "./command";

const FRAMEWORKS = [
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "nuxt", label: "Nuxt" },
  { value: "svelte", label: "SvelteKit" },
];

const GROUPED_OPTIONS = [
  { value: "next", label: "Next.js", group: "React" },
  { value: "remix", label: "Remix", group: "React" },
  { value: "astro", label: "Astro", group: "Multi-framework" },
  { value: "nuxt", label: "Nuxt", group: "Vue" },
  { value: "svelte", label: "SvelteKit", group: "Svelte" },
];

const meta = {
  title: "Primitives/Combobox",
  component: Combobox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Searchable select input combining a trigger button with a filtered dropdown list. Built on Popover + cmdk. Supports controlled, uncontrolled, disabled, error, size, label, grouping, and composition modes.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={FRAMEWORKS}
          value={value}
          onChange={setValue}
          placeholder="Select framework..."
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the combobox trigger to open the dropdown
    const trigger = canvas.getByRole("combobox");
    await userEvent.click(trigger);

    // Popover portal renders in document.body — query from there
    const body = within(document.body);

    // Type a search query to filter results
    const searchInput = await body.findByPlaceholderText("Search...");
    await userEvent.type(searchInput, "next");

    // Verify the filtered option is visible
    const nextOption = await body.findByText("Next.js");
    expect(nextOption).toBeVisible();

    // Click the option to select it
    await userEvent.click(nextOption);

    // Trigger should now show the selected value
    expect(trigger).toHaveTextContent("Next.js");
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <div className="w-64">
      <Combobox options={FRAMEWORKS} defaultValue="next" placeholder="Select framework..." />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <Combobox
        options={FRAMEWORKS}
        defaultValue="remix"
        disabled
        placeholder="Select framework..."
      />
    </div>
  ),
};

export const Error: Story = {
  render: function ErrorStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={FRAMEWORKS}
          value={value}
          onChange={setValue}
          error
          placeholder="Select framework..."
        />
      </div>
    );
  },
};

export const SizeSmall: Story = {
  render: function SmallStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={FRAMEWORKS}
          value={value}
          onChange={setValue}
          size="sm"
          placeholder="Select framework..."
        />
      </div>
    );
  },
};

export const SizeLarge: Story = {
  render: function LargeStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={FRAMEWORKS}
          value={value}
          onChange={setValue}
          size="lg"
          placeholder="Select framework..."
        />
      </div>
    );
  },
};

export const CustomWidth: Story = {
  render: function CustomWidthStory() {
    const [value, setValue] = useState("");
    return (
      <Combobox
        options={FRAMEWORKS}
        value={value}
        onChange={setValue}
        width="w-96"
        placeholder="Select framework..."
      />
    );
  },
};

export const WithLabel: Story = {
  render: function WithLabelStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={FRAMEWORKS}
          value={value}
          onChange={setValue}
          label="Framework"
          placeholder="Select framework..."
        />
      </div>
    );
  },
};

export const GroupedOptions: Story = {
  render: function GroupedStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={GROUPED_OPTIONS}
          value={value}
          onChange={setValue}
          label="Framework"
          placeholder="Select framework..."
        />
      </div>
    );
  },
};

export const EmptySearch: Story = {
  render: function EmptySearchStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          value={value}
          onChange={setValue}
          placeholder="Try searching 'xyz'..."
          emptyMessage="No frameworks found."
        />
      </div>
    );
  },
};

export const CompositionMode: Story = {
  render: function CompositionStory() {
    const [value, setValue] = useState("");
    return (
      <div className="w-64">
        <Combobox
          value={value}
          onChange={setValue}
          label="Framework"
          placeholder="Select framework..."
        >
          <Combobox.Input placeholder="Search frameworks..." />
          <CommandList>
            <Combobox.Empty>Nothing found.</Combobox.Empty>
            <Combobox.Group heading="React">
              <Combobox.Option value="next">Next.js</Combobox.Option>
              <Combobox.Option value="remix">Remix</Combobox.Option>
            </Combobox.Group>
            <Combobox.Separator />
            <Combobox.Group heading="Vue">
              <Combobox.Option value="nuxt">Nuxt</Combobox.Option>
            </Combobox.Group>
          </CommandList>
        </Combobox>
      </div>
    );
  },
};
