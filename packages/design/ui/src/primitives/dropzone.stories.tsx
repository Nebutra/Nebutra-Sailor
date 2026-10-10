import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Dropzone } from "./dropzone";

const meta: Meta<typeof Dropzone> = {
  title: "Primitives/Dropzone",
  component: Dropzone,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Accessible file selection built on the native file input: the surface is its label, so it is keyboard reachable and announced as a file control. Adds drag-and-drop, optional paste, accept/size/count validation with inline reasons and a polite live region, and a progress slot.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    label: "Upload logo",
    description: "PNG or JPG, up to 2 MB",
    accept: "image/png,image/jpeg",
    maxSize: 2 * 1024 * 1024,
    onFiles: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Dropzone>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Upload logo/);
    await userEvent.upload(input, new File(["x"], "logo.png", { type: "image/png" }));
    expect(args.onFiles).toHaveBeenCalled();
    expect(canvas.getByText("logo.png selected.")).toBeInTheDocument();
  },
};

export const RejectsWrongType: Story = {
  args: { onReject: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Upload logo/);
    await userEvent.upload(input, new File(["x"], "notes.txt", { type: "text/plain" }), {
      applyAccept: false,
    });
    expect(args.onReject).toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const MultipleWithPaste: Story = {
  args: {
    label: "Drop files here or browse",
    description: "Images or PDF, up to 3 files. Paste works too.",
    accept: "image/*,.pdf",
    multiple: true,
    maxFiles: 3,
    paste: true,
  },
};

export const Uploading: Story = {
  args: { progress: 62, progressLabel: "Uploading logo" },
};

export const Compact: Story = {
  args: { size: "sm", label: "Attach a CSV", description: undefined, accept: ".csv,text/csv" },
};
