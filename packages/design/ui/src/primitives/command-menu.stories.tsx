import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "./button";
import { CommandMenu } from "./command-menu";

const meta = {
  title: "Primitives/CommandMenu",
  component: CommandMenu.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dialog-backed command palette built on cmdk. Use it for global, keyboard-first actions; use Command directly for embedded search surfaces.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CommandMenu.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

type DemoCommand = {
  id: string;
  label: string;
  group: string;
  shortcut?: ReadonlyArray<string>;
  disabled?: boolean;
};

const commands = [
  { id: "figma-import", label: "Figma Import", group: "Suggestions", shortcut: ["⌘", "I"] },
  { id: "deploy-project", label: "Deploy Project", group: "Actions", shortcut: ["⌘", "D"] },
  { id: "invite-member", label: "Invite Team Member", group: "Actions" },
  { id: "manage-extensions", label: "Manage Extensions", group: "Actions" },
  { id: "flags-explorer", label: "Flags Explorer", group: "Collaboration" },
] as const satisfies ReadonlyArray<DemoCommand>;

const edgeCaseCommands = [
  {
    id: "long-label",
    label:
      "Generate a deployment report for the current organization and active production environment",
    group: "Recent",
    shortcut: ["⌘", "⇧", "R"],
  },
  { id: "disabled", label: "Rotate Production Secrets", group: "Admin", disabled: true },
  { id: "error", label: "Retry Failed Webhook Delivery", group: "Admin" },
] as const satisfies ReadonlyArray<DemoCommand>;

function groupedCommands(items: ReadonlyArray<DemoCommand>) {
  return items.reduce<Record<string, DemoCommand[]>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item];
    return acc;
  }, {});
}

function CommandMenuFixture({
  items = commands,
  openLabel = "Open Command Menu",
  placeholder = "What do you need?",
  empty,
  resultCount,
}: {
  items?: ReadonlyArray<DemoCommand>;
  openLabel?: string;
  placeholder?: string;
  empty?: ReactNode;
  resultCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupedCommands(items), [items]);

  function close(): void {
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{openLabel}</Button>
      <CommandMenu.Root
        open={open}
        setOpen={setOpen}
        description="Search commands and run global product actions."
      >
        <CommandMenu.Input placeholder={placeholder} />
        <CommandMenu.Results count={resultCount ?? items.length} />
        <CommandMenu.List>
          <CommandMenu.Empty>{empty ?? "No commands found."}</CommandMenu.Empty>
          {Object.entries(groups).map(([group, groupItems], groupIndex) => (
            <CommandMenu.Group key={group} heading={group}>
              {groupIndex > 0 ? <CommandMenu.Separator /> : null}
              {groupItems.map((item) => (
                <CommandMenu.Item
                  key={item.id}
                  disabled={item.disabled}
                  onSelect={close}
                  value={item.id}
                  keywords={[item.label, item.group]}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.shortcut ? (
                    <CommandMenu.Shortcut keys={item.shortcut} label={`${item.label} shortcut`} />
                  ) : null}
                </CommandMenu.Item>
              ))}
            </CommandMenu.Group>
          ))}
        </CommandMenu.List>
      </CommandMenu.Root>
    </>
  );
}

export const Default: Story = {
  render: () => <CommandMenuFixture />,
};

export const AllVariants: Story = {
  render: () => <CommandMenuFixture items={[...commands, ...edgeCaseCommands]} />,
};

export const EdgeCases: Story = {
  render: () => (
    <CommandMenuFixture
      items={edgeCaseCommands}
      openLabel="Open Edge Cases"
      placeholder="Search admin actions..."
    />
  ),
};

export const EmptyState: Story = {
  render: () => (
    <CommandMenuFixture
      items={[]}
      openLabel="Open Empty State"
      placeholder="Search projects..."
      resultCount={0}
    />
  ),
};

export const LoadingState: Story = {
  render: () => (
    <CommandMenuFixture
      items={[]}
      openLabel="Open Loading State"
      placeholder="Search commands..."
      empty="Loading commands..."
    />
  ),
};

export const ErrorState: Story = {
  render: () => (
    <CommandMenuFixture
      items={[]}
      openLabel="Open Error State"
      placeholder="Search commands..."
      empty="Commands could not be loaded."
      resultCount={0}
    />
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => <CommandMenuFixture openLabel="Open Mobile Menu" />,
};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  render: () => <CommandMenuFixture openLabel="Open Dark Menu" />,
};

export const KeyboardA11y: Story = {
  render: () => <CommandMenuFixture openLabel="Open Keyboard Menu" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open Keyboard Menu" }));

    const dialog = within(document.body).getByRole("dialog", {
      name: "Command Menu",
    });
    await expect(dialog).toBeInTheDocument();
    await expect(
      within(document.body).getByText("5 command results available."),
    ).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("dialog", { name: "Command Menu" })).toBeNull();
  },
};
