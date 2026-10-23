import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import { BulkActionConfirmDialog, ConfirmDeleteDialog, ConfirmDialog } from "./confirm-dialog";

const meta = {
  title: "Primitives/ConfirmDialog",
  component: ConfirmDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Confirmation dialogs for risky actions: a plain confirm, a type-to-confirm delete gate, and a bulk-action confirm that escalates to typed input above a threshold. The caller owns `open`.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    open: false,
    onOpenChange: () => {},
    onConfirm: () => {},
    title: "Publish changes",
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function ConfirmDemo({
  variant,
  title,
  description,
  confirmText,
}: {
  variant: "default" | "destructive" | "warning";
  title: string;
  description: string;
  confirmText: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open {variant}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        variant={variant}
        title={title}
        description={description}
        confirmText={confirmText}
        onConfirm={() => new Promise<void>((resolve) => setTimeout(resolve, 800))}
      />
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ConfirmDemo
      variant="default"
      title="Publish changes"
      description="Everyone with access to this workspace will see the new version."
      confirmText="Publish"
    />
  ),
};

export const Destructive: Story = {
  render: () => (
    <ConfirmDemo
      variant="destructive"
      title="Remove member"
      description="Ada Lovelace loses access to this workspace immediately."
      confirmText="Remove"
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ConfirmDemo
      variant="warning"
      title="Leave without saving"
      description="Your unsaved edits will be discarded."
      confirmText="Discard"
    />
  ),
};

export const TypeToConfirmDelete: Story = {
  name: "Delete (type to confirm)",
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete project
          </Button>
          <ConfirmDeleteDialog
            open={open}
            onOpenChange={setOpen}
            itemName="Project Alpha"
            itemType="project"
            confirmationText="Project Alpha"
            warnings={["Its 3 deployments will stop."]}
            onConfirm={() => setOpen(false)}
          />
        </>
      );
    };
    return <Demo />;
  },
};

export const BulkAction: Story = {
  name: "Bulk action",
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Archive 12 users
          </Button>
          <BulkActionConfirmDialog
            open={open}
            onOpenChange={setOpen}
            action="archive"
            itemCount={12}
            itemType="users"
            variant="warning"
            requireInputConfirmation
            inputConfirmationThreshold={10}
            previewItems={["Ada Lovelace", "Grace Hopper", "Alan Turing"]}
            onConfirm={() => setOpen(false)}
          />
        </>
      );
    };
    return <Demo />;
  },
};
