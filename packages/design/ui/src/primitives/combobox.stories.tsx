import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useId, useState } from "react";
import { Combobox } from "./combobox";
import { Label } from "./label";

const REGIONS = [
  { value: "iad1", label: "Washington, D.C." },
  { value: "sfo1", label: "San Francisco" },
  { value: "fra1", label: "Frankfurt" },
  { value: "hnd1", label: "Tokyo" },
  { value: "sin1", label: "Singapore" },
];

const FRAMEWORKS = [
  { value: "next", label: "Next.js", group: "React" },
  { value: "remix", label: "Remix", group: "React" },
  { value: "astro", label: "Astro", group: "Multi-framework" },
  { value: "nuxt", label: "Nuxt", group: "Vue" },
  { value: "svelte", label: "SvelteKit", group: "Svelte" },
];

const LONG_OPTIONS = [
  {
    value: "read-replica",
    label:
      "Primary database read replica in the European Union with automatic failover and compliance logging",
  },
  {
    value: "cold-storage",
    label: "Cold storage archive for quarterly audit snapshots retained for seven years",
  },
  {
    value: "edge-cache",
    label: "Global edge cache invalidation queue for customer-facing dashboard metrics",
  },
];

const meta = {
  title: "Primitives/Combobox",
  component: Combobox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Searchable single-select input for known lists. Built on Popover and cmdk with Nebutra form, motion, and accessibility contracts.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Combobox
      aria-label="Deployment region"
      options={REGIONS}
      placeholder="Search regions..."
      width={256}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("combobox", { name: "Deployment region" });

    await userEvent.click(trigger);
    const body = within(document.body);
    const searchInput = await body.findByPlaceholderText("Search...");
    await userEvent.type(searchInput, "tokyo");
    const option = await body.findByText("Tokyo");
    expect(option).toBeVisible();

    await userEvent.click(option);
    expect(trigger).toHaveTextContent("Tokyo");
  },
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<string | null>("sfo1");
    return (
      <Combobox
        aria-label="Deployment region"
        options={REGIONS}
        value={value}
        onChange={setValue}
        placeholder="Search regions..."
        width={256}
      />
    );
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <Combobox
      aria-label="Deployment region"
      defaultValue="fra1"
      options={REGIONS}
      placeholder="Search regions..."
      width={256}
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <Combobox
      aria-label="Deployment region"
      defaultValue="iad1"
      disabled
      options={REGIONS}
      placeholder="Search regions..."
      width={256}
    />
  ),
};

export const Errored: Story = {
  render: () => (
    <Combobox
      aria-label="Deployment region"
      errored
      options={REGIONS}
      placeholder="Search regions..."
      width={256}
    />
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  },
};

export const WithLabel: Story = {
  render: function WithLabelStory() {
    const id = useId();
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>Deployment Region</Label>
        <Combobox id={id} options={REGIONS} placeholder="Search regions..." width={256} />
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-stretch gap-4 md:flex-row">
      <Combobox
        aria-label="Small region"
        options={REGIONS}
        placeholder="Search regions..."
        size="small"
        width={220}
      />
      <Combobox
        aria-label="Medium region"
        options={REGIONS}
        placeholder="Search regions..."
        width={220}
      />
      <Combobox
        aria-label="Large region"
        options={REGIONS}
        placeholder="Search regions..."
        size="large"
        width={220}
      />
    </div>
  ),
};

export const GroupedOptions: Story = {
  render: () => (
    <Combobox
      aria-label="Framework"
      options={FRAMEWORKS}
      placeholder="Search frameworks..."
      width={256}
    />
  ),
};

export const LongText: Story = {
  render: () => (
    <Combobox
      aria-label="Policy scope"
      listMaxWidth={520}
      options={LONG_OPTIONS}
      placeholder="Search policy scopes..."
      width={320}
    />
  ),
};

export const EmptyState: Story = {
  render: () => (
    <Combobox aria-label="Framework" placeholder="Search frameworks..." width={256}>
      <Combobox.Input placeholder="Search frameworks..." />
      <Combobox.List emptyMessage={'No frameworks match "ember".'}>
        <Combobox.Option value="next">Next.js</Combobox.Option>
        <Combobox.Option value="remix">Remix</Combobox.Option>
      </Combobox.List>
    </Combobox>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("combobox");
    await userEvent.click(trigger);
    const body = within(document.body);
    const searchInput = await body.findByPlaceholderText("Search frameworks...");
    await userEvent.type(searchInput, "ember");
    expect(await body.findByText('No frameworks match "ember".')).toBeVisible();
  },
};

export const Loading: Story = {
  render: () => (
    <Combobox
      aria-label="Deployment region"
      loading
      loadingMessage="Loading regions..."
      options={[]}
      placeholder="Search regions..."
      width={256}
    />
  ),
};

export const CompositionMode: Story = {
  render: function CompositionStory() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Combobox
        aria-label="Framework"
        value={value}
        onChange={setValue}
        placeholder="Search frameworks..."
        width={256}
      >
        <Combobox.Input placeholder="Search frameworks..." />
        <Combobox.List emptyMessage="No frameworks found.">
          <Combobox.Group heading="React">
            <Combobox.Option value="next">Next.js</Combobox.Option>
            <Combobox.Option value="remix">Remix</Combobox.Option>
          </Combobox.Group>
          <Combobox.Separator />
          <Combobox.Group heading="Vue">
            <Combobox.Option value="nuxt">Nuxt</Combobox.Option>
          </Combobox.Group>
        </Combobox.List>
      </Combobox>
    );
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6 text-foreground">
      <Combobox
        aria-label="Deployment region"
        options={REGIONS}
        placeholder="Search regions..."
        width={256}
      />
    </div>
  ),
};
