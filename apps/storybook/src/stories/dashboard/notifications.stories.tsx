/**
 * Stories for the notification inbox surfaces.
 *
 * `InboxBell` polls `/api/notifications/inbox` on mount; we pass an in-memory
 * `fetcher` shim so stories never hit the network. `InboxList` is a pure
 * presentational component and only needs an array of items.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { InboxBell } from "../../../../web/src/components/notifications/inbox-bell";
import {
  InboxEmptyState,
  InboxList,
  InboxListSkeleton,
  type InboxNotification,
} from "../../../../web/src/components/notifications/inbox-list";

const FIXTURE_ITEMS: InboxNotification[] = [
  {
    id: "ntf_01",
    type: "billing.invoice.paid",
    title: "Invoice paid",
    body: "Your November invoice for $99.00 has been paid.",
    createdAt: "2026-05-16T06:55:00.000Z",
    readAt: null,
    read: false,
    channel: "in_app",
    data: { href: "/billing" },
  },
  {
    id: "ntf_02",
    type: "system.error",
    title: "Build failed",
    body: "Worker pipeline #482 exited with code 1.",
    createdAt: "2026-05-16T05:00:00.000Z",
    readAt: null,
    read: false,
    channel: "in_app",
    data: null,
  },
  {
    id: "ntf_03",
    type: "security.session",
    title: "New sign-in from Tokyo",
    body: "We detected a sign-in from a new location.",
    createdAt: "2026-05-15T05:00:00.000Z",
    readAt: "2026-05-15T07:00:00.000Z",
    read: true,
    channel: "in_app",
    data: { href: "/settings/security" },
  },
];

const meta: Meta<typeof InboxList> = {
  title: "Dashboard/Notifications/Inbox",
  component: InboxList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "List of in-app notifications with mark-as-read and archive actions. The compact variant powers the header bell; the full variant powers the dedicated /notifications page.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof InboxList>;

export const CompactDefault: Story = {
  name: "List/Compact",
  args: {
    notifications: FIXTURE_ITEMS,
    variant: "compact",
    onMarkRead: () => undefined,
  },
};

export const FullWithArchive: Story = {
  name: "List/Full",
  args: {
    notifications: FIXTURE_ITEMS,
    variant: "full",
    onMarkRead: () => undefined,
    onArchive: () => undefined,
    selectable: true,
    selectedIds: new Set<string>([FIXTURE_ITEMS[0]?.id].filter((id): id is string => Boolean(id))),
    onToggleSelect: () => undefined,
  },
};

export const Loading: Story = {
  args: {
    notifications: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
    loading: false,
    emptyMessage: "You're all caught up.",
  },
};

export const SkeletonStandalone: StoryObj<typeof InboxListSkeleton> = {
  name: "Skeleton",
  render: () => <InboxListSkeleton count={4} />,
};

export const EmptyStandalone: StoryObj<typeof InboxEmptyState> = {
  name: "EmptyState",
  render: () => <InboxEmptyState message="No notifications yet — relax for a bit." />,
};

/**
 * Bell component with an injected in-memory fetcher. The fetcher returns
 * either a populated payload, an empty inbox, or a delayed response so the
 * loading state is visible.
 */
function makeFetcher(items: InboxNotification[], delayMs = 0): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (url.includes("/inbox")) {
      const unread = items.filter((item) => !item.read).length;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            notifications: items,
            unreadCount: unread,
            total: items.length,
            nextCursor: null,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
}

export const BellWithUnread: StoryObj<typeof InboxBell> = {
  name: "Bell/Unread",
  render: () => (
    <div className="flex h-32 items-start justify-end p-6">
      <InboxBell fetcher={makeFetcher(FIXTURE_ITEMS)} />
    </div>
  ),
};

export const BellEmpty: StoryObj<typeof InboxBell> = {
  name: "Bell/Empty",
  render: () => (
    <div className="flex h-32 items-start justify-end p-6">
      <InboxBell fetcher={makeFetcher([])} />
    </div>
  ),
};
