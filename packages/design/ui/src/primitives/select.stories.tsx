import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
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
          "Single-select control built on Radix Select with keyboard navigation and grouped options.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
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

    // Click the select trigger to open the listbox
    const trigger = canvas.getByRole("combobox");
    await userEvent.click(trigger);

    // Radix Select portal renders in document.body
    const body = within(document.body);

    // Verify the listbox options are visible
    const listbox = await body.findByRole("listbox");
    expect(listbox).toBeVisible();

    // Click the "Starter" option
    const starterOption = body.getByRole("option", { name: "Starter" });
    await userEvent.click(starterOption);

    // Trigger should now show the selected value
    expect(trigger).toHaveTextContent("Starter");
  },
};
