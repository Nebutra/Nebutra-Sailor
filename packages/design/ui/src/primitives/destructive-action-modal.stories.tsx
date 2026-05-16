import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Button } from "./button";
import { DestructiveActionModal } from "./confirm-dialog";

const meta = {
  title: "Primitives/DestructiveActionModal",
  component: DestructiveActionModal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Typed confirmation modal for serious destructive actions. The caller owns open state; the component only gates intent.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DestructiveActionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function DeleteProjectFixture() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleConfirm(): void {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setOpen(false);
    }, 1500);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="destructive">
        Delete Project
      </Button>
      <DestructiveActionModal
        confirmLabel="Delete Project"
        description={
          <>
            <span className="font-medium">next-year-boilerplate</span> and all its deployments,
            domains, and environment variables will be permanently deleted.
          </>
        }
        irreversibleDescription="Deleting next-year-boilerplate cannot be undone."
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
        open={open}
        title="Delete Project"
        verificationLabel="project name"
        verificationPhrase="next-year-boilerplate"
      />
    </>
  );
}

export const Default: Story = {
  render: () => <DeleteProjectFixture />,
};

export const Reversible: Story = {
  render: function ReversibleStory() {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm" variant="destructive">
          Disable Vercel Authentication
        </Button>
        <DestructiveActionModal
          confirmLabel="Disable Vercel Authentication"
          description="Anyone will be able to view your deployments without being a member of your team."
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          open={open}
          title="Disable Vercel Authentication"
          verificationPhrase="disable vercel authentication"
        />
      </>
    );
  },
};

export const Loading: Story = {
  render: function LoadingStory() {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm" variant="destructive">
          Delete Project
        </Button>
        <DestructiveActionModal
          confirmLabel="Delete Project"
          description="my-project and all its deployments will be permanently deleted."
          irreversibleDescription="Deleting my-project cannot be undone."
          loading
          onCancel={() => setOpen(false)}
          onConfirm={() => {}}
          open={open}
          title="Delete Project"
          verificationLabel="project name"
          verificationPhrase="my-project"
        />
      </>
    );
  },
};

export const WithError: Story = {
  render: function WithErrorStory() {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm" variant="destructive">
          Delete Project
        </Button>
        <DestructiveActionModal
          confirmLabel="Delete Project"
          description="my-project and all its deployments will be permanently deleted."
          error="Couldn't delete project. Try again."
          irreversibleDescription="Deleting my-project cannot be undone."
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          open={open}
          title="Delete Project"
          verificationLabel="project name"
          verificationPhrase="my-project"
        />
      </>
    );
  },
};

export const LongText: Story = {
  render: function LongTextStory() {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm" variant="destructive">
          Revoke Shared Production Token
        </Button>
        <DestructiveActionModal
          confirmLabel="Revoke Shared Production Token"
          description="The shared production token used by deployment automation, webhook fan-out, and incident replay jobs will stop working immediately."
          error={new Error("Couldn't revoke token. Try again.")}
          irreversibleDescription="Revoking shared-production-token cannot be undone."
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          open={open}
          title="Revoke Shared Production Token"
          verificationLabel="token name"
          verificationPhrase="shared-production-token"
        />
      </>
    );
  },
};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  render: () => <DeleteProjectFixture />,
};

export const KeyboardA11y: Story = {
  render: () => <DeleteProjectFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Delete Project" }));

    const dialog = within(document.body).getByRole("dialog", { name: "Delete Project" });
    const input = within(dialog).getByLabelText(/next-year-boilerplate/);
    const submit = within(dialog).getByRole("button", { name: "Delete Project" });

    await expect(input).toHaveFocus();
    await expect(submit).toBeDisabled();

    await userEvent.keyboard("next-year-boilerplate");
    await expect(submit).toBeEnabled();
  },
};
