import {
  ArrowUpRight,
  Cpu,
  FolderOpen,
  MagnifyingGlass as Search,
  SettingsGear,
  User,
  Warning,
} from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useCommandState } from "cmdk";
import * as React from "react";
import { Button } from "./button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResults,
  CommandSeparator,
  CommandShortcut,
} from "./command";
import { Spinner } from "./spinner";

/**
 * `Command` is the embedded, always-visible half of the command-palette family;
 * `CommandMenu` is the dialog-backed half. This file is the visual regression
 * surface for the embedded one — the states that actually break are the ones
 * with no happy-path markup: no results, still-loading, failed-to-load, a list
 * longer than the 300px `CommandList` viewport, and labels wider than the frame.
 *
 * The keyboard contract belongs to cmdk, not to this wrapper: ArrowDown /
 * ArrowUp move the `aria-selected` option, disabled items are skipped, Enter
 * fires the selected item's `onSelect`, and typing narrows by `value` plus
 * `keywords`. `Keyboard` and `FilterNarrowsToNoResults` assert that rather than
 * describe it — the point of a story here is that a cmdk major bump has
 * somewhere to fail loudly.
 *
 * One primitive gap this story had to route around: `CommandResults` requires a
 * `count`, and `command.tsx` exports nothing that yields the *filtered* count.
 * The fixture below imports `useCommandState` from `cmdk` directly. Re-exporting
 * it (or defaulting `CommandResults` to read it) would fix the five docs previews
 * that currently announce a stale, unfiltered number.
 */

/** The embedded palette has no dialog to give it an edge, so the frame is the
 * caller's job. Same shape the docs preview uses, on the ambient shadow ramp. */
const FRAME = "w-[420px] rounded-[var(--radius-md)] border border-border shadow-ambient-md";

