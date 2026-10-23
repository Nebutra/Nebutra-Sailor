import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import { useConfirm, usePrompt } from "./use-confirm";

function ConfirmDemo({
  tone,
  withAction,
  failAction,
}: {
  tone: "default" | "destructive";
  withAction?: boolean;
  failAction?: boolean;
}) {
  const [confirm, confirmDialog] = useConfirm();
  const [result, setResult] = useState("No answer yet");

  async function ask() {
    const ok = await confirm({
      title: tone === "destructive" ? "Remove Member" : "Publish Changes",
      description:
        tone === "destructive"
          ? "Ada Lovelace loses access to this workspace."
          : "Everyone with access sees the new version.",
      confirmLabel: tone === "destructive" ? "Remove" : "Publish",
      tone,
      ...(withAction
        ? {
            action: () =>
              new Promise<void>((resolve, reject) =>
                setTimeout(
                  () => (failAction ? reject(new Error("Request failed. Try again.")) : resolve()),
                  900,
                ),
              ),
          }
        : {}),
    });
    setResult(ok ? "Confirmed" : "Cancelled");
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant={tone === "destructive" ? "destructive" : "default"} onClick={ask}>
        {tone === "destructive" ? "Remove member" : "Publish"}
      </Button>
      <p className="text-sm text-muted-foreground">Result: {result}</p>
      {confirmDialog}
    </div>
  );
}

function PromptDemo() {
  const [prompt, promptDialog] = usePrompt();
  const [name, setName] = useState<string | null>(null);

  async function ask() {
    const value = await prompt({
      title: "New Project",
      label: "Project name",
      placeholder: "my-project",
      validate: (v) => (/\s/.test(v) ? "Use dashes instead of spaces." : null),
    });
    setName(value);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" onClick={ask}>
        New project
      </Button>
      <p className="text-sm text-muted-foreground">
        Value: {name === null ? "Cancelled or not asked" : name}
      </p>
      {promptDialog}
    </div>
  );
}

const meta = {
  title: "Primitives/UseConfirm",
  component: ConfirmDemo,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "`useConfirm` and `usePrompt` replace `window.confirm` and `window.prompt` with promise-returning, themeable dialogs. Render the returned element once; no provider is needed.",
      },
    },
  },
  tags: ["autodocs"],
  args: { tone: "default" },
} satisfies Meta<typeof ConfirmDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirm: Story = {};

export const Destructive: Story = { args: { tone: "destructive" } };

export const WithPendingAction: Story = {
  name: "Confirm with pending action",
  args: { tone: "destructive", withAction: true },
};

export const ActionFails: Story = {
  name: "Pending action that fails",
  args: { tone: "destructive", withAction: true, failAction: true },
};

export const Prompt: Story = {
  render: () => <PromptDemo />,
};
