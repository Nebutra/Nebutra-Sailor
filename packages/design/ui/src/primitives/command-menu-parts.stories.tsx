import { ArrowUpRight, Cpu, MagnifyingGlass as Search, User } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useCommandState } from "cmdk";
import * as React from "react";
import { Button } from "./button";
import {
  CommandMenuEmpty,
  CommandMenuGroup,
  CommandMenuInput,
  CommandMenuItem,
  CommandMenuList,
  CommandMenuResults,
  CommandMenuRoot,
  CommandMenuSeparator,
  CommandMenuShortcut,
} from "./command-menu-parts";
import { Spinner } from "./spinner";

/**
 * The nine flat exports behind the `CommandMenu.*` namespace. `CommandMenu` (the
 * frozen namespace object in `command-menu.tsx`) has its own story; this file
 * documents the parts as importable symbols, because that is how a consumer that
 * needs one part — a lone `CommandMenuItem` inside its own wrapper, say — reaches
 * them.
 *
 * There is no separate implementation here to regress: `Input`, `List`, `Empty`,
 * `Results`, `Group`, `Separator` and `Shortcut` are typed pass-throughs to the
 * `Command*` primitives, and the two that are not — `CommandMenuRoot` (Base UI
 * dialog + portal + overlay + sr-only title) and `CommandMenuItem` (merges the
 * legacy `callback` prop into `onSelect`) — are what the play functions below
 * exercise. Everything is one composition story, per the census: nine stories for
 * nine pass-throughs would be nine files nobody reads.
 */

const meta = {
  title: "Primitives/CommandMenuParts",
  component: CommandMenuRoot,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Flat part exports for the dialog-backed command palette. Prefer the CommandMenu namespace in product code; import the parts directly only when composing a variant of the root.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CommandMenuRoot>;

export default meta;
type Story = StoryObj<typeof CommandMenuRoot>;

/* ------------------------------------------------------------------ *
 * Fixture
 * ------------------------------------------------------------------ */

interface DemoCommand {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  shortcut?: ReadonlyArray<string>;
  disabled?: boolean;
}

const commands: ReadonlyArray<DemoCommand> = [
  {
    id: "search-projects",
    label: "Search projects",
    group: "Suggestions",
    icon: <Search />,
    shortcut: ["⌘", "P"],
  },
  { id: "invite-member", label: "Invite team member", group: "Actions", icon: <User /> },
  {
    id: "deploy",
    label: "Deploy to production",
    group: "Actions",
    icon: <ArrowUpRight />,
    shortcut: ["⌘", "D"],
  },
];

const edgeCaseCommands: ReadonlyArray<DemoCommand> = [
  {
    id: "long-label",
    label:
      "Generate a deployment report for the current organization across every active production environment",
    group: "Recent",
    icon: <Cpu />,
    shortcut: ["⌘", "⇧", "R"],
  },
  { id: "rotate-secrets", label: "Rotate production secrets", group: "Admin", disabled: true },
  { id: "retry-webhook", label: "Retry failed webhook delivery", group: "Admin" },
];

const manyCommands: ReadonlyArray<DemoCommand> = Array.from({ length: 40 }, (_, index) => ({
  id: `worker-${index}`,
  label: `gateway-worker-${String(index + 1).padStart(2, "0")}`,
  group: index < 20 ? "Region: iad1" : "Region: hnd1",
  icon: <Cpu />,
}));

function byGroup(items: ReadonlyArray<DemoCommand>): Array<[string, DemoCommand[]]> {
  const groups = new Map<string, DemoCommand[]>();
  for (const item of items) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }
  return [...groups.entries()];
}

/**
 * `CommandMenuResults` needs the *filtered* count, and neither
 * `command-menu-parts.tsx` nor `command.tsx` re-exports a way to get it — passing
 * `items.length` announces "3 results" for a query that matched none. Reaches
 * `useCommandState` from cmdk directly; see the gap noted for `Command`.
 */