const meta = {
  title: "Primitives/Command",
  component: Command,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Embedded command palette built on cmdk. Use it for in-page search surfaces (comboboxes, faceted filters, inline pickers); use CommandMenu for the global ⌘K dialog.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof Command>;

/* ------------------------------------------------------------------ *
 * Fixture data
 * ------------------------------------------------------------------ */

interface DemoCommand {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  shortcut?: ReadonlyArray<string>;
  keywords?: ReadonlyArray<string>;
  disabled?: boolean;
  meta?: string;
}

const commands: ReadonlyArray<DemoCommand> = [
  {
    id: "search-projects",
    label: "Search projects",
    group: "Suggestions",
    icon: <Search />,
    shortcut: ["⌘", "P"],
    keywords: ["find", "repo"],
  },
  {
    id: "open-workspace",
    label: "Open workspace",
    group: "Suggestions",
    icon: <FolderOpen />,
    keywords: ["directory"],
  },
  {
    id: "invite-member",
    label: "Invite team member",
    group: "Actions",
    icon: <User />,
    shortcut: ["⌘", "⇧", "I"],
  },
  {
    id: "deploy",
    label: "Deploy to production",
    group: "Actions",
    icon: <ArrowUpRight />,
    shortcut: ["⌘", "D"],
  },
  {
    id: "preferences",
    label: "Preferences",
    group: "Settings",
    icon: <SettingsGear />,
    shortcut: ["⌘", ","],
  },
];

/** Everything a happy-path fixture hides: a label wider than the frame, an item
 * the keyboard must skip, and a long secondary string competing for the row. */
const edgeCaseCommands: ReadonlyArray<DemoCommand> = [
  {
    id: "long-label",
    label:
      "Generate a deployment report for the current organization across every active production environment",
    group: "Recent",
    icon: <Cpu />,
    shortcut: ["⌘", "⇧", "R"],
  },
  {
    id: "rotate-secrets",
    label: "Rotate production secrets",
    group: "Admin",
    icon: <Warning />,
    disabled: true,
    meta: "Owner only",
  },
  {
    id: "retry-webhook",
    label: "Retry failed webhook delivery",
    group: "Admin",
    meta: "3 pending",
  },
];

/** 40 rows, to push `CommandList`'s `max-h-[300px]` into scrolling. */
const manyCommands: ReadonlyArray<DemoCommand> = Array.from({ length: 40 }, (_, index) => ({
  id: `service-${index}`,
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

/* ------------------------------------------------------------------ *
 * Fixture component
 * ------------------------------------------------------------------ */

/**
 * Polite live region for the result count. cmdk announces nothing when the
 * filtered set changes, so a screen-reader user typing into the input otherwise
 * hears silence.
 *
 * The count has to come from cmdk's own filtered state, not from the source
 * array: with client-side filtering, `items.length` is the *unfiltered* number
 * and announces "5 results" for a query that matched none. `CommandResults` takes
 * a `count` but `command.tsx` re-exports no way to obtain it, so this reaches
 * `useCommandState` directly from `cmdk` — see the primitive gap noted in the
 * file header. All five existing docs previews pass a stale number.
 */
function LiveResults({ search }: { search: string }) {
  const count = useCommandState((state) => state.filtered.count);
  return <CommandResults count={count} search={search} />;
}

type Status = "ready" | "loading" | "error";

interface FixtureProps {
  items?: ReadonlyArray<DemoCommand>;
  placeholder?: string;
  status?: Status;
  /** Height is fixed in every state so the frame does not resize under the cursor. */
  className?: string;
  onSelectItem?: (id: string) => void;
}

function CommandFixture({
  items = commands,
  placeholder = "Search commands…",
  status = "ready",
  className,
  onSelectItem,
}: FixtureProps) {
  const [search, setSearch] = React.useState("");
  const [lastSelected, setLastSelected] = React.useState<string | null>(null);

  function select(item: DemoCommand): void {
    setLastSelected(item.label);
    onSelectItem?.(item.id);
  }

  return (
    <div className="flex w-[420px] flex-col gap-3">
      <Command className={className ?? FRAME} label="Command palette">
        <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
        <LiveResults search={search} />
        <CommandList className="h-[300px] max-h-[300px]">
          {/* The list keeps a fixed height in every state so the frame does not
              resize as the result set narrows under the cursor. The empty/
              loading/error content is therefore centred in that box rather than
              pinned to the top, which would leave a 250px void beneath it.

              Centring has to happen on an inner element: `CommandEmpty` sets
              `className="py-6 text-center text-sm"` and spreads props *after*
              it, so a caller className replaces the primitive's instead of
              merging — the only wrapper in this file that does not use `cn`. */}
          <CommandEmpty>
            {status === "loading" ? (
              <span className="flex min-h-[244px] items-center justify-center gap-2 text-muted-foreground">
                <Spinner size="sm" />
                Loading commands…
              </span>
            ) : status === "error" ? (
              <span className="flex min-h-[244px] flex-col items-center justify-center gap-1">
                <span className="font-medium text-destructive">Commands could not be loaded</span>
                <span className="text-muted-foreground">Check your connection and try again</span>
              </span>
            ) : (
              <span className="flex min-h-[244px] flex-col items-center justify-center gap-1">
                <span className="font-medium text-foreground">Nothing matches that</span>
                <span className="text-muted-foreground">Try a shorter search</span>
              </span>
            )}
          </CommandEmpty>

          {byGroup(items).map(([group, groupItems], groupIndex) => (
            <React.Fragment key={group}>
              {groupIndex > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    keywords={[item.label, item.group, ...(item.keywords ?? [])]}
                    {...(item.disabled ? { disabled: true } : {})}
                    onSelect={() => select(item)}
                  >
                    {item.icon ? (
                      <span className="mr-2 shrink-0 text-muted-foreground">{item.icon}</span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.meta ? (
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {item.meta}
                      </span>
                    ) : null}
                    {item.shortcut ? (
                      <CommandShortcut keys={item.shortcut} label={`${item.label} shortcut`} />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </Command>

      <p className="text-xs text-muted-foreground" data-testid="last-selected">
        {lastSelected ? `Ran: ${lastSelected}` : "Nothing run yet"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => <CommandFixture />,
};

/**
 * Every sub-part in one frame: input, live region, groups with headings,
 * separator between groups, icons, secondary meta, `Kbd`-rendered shortcuts, a
 * disabled row, an over-long label, and the scroll case.
 */
export const AllVariants: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      <Labelled title="Grouped, with shortcuts">
        <CommandFixture />
      </Labelled>
      <Labelled title="Edge cases — overflow, disabled, meta">
        <CommandFixture items={edgeCaseCommands} placeholder="Search admin actions…" />
      </Labelled>
      <Labelled title="Overflow — 40 rows in a 300px viewport">
        <CommandFixture items={manyCommands} placeholder="Search workers…" />
      </Labelled>
      <Labelled title="No results">
        <CommandFixture items={[]} />
      </Labelled>
      <Labelled title="Loading">
        <CommandFixture items={[]} status="loading" />
      </Labelled>
      <Labelled title="Error">
        <CommandFixture items={[]} status="error" />
      </Labelled>
    </div>
  ),
};

function Labelled({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Empty because the data set is empty — the first-run case, not a failed search. */
export const EmptyState: Story = {
  render: () => <CommandFixture items={[]} placeholder="Search projects…" />,
};

export const LoadingState: Story = {
  render: () => <CommandFixture items={[]} status="loading" />,
};

export const ErrorState: Story = {
  render: () => <CommandFixture items={[]} status="error" />,
};

/**
 * 40 rows against `CommandList`'s `max-h-[300px]`. The group headings scroll
 * with the rows — cmdk has no sticky-heading behaviour, and pretending
 * otherwise in a story would hide it.
 */
export const Overflow: Story = {
  render: () => <CommandFixture items={manyCommands} placeholder="Search workers…" />,
};

/** A label wider than the 420px frame, plus a disabled row and secondary meta. */
export const LongContent: Story = {
  render: () => <CommandFixture items={edgeCaseCommands} placeholder="Search admin actions…" />,
};

/** The same palette inside `CommandDialog` — focus trap, Escape, and the ⌘K entry point. */
export const InDialog: Story = {
  render: function InDialogStory() {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          setOpen((prev) => !prev);
        }
      }
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
      <div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open palette</Button>
        <p className="text-xs text-muted-foreground">…or press ⌘K</p>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command…" />
          <CommandList>
            <CommandEmpty>Nothing matches that</CommandEmpty>
            {byGroup(commands).map(([group, groupItems], groupIndex) => (
              <React.Fragment key={group}>
                {groupIndex > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group}>
                  {groupItems.map((item) => (
                    <CommandItem key={item.id} value={item.id} onSelect={() => setOpen(false)}>
                      {item.icon ? (
                        <span className="mr-2 shrink-0 text-muted-foreground">{item.icon}</span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.shortcut ? (
                        <CommandShortcut keys={item.shortcut} label={`${item.label} shortcut`} />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </CommandDialog>
      </div>
    );
  },
};

/**
 * The keyboard contract, asserted. ArrowDown moves `aria-selected` down the
 * flattened list across group boundaries, ArrowUp moves back, and Enter runs
 * the selected item — none of which this wrapper implements, which is exactly
 * why it needs a test rather than a claim.
 */
export const Keyboard: Story = {
  render: () => <CommandFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText("Search commands…");

    await userEvent.click(input);

    const options = canvas.getAllByRole("option");
    // cmdk selects the first enabled item on mount.
    await expect(options[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(canvas.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true"),
    );

    // Third item is in the *next* group — selection is flat, not per-group.
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Invite team member/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Open workspace/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByTestId("last-selected")).toHaveTextContent("Ran: Open workspace"),
    );
  },
};

/**
 * Typing narrows by `value` *and* `keywords` — "repo" is a keyword on "Search
 * projects" and appears nowhere in its label. Then a query that matches nothing
 * must surface `CommandEmpty` rather than an empty box, and the live region must
 * announce zero.
 */
export const FilterNarrowsToNoResults: Story = {
  render: () => <CommandFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText("Search commands…");

    await userEvent.click(input);
    await expect(canvas.getAllByRole("option")).toHaveLength(5);

    // "repo" appears in no label — only in the `keywords` of "Search projects".
    // cmdk's default filter is command-score, which is fuzzy and subsequence-
    // based rather than substring, so the narrowed set is asserted by membership
    // and by shrinking, NOT by an exact count: a scoring-threshold change in
    // cmdk would move the count without being a defect, and pinning it would
    // make this story fail for the wrong reason.
    await userEvent.type(input, "repo");
    await waitFor(() => expect(canvas.getAllByRole("option").length).toBeLessThan(5));
    await expect(canvas.getByRole("option", { name: /Search projects/ })).toBeInTheDocument();
    await expect(canvas.queryByRole("option", { name: /Preferences/ })).toBeNull();

    await userEvent.clear(input);
    await userEvent.type(input, "zzzz");
    await waitFor(() => expect(canvas.queryAllByRole("option")).toHaveLength(0));
    await expect(canvas.getByText("Nothing matches that")).toBeInTheDocument();
    await expect(canvas.getByText("0 command results available for zzzz.")).toBeInTheDocument();
  },
};

/**
 * A disabled item must be visible, dimmed, and *unreachable* by ArrowDown —
 * the one behaviour hand-rolled palettes routinely get wrong.
 */
export const DisabledItemIsSkipped: Story = {
  render: () => <CommandFixture items={edgeCaseCommands} placeholder="Search admin actions…" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByPlaceholderText("Search admin actions…"));

    const disabled = canvas.getByRole("option", { name: /Rotate production secrets/ });
    await expect(disabled).toHaveAttribute("aria-disabled", "true");

    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Retry failed webhook delivery/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    await expect(disabled).not.toHaveAttribute("aria-selected", "true");
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <CommandFixture className="w-full rounded-[var(--radius-md)] border border-border" />
  ),
};

export const DarkMode: Story = {
  parameters: { layout: "padded" },
  decorators: [
    (StoryFn) => (
      <div className="dark flex justify-center bg-background p-8 text-foreground">
        <StoryFn />
      </div>
    ),
  ],
  render: () => <CommandFixture />,
};
