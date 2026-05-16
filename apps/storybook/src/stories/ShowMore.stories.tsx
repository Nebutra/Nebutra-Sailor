import { ShowMore } from "@nebutra/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

const meta: Meta<typeof ShowMore> = {
  title: "Primitives/ShowMore",
  component: ShowMore,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Count-aware progressive disclosure trigger for one long list or content block. Use Collapse for optional sections and Pagination for sibling pages.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ShowMore>;

const items = [
  "Build queued",
  "Dependencies installed",
  "Typecheck completed",
  "Unit tests completed",
  "Preview deployed",
  "Synthetic check started",
  "Synthetic check passed",
  "Release promoted",
] as const;

function ActivityList({
  defaultExpanded = false,
  hiddenCountLabel = true,
  noBorder = false,
}: {
  defaultExpanded?: boolean;
  hiddenCountLabel?: boolean;
  noBorder?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const listId = React.useId();
  const visibleItems = expanded ? items : items.slice(0, 5);
  const hiddenCount = items.length - visibleItems.length;
  const firstRevealedRef = React.useRef<HTMLLIElement>(null);

  return (
    <div className="w-full max-w-xl space-y-3 rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-4">
      <ul id={listId} className="space-y-2">
        {visibleItems.map((item, index) => (
          <li
            key={item}
            ref={index === 5 ? firstRevealedRef : undefined}
            tabIndex={index === 5 ? -1 : undefined}
            className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-3 py-2 text-[var(--neutral-12)] text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item}
          </li>
        ))}
      </ul>

      {(expanded || hiddenCount > 0) && (
        <ShowMore
          controls={listId}
          expanded={expanded}
          focusTargetRef={firstRevealedRef}
          hiddenCount={hiddenCountLabel ? hiddenCount : undefined}
          noBorder={noBorder}
          onExpandedChange={setExpanded}
        />
      )}
    </div>
  );
}

export const Default: Story = {
  render: () => <ActivityList />,
};

export const WithHiddenCount: Story = {
  render: () => <ActivityList hiddenCountLabel />,
};

export const NoBorder: Story = {
  render: () => <ActivityList noBorder />,
};

export const Expanded: Story = {
  render: () => <ActivityList defaultExpanded />,
};

export const EdgeCases: Story = {
  render: () => (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <ActivityList hiddenCountLabel={false} />
      <ShowMore
        controls="show-more-disabled-list"
        disabled
        expanded={false}
        hiddenCount={12}
        onExpandedChange={() => undefined}
      />
      <div id="show-more-disabled-list" hidden />
    </div>
  ),
};
