import type { Meta, StoryObj } from "@storybook/react";
import { DatabaseRestApi } from "./database-rest-api";

const meta: Meta<typeof DatabaseRestApi> = {
  title: "Marketing/DatabaseRestApi",
  component: DatabaseRestApi,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof DatabaseRestApi>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const CustomLabels: Story = {
  args: { circleText: "SQL", badges: { first: "GET", second: "POST", third: "PATCH" } },
};
