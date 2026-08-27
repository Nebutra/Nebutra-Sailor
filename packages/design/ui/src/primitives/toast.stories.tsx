"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Toaster, toast, useToasts } from "./toaster";

const meta = {
  title: "Primitives/Toast",
  component: Toaster,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Sonner-backed transient notification facade with tokenized styling and Geist-compatible useToasts API.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

function ToastFixture() {
  const toasts = useToasts();

  return (
    <div className="flex gap-2">
      <Button onClick={() => toasts.success("Deployment promoted.")}>Success</Button>
      <Button
        variant="secondary"
        onClick={() =>
          toasts.message({
            text: "Project renamed.",
            description: "The dashboard title has been updated.",
          })
        }
      >
        Message
      </Button>
      <Button variant="destructive" onClick={() => toasts.error("Webhook delivery failed.")}>
        Error
      </Button>
      <Toaster />
    </div>
  );
}

export const Default: Story = {
  render: () => <ToastFixture />,
};

export const DirectApi: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button onClick={() => toast.warning("Usage is above 80%.")}>Show Warning</Button>
      <Toaster />
    </div>
  ),
};
