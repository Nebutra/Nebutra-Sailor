import type { Meta, StoryObj } from "@storybook/react";
import { MacbookPro } from "./macbook-pro";

const screenshot =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1002" height="648"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0033fe"/><stop offset="1" stop-color="#0bf1c3"/></linearGradient></defs><rect width="1002" height="648" fill="url(#g)"/></svg>',
  );

const meta = {
  title: "Primitives/MacbookPro",
  component: MacbookPro,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Decorative laptop frame for product screenshots in marketing pages. Pass `src` to fill the screen; the screen color follows `currentColor`.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: { width: { control: { type: "range", min: 240, max: 800, step: 10 } } },
  args: { width: 520, height: 320 },
} satisfies Meta<typeof MacbookPro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { className: "text-muted" } };

export const WithScreenshot: Story = { args: { src: screenshot } };

export const Small: Story = { args: { width: 320, height: 200, src: screenshot } };
