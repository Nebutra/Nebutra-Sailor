import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Modal dialog built on Radix Dialog with focus trap and escape/overlay close behavior.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-md bg-[color:var(--blue-9)] px-3 py-2 text-sm font-medium text-white"
        >
          Open dialog
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workspace</DialogTitle>
          <DialogDescription>
            This action is permanent. You can archive instead if you need recovery.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="rounded-md border border-border px-3 py-2 text-sm">
              Cancel
            </button>
          </DialogClose>
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-md bg-[color:var(--red-9)] px-3 py-2 text-sm text-white"
            >
              Delete
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the trigger button to open the dialog
    const trigger = canvas.getByRole("button", { name: /open dialog/i });
    await userEvent.click(trigger);

    // Dialog portal renders in document.body — query from there
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    expect(dialog).toBeVisible();

    // Verify the dialog title is visible
    const title = body.getByText("Delete workspace");
    expect(title).toBeVisible();

    // Press Escape to close the dialog
    await userEvent.keyboard("{Escape}");

    // Dialog should no longer be in the DOM
    expect(body.queryByRole("dialog")).toBeNull();
  },
};
