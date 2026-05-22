"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useRef, useState } from "react";
import { ShowMore } from "./show-more";

const meta = {
  title: "Primitives/ShowMore",
  component: ShowMore,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Count-aware progressive disclosure trigger for long lists and content blocks.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ShowMore>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = [
  "Production deploy completed",
  "Billing sync finished",
  "Audit export queued",
  "Invite accepted by Lena",
  "Webhook delivery retried",
  "New API key created",
  "Policy rule updated",
  "Usage threshold reached",
] as const;

function ShowMoreFixture({ noBorder = false }: { noBorder?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const firstRevealedRef = useRef<HTMLLIElement>(null);
  const visibleItems = expanded ? items : items.slice(0, 5);

  return (
    <div className="w-96 rounded-lg border bg-card p-4">
      <ul id="storybook-show-more-list" className="grid gap-2 text-sm">
        {visibleItems.map((item, index) => (
          <li
            key={item}
            ref={index === 5 ? firstRevealedRef : undefined}
            tabIndex={index === 5 ? -1 : undefined}
            className="rounded-md border bg-background px-3 py-2"
          >
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <ShowMore
          controls="storybook-show-more-list"
          expanded={expanded}
          focusTargetRef={firstRevealedRef}
          hiddenCount={items.length - visibleItems.length}
          noBorder={noBorder}
          onExpandedChange={setExpanded}
        />
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <ShowMoreFixture />,
};

export const NoBorder: Story = {
  render: () => <ShowMoreFixture noBorder />,
};