function LiveResults({ search }: { search: string }) {
  const count = useCommandState((state) => state.filtered.count);
  return <CommandMenuResults count={count} search={search} />;
}

type Status = "ready" | "loading" | "error";

interface PartsFixtureProps {
  items?: ReadonlyArray<DemoCommand>;
  openLabel?: string;
  placeholder?: string;
  status?: Status;
  /** Renders the palette open on mount, for the docs/visual snapshot. */
  defaultOpen?: boolean;
}

/**
 * Assembled from the flat parts on purpose — a consumer reading this story is
 * looking for the import names, not the namespace sugar.
 */
function CommandMenuPartsFixture({
  items = commands,
  openLabel = "Open command menu",
  placeholder = "What do you need?",
  status = "ready",
  defaultOpen = false,
}: PartsFixtureProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [search, setSearch] = React.useState("");
  const [lastRun, setLastRun] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={() => setOpen(true)}>{openLabel}</Button>
      <p className="text-xs text-muted-foreground" data-testid="last-run">
        {lastRun ? `Ran: ${lastRun}` : "Nothing run yet"}
      </p>

      <CommandMenuRoot
        open={open}
        setOpen={setOpen}
        label="Command menu"
        description="Search commands and run global product actions."
      >
        <CommandMenuInput placeholder={placeholder} value={search} onValueChange={setSearch} />
        <LiveResults search={search} />
        <CommandMenuList>
          <CommandMenuEmpty>
            {status === "loading" ? (
              <span className="flex items-center justify-center gap-2 text-muted-foreground">
                <Spinner size="sm" />
                Loading commands…
              </span>
            ) : status === "error" ? (
              <span className="flex flex-col items-center gap-1">
                <span className="font-medium text-destructive">Commands could not be loaded</span>
                <span className="text-muted-foreground">Check your connection and try again</span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1">
                <span className="font-medium text-foreground">Nothing matches that</span>
                <span className="text-muted-foreground">Try a shorter search</span>
              </span>
            )}
          </CommandMenuEmpty>

          {byGroup(items).map(([group, groupItems], groupIndex) => (
            <React.Fragment key={group}>
              {groupIndex > 0 ? <CommandMenuSeparator /> : null}
              <CommandMenuGroup heading={group}>
                {groupItems.map((item) => (
                  <CommandMenuItem
                    key={item.id}
                    value={item.id}
                    keywords={[item.label, item.group]}
                    {...(item.disabled ? { disabled: true } : {})}
                    // `callback` is the legacy prop CommandMenuItem folds into
                    // onSelect; both fire, and both are covered here so a
                    // regression in the merge shows up.
                    callback={() => setOpen(false)}
                    onSelect={() => setLastRun(item.label)}
                  >
                    {item.icon ? (
                      <span className="mr-2 shrink-0 text-muted-foreground">{item.icon}</span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.shortcut ? (
                      <CommandMenuShortcut keys={item.shortcut} label={`${item.label} shortcut`} />
                    ) : null}
                  </CommandMenuItem>
                ))}
              </CommandMenuGroup>
            </React.Fragment>
          ))}
        </CommandMenuList>
      </CommandMenuRoot>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => <CommandMenuPartsFixture />,
};

/**
 * All nine parts in one open palette, plus every state the happy path hides.
 * Each panel is its own root because the palette is a modal dialog — two open at
 * once would fight over the focus trap.
 */
export const AllVariants: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Labelled title="Grouped, with shortcuts">
        <CommandMenuPartsFixture openLabel="Open grouped" />
      </Labelled>
      <Labelled title="Overflow — long label, disabled row">
        <CommandMenuPartsFixture items={edgeCaseCommands} openLabel="Open edge cases" />
      </Labelled>
      <Labelled title="Overflow — 40 rows">
        <CommandMenuPartsFixture items={manyCommands} openLabel="Open long list" />
      </Labelled>
      <Labelled title="No results">
        <CommandMenuPartsFixture items={[]} openLabel="Open empty" />
      </Labelled>
      <Labelled title="Loading">
        <CommandMenuPartsFixture items={[]} status="loading" openLabel="Open loading" />
      </Labelled>
      <Labelled title="Error">
        <CommandMenuPartsFixture items={[]} status="error" openLabel="Open error" />
      </Labelled>
    </div>
  ),
};

