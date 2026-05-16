import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import {
  MultiSelectContent,
  MultiSelectRoot,
  MultiSelectRow,
  MultiSelectTrigger,
} from "./multi-select";

const meta = {
  title: "Primitives/MultiSelect",
  component: MultiSelectRoot,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Keyboard-navigable multi-select menu with distinct checkbox and smart row-action focus.",
      },
    },
  },
  args: {
    children: null,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MultiSelectRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

type DemoItem = {
  id: string;
  name: string;
  description: string;
  count: number;
};

const scopeItems: DemoItem[] = [
  { id: "analytics", name: "Analytics", description: "Metrics, cohorts, exports", count: 24 },
  { id: "monitoring", name: "Monitoring", description: "Incidents and traces", count: 18 },
  { id: "security", name: "Security", description: "Audit logs and policies", count: 12 },
  { id: "performance", name: "Performance", description: "Budgets and regressions", count: 9 },
];

const longItems: DemoItem[] = [
  {
    id: "north-america-enterprise",
    name: "North America Enterprise Revenue Operations",
    description: "Long labels remain scannable without stretching the menu",
    count: 128,
  },
  {
    id: "europe-platform",
    name: "Europe Platform Reliability and Incident Response",
    description: "Description text truncates after one line",
    count: 44,
  },
  {
    id: "apac-growth",
    name: "APAC Growth Experiments",
    description: "Campaign and funnel analysis",
    count: 31,
  },
];

function getTriggerLabel(selected: Set<string>, total: number, emptyLabel: string, noun: string) {
  if (selected.size === 0) return emptyLabel;
  if (selected.size === total) return `All ${noun} selected`;
  if (selected.size === 1) return `1 ${noun.slice(0, -1)} selected`;
  return `${selected.size} ${noun} selected`;
}

function MultiSelectExample({
  items = scopeItems,
  initialSelected = ["analytics", "monitoring"],
  emptyLabel = "No scopes selected",
  noun = "scopes",
}: {
  items?: DemoItem[];
  initialSelected?: string[];
  emptyLabel?: string;
  noun?: string;
}) {
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(
    () => new Set(initialSelected),
  );

  const toggleItem = (id: string) => {
    setSelectedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOnly = (id: string) => setSelectedItems(new Set([id]));
  const selectAll = () => setSelectedItems(new Set(items.map((item) => item.id)));

  return (
    <div className="flex w-[var(--multi-select-story-width)] flex-col gap-3 [--multi-select-story-width:360px]">
      <MultiSelectRoot>
        <MultiSelectTrigger aria-label="Selected scopes">
          {getTriggerLabel(selectedItems, items.length, emptyLabel, noun)}
        </MultiSelectTrigger>
        <MultiSelectContent>
          {items.map((item) => (
            <MultiSelectRow
              key={item.id}
              name={item.name}
              description={item.description}
              count={item.count}
              checked={selectedItems.has(item.id)}
              onChange={() => toggleItem(item.id)}
              onSelectOnly={() => selectOnly(item.id)}
              onSelectAll={selectAll}
              selectedCount={selectedItems.size}
              totalCount={items.length}
            />
          ))}
        </MultiSelectContent>
      </MultiSelectRoot>
      <p className="text-sm text-muted-foreground">
        Use Up and Down to move rows, Left and Right to switch between checkbox and action.
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <MultiSelectExample />,
};

export const SelectActions: Story = {
  render: () => <MultiSelectExample initialSelected={["analytics", "monitoring", "security"]} />,
};

export const ControlledState: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<Set<string>>(() => new Set(["security"]));
    const selectPreset = (ids: string[]) => setSelected(new Set(ids));
    const toggleItem = (id: string) => {
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    return (
      <div className="flex w-[var(--multi-select-story-width)] flex-col gap-3 [--multi-select-story-width:360px]">
        <MultiSelectRoot>
          <MultiSelectTrigger aria-label="Selected feature groups">
            {getTriggerLabel(selected, scopeItems.length, "No feature groups selected", "groups")}
          </MultiSelectTrigger>
          <MultiSelectContent>
            {scopeItems.map((item) => (
              <MultiSelectRow
                key={item.id}
                name={item.name}
                description={item.description}
                count={item.count}
                checked={selected.has(item.id)}
                onChange={() => toggleItem(item.id)}
                onSelectOnly={() => selectPreset([item.id])}
                onSelectAll={() => selectPreset(scopeItems.map((scope) => scope.id))}
                selectedCount={selected.size}
                totalCount={scopeItems.length}
              />
            ))}
          </MultiSelectContent>
        </MultiSelectRoot>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm text-foreground transition-colors duration-micro hover:bg-accent"
            onClick={() => selectPreset([])}
          >
            Clear All
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm text-foreground transition-colors duration-micro hover:bg-accent"
            onClick={() => selectPreset(["analytics", "monitoring"])}
          >
            Core Features
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm text-foreground transition-colors duration-micro hover:bg-accent"
            onClick={() => selectPreset(["security", "performance"])}
          >
            Advanced Features
          </button>
        </div>
      </div>
    );
  },
};

export const LongLabels: Story = {
  render: () => (
    <MultiSelectExample
      items={longItems}
      initialSelected={["north-america-enterprise"]}
      emptyLabel="No segments selected"
      noun="segments"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="w-[var(--multi-select-story-width)] [--multi-select-story-width:360px]">
      <MultiSelectRoot defaultOpen>
        <MultiSelectTrigger aria-label="Selected scopes">No scopes selected</MultiSelectTrigger>
        <MultiSelectContent>
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No scopes match current filters.
          </div>
        </MultiSelectContent>
      </MultiSelectRoot>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-[var(--multi-select-story-width)] [--multi-select-story-width:360px]">
      <MultiSelectRoot defaultOpen>
        <MultiSelectTrigger aria-label="Selected scopes">Loading scopes</MultiSelectTrigger>
        <MultiSelectContent aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="m-1 h-9 animate-pulse rounded-[var(--radius-md)] bg-muted"
            />
          ))}
        </MultiSelectContent>
      </MultiSelectRoot>
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-[var(--multi-select-story-width)] [--multi-select-story-width:360px]">
      <MultiSelectRoot defaultOpen>
        <MultiSelectTrigger aria-label="Selected scopes">Scopes unavailable</MultiSelectTrigger>
        <MultiSelectContent>
          <div className="px-3 py-6 text-center text-sm text-destructive">
            Could not load scopes. Retry from the parent filter.
          </div>
        </MultiSelectContent>
      </MultiSelectRoot>
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6">
      <MultiSelectExample />
    </div>
  ),
};
