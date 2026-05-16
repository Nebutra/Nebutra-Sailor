import { ArrowCircleUp } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "Primitives/Select",
  component: Select,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Short fixed-list native select with a compatible compound listbox API for advanced grouped menus.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const planOptions = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
] as const;

function StoryRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-[var(--select-story-width)] flex-col gap-4 sm:flex-row sm:items-start [--select-story-width:720px]">
      {children}
    </div>
  );
}

export const Sizes: Story = {
  render: () => (
    <StoryRow>
      <Select placeholder="XSmall" size="xsmall" options={planOptions} />
      <Select placeholder="Small" size="small" options={planOptions} />
      <Select placeholder="Default" options={planOptions} />
      <Select placeholder="Large" size="large" options={planOptions} />
    </StoryRow>
  ),
};

export const PrefixAndSuffix: Story = {
  render: () => (
    <StoryRow>
      <Select
        placeholder="Small"
        prefix={<ArrowCircleUp aria-hidden="true" />}
        size="small"
        suffix={<ArrowCircleUp aria-hidden="true" />}
        options={planOptions}
      />
      <Select
        placeholder="Default"
        prefix={<ArrowCircleUp aria-hidden="true" />}
        suffix={<ArrowCircleUp aria-hidden="true" />}
        options={planOptions}
      />
      <Select
        placeholder="Large"
        prefix={<ArrowCircleUp aria-hidden="true" />}
        size="large"
        suffix={<ArrowCircleUp aria-hidden="true" />}
        options={planOptions}
      />
    </StoryRow>
  ),
};

export const Disabled: Story = {
  render: () => <Select disabled placeholder="Disabled with placeholder" options={planOptions} />,
};

export const ErrorState: Story = {
  render: () => (
    <StoryRow>
      <Select error="Select a plan." placeholder="XSmall" size="xsmall" options={planOptions} />
      <Select error="Select a plan." placeholder="Small" size="small" options={planOptions} />
      <Select error="Select a plan." placeholder="Default" options={planOptions} />
      <Select error="Select a plan." placeholder="Large" size="large" options={planOptions} />
    </StoryRow>
  ),
};

export const Label: Story = {
  render: () => <Select label="Plan" placeholder="Select a plan" options={planOptions} />,
};

export const Empty: Story = {
  render: () => <Select label="Region" placeholder="No regions available" options={[]} />,
};

export const CompoundListbox: Story = {
  render: () => (
    <div className="w-72">
      <Select defaultValue="pro">
        <SelectTrigger>
          <SelectValue placeholder="Choose a plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Plans</SelectLabel>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("combobox");
    await userEvent.click(trigger);

    const body = within(document.body);
    const listbox = await body.findByRole("listbox");
    expect(listbox).toBeVisible();

    const starterOption = body.getByRole("option", { name: "Starter" });
    await userEvent.click(starterOption);

    expect(trigger).toHaveTextContent("Starter");
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6">
      <Select label="Framework" placeholder="Select a framework" options={planOptions} />
    </div>
  ),
};