function Labelled({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex w-56 flex-col items-center gap-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Open on mount, so the docs page and any snapshot capture the popup itself. */
export const OpenByDefault: Story = {
  render: () => <CommandMenuPartsFixture defaultOpen openLabel="Reopen" />,
};

export const EmptyState: Story = {
  render: () => <CommandMenuPartsFixture items={[]} defaultOpen openLabel="Reopen" />,
};

export const LoadingState: Story = {
  render: () => (
    <CommandMenuPartsFixture items={[]} status="loading" defaultOpen openLabel="Reopen" />
  ),
};

export const ErrorState: Story = {
  render: () => (
    <CommandMenuPartsFixture items={[]} status="error" defaultOpen openLabel="Reopen" />
  ),
};

export const LongContent: Story = {
  render: () => <CommandMenuPartsFixture items={edgeCaseCommands} defaultOpen openLabel="Reopen" />,
};

export const Overflow: Story = {
  render: () => <CommandMenuPartsFixture items={manyCommands} defaultOpen openLabel="Reopen" />,
};

export const DarkMode: Story = {
  parameters: { layout: "padded" },
  decorators: [
    (StoryFn) => (
      <div className="dark flex min-h-64 justify-center bg-background p-8 text-foreground">
        <StoryFn />
      </div>
    ),
  ],
  render: () => <CommandMenuPartsFixture defaultOpen openLabel="Reopen" />,
};

/**
 * `CommandMenuRoot` owns the dialog contract; the parts inside own the list
 * contract. Asserted together because that seam is where a Base UI or cmdk bump
 * breaks: the popup is portalled out of the canvas, so a story that queried only
 * `canvasElement` would silently pass against nothing.
 */
export const KeyboardAndDialogContract: Story = {
  render: () => <CommandMenuPartsFixture openLabel="Open keyboard menu" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(canvas.getByRole("button", { name: "Open keyboard menu" }));

    // sr-only Dialog.Title supplies the accessible name (WCAG 4.1.2).
    const dialog = await waitFor(() => body.getByRole("dialog", { name: "Command menu" }));
    await expect(dialog).toBeInTheDocument();

    // CommandMenuResults renders a polite live region seeded from product state.
    await expect(body.getByText("3 command results available.")).toBeInTheDocument();

    // Flat roving selection across group boundaries.
    await expect(body.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(body.getByRole("option", { name: /Invite team member/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    // Enter must fire BOTH onSelect (records the run) and callback (closes).
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByTestId("last-run")).toHaveTextContent("Ran: Invite team member"),
    );
    await waitFor(() => expect(body.queryByRole("dialog", { name: "Command menu" })).toBeNull());

    // Escape closes without running anything.
    await userEvent.click(canvas.getByRole("button", { name: "Open keyboard menu" }));
    await waitFor(() => body.getByRole("dialog", { name: "Command menu" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog", { name: "Command menu" })).toBeNull());
    await expect(canvas.getByTestId("last-run")).toHaveTextContent("Ran: Invite team member");
  },
};

/** Filtering down to zero must surface `CommandMenuEmpty`, not an empty box. */
export const FilterNarrowsToNoResults: Story = {
  render: () => <CommandMenuPartsFixture openLabel="Open filter menu" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(canvas.getByRole("button", { name: "Open filter menu" }));
    const input = await waitFor(() => body.getByPlaceholderText("What do you need?"));

    await userEvent.type(input, "deploy");
    await waitFor(() => expect(body.getAllByRole("option")).toHaveLength(1));

    await userEvent.clear(input);
    await userEvent.type(input, "zzzz");
    await waitFor(() => expect(body.queryAllByRole("option")).toHaveLength(0));
    await expect(body.getByText("Nothing matches that")).toBeInTheDocument();
  },
};
