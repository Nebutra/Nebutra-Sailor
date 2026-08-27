import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import { Button } from "./button";
import { DataList, type DataListColumn, type DataListProps } from "./data-list";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Endpoint {
  id: string;
  url: string;
  event: string;
  state: "active" | "paused" | "failing";
  deliveries: number;
  lastDelivery: string;
}

const endpoints: Endpoint[] = [
  {
    id: "wh_01",
    url: "https://hooks.acme.io/billing",
    event: "invoice.paid",
    state: "active",
    deliveries: 18420,
    lastDelivery: "2m ago",
  },
  {
    id: "wh_02",
    url: "https://hooks.acme.io/provisioning",
    event: "subscription.created",
    state: "active",
    deliveries: 9317,
    lastDelivery: "11m ago",
  },
  {
    id: "wh_03",
    url: "https://ops.internal.acme.io/audit-sink",
    event: "member.invited",
    state: "paused",
    deliveries: 1204,
    lastDelivery: "3d ago",
  },
  {
    id: "wh_04",
    url: "https://hooks.partner.example.com/v2/ingest",
    event: "usage.reported",
    state: "failing",
    deliveries: 662,
    lastDelivery: "44m ago",
  },
  {
    id: "wh_05",
    url: "https://hooks.acme.io/receipts",
    event: "payment.refunded",
    state: "active",
    deliveries: 311,
    lastDelivery: "1h ago",
  },
];

function StateBadge({ state }: { state: Endpoint["state"] }) {
  if (state === "active") {
    return (
      <Badge size="sm" variant="green-subtle">
        Active
      </Badge>
    );
  }
  if (state === "failing") {
    return (
      <Badge size="sm" variant="red-subtle">
        Failing
      </Badge>
    );
  }
  // amber-subtle is `bg-warning/15 text-warning`, and --warning is the 2.13:1
  // fill. Amber text needs the 5.40:1 --warning-strong step to clear AA.
  return (
    <Badge size="sm" variant="amber-subtle" className="text-[hsl(var(--warning-strong))]">
      Paused
    </Badge>
  );
}

const columns: DataListColumn<Endpoint>[] = [
  {
    id: "url",
    header: "Endpoint",
    cell: (row) => <span className="truncate font-medium text-foreground">{row.url}</span>,
    loadingWidth: "80%",
  },
  {
    id: "event",
    header: "Event",
    cell: (row) => <span className="text-muted-foreground">{row.event}</span>,
  },
  {
    id: "state",
    header: "State",
    align: "center",
    cell: (row) => <StateBadge state={row.state} />,
    loadingWidth: 56,
  },
  {
    id: "deliveries",
    header: "Deliveries",
    align: "end",
    numeric: true,
    cell: (row) => row.deliveries.toLocaleString("en-US"),
    loadingWidth: 48,
  },
  {
    id: "last",
    header: "Last delivery",
    align: "end",
    cell: (row) => <span className="text-muted-foreground">{row.lastDelivery}</span>,
    loadingWidth: 44,
  },
];

const getRowKey = (row: Endpoint) => row.id;

function Pager({ page, pages }: { page: number; pages: number }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{`Page ${page} of ${pages}`}</span>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={page === 1}>
          Previous
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={page === pages}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

// DataList is generic; bind it to the fixture row type so the story args stay
// typed instead of collapsing to `unknown`.
const meta: Meta<DataListProps<Endpoint>> = {
  title: "Primitives/DataList",
  component: DataList<Endpoint>,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The shared list surface. Owns state precedence (error > loading > empty > rows), a reserved body floor applied to every non-row state so transitions never jump, a refresh mode that keeps mounted rows mounted, and contained horizontal overflow.",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<DataListProps<Endpoint>>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Idle: Story = {
  args: {
    columns,
    rows: endpoints,
    getRowKey,
    label: "Webhook endpoints",
    striped: true,
    pagination: <Pager page={1} pages={4} />,
  },
};

export const Loading: Story = {
  args: {
    ...Idle.args,
    rows: [],
    status: "loading",
  },
};

export const Empty: Story = {
  args: {
    ...Idle.args,
    rows: [],
    emptyTitle: "No endpoints yet",
    emptyDescription: "Point one at your service and every matching event lands there.",
    emptyAction: (
      <Button type="button" size="sm">
        Add endpoint
      </Button>
    ),
  },
};

export const ErrorState: Story = {
  args: {
    ...Idle.args,
    rows: [],
    error: "The delivery log did not respond. The endpoints themselves are unaffected.",
    errorTitle: "Could not load endpoints",
    onRetry: () => undefined,
  },
};

/**
 * A background refetch. The rows stay mounted — nothing unmounts, nothing
 * reflows — which is what optimistic mutation screens rely on.
 */
export const Refreshing: Story = {
  args: {
    ...Idle.args,
    isRefreshing: true,
  },
};

/**
 * The three reserved-floor states side by side. Each body measures
 * `minBodyRows * rowHeight`, so switching between them moves nothing.
 */
export const ReservedFloorComparison: Story = {
  args: { ...Idle.args },
  render: (args) => (
    <div className="space-y-8">
      <DataList {...args} rows={endpoints.slice(0, 5)} pagination={undefined} />
      <DataList {...args} rows={[]} status="loading" pagination={undefined} />
      <DataList {...args} rows={[]} pagination={undefined} emptyTitle="No endpoints yet" />
      <DataList
        {...args}
        rows={[]}
        pagination={undefined}
        error="The delivery log did not respond."
      />
    </div>
  ),
};

/**
 * More columns than fit. The scroll container clips and scrolls horizontally;
 * the surrounding 320px frame does not grow and the page does not scroll.
 */
export const Overflow: Story = {
  args: {
    ...Idle.args,
    columns: [
      ...columns,
      { id: "secret", header: "Signing secret", cell: () => "whsec_9f2c…a41b" },
      { id: "version", header: "API version", cell: () => "2026-04-01" },
      { id: "region", header: "Region", cell: () => "eu-central-1" },
      { id: "retries", header: "Retry policy", cell: () => "exponential, 8 attempts" },
      { id: "owner", header: "Owner", cell: () => "platform@acme.io" },
      { id: "created", header: "Created", align: "end", cell: () => "2025-11-02" },
    ],
  },
  render: (args) => (
    <div className="w-[320px] rounded-[var(--radius-lg)] bg-muted/20 p-4">
      <DataList {...args} />
    </div>
  ),
};

/** A cell whose content is far longer than its column. */
export const LongCellContent: Story = {
  args: {
    ...Idle.args,
    rows: [
      {
        id: "wh_long",
        url: "https://extremely-long-subdomain.integration-partner.example.com/v3/webhooks/tenant/8f2c41ba-77de-4a19-9c11-0b3d5e7a6f20/ingest?signature=verified",
        event: "invoice.payment_action_required",
        state: "failing",
        deliveries: 1284093,
        lastDelivery: "just now",
      },
      ...endpoints.slice(0, 3),
    ],
  },
  render: (args) => (
    <div className="max-w-[720px]">
      <DataList {...args} />
    </div>
  ),
};
