import { Button, Toaster, useToasts } from "@nebutra/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof ToastStories> = {
  title: "Primitives/Toast",
  component: ToastStories,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Transient notification facade over Sonner with Nebutra defaults and a Geist-compatible useToasts API.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ToastStories>;

function ToastStories() {
  const toasts = useToasts();

  return (
    <div className="flex min-h-48 flex-wrap items-center justify-center gap-2">
      <Button
        variant="outline"
        onClick={() => {
          toasts.message({ text: "Deployment canceled" });
        }}
      >
        Message
      </Button>
      <Button
        onClick={() => {
          toasts.success("Domain added");
        }}
      >
        Success
      </Button>
      <Button
        variant="warning"
        onClick={() => {
          toasts.warning("Deployment completed with skipped routes");
        }}
      >
        Warning
      </Button>
      <Button
        variant="destructive"
        onClick={() => {
          toasts.error("Couldn’t verify domain. Try again.");
        }}
      >
        Error
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          toasts.message({
            text: "Project archived",
            onUndoAction: () => {
              toasts.success("Project restored");
            },
          });
        }}
      >
        Undo
      </Button>
      <Button
        variant="tertiary"
        onClick={() => {
          toasts.message({
            text: "Invite link copied",
            preserve: true,
          });
        }}
      >
        Preserve
      </Button>
      <Toaster />
    </div>
  );
}

export const Default: Story = {};
