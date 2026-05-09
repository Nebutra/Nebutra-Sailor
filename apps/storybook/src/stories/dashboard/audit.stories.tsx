/**
 * Stories for the Audit Log dashboard surfaces.
 *
 * Both components consume `next-intl`'s `useTranslations`. We wrap each story
 * in a `NextIntlClientProvider` decorator with curated message fixtures (see
 * `_shared.tsx`) so they render without a Next.js runtime.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { AuditLogFilters } from "../../../../web/src/components/audit/audit-log-filters";
import {
  type AuditLogEntry,
  AuditLogTable,
} from "../../../../web/src/components/audit/audit-log-table";
import { withIntl } from "./_shared";

const FIXTURE_LOGS: AuditLogEntry[] = [
  {
    id: "log_01",
    organizationId: "org_demo",
    userId: "usr_alice",
    actorType: "user",
    action: "user.login",
    outcome: "success",
    reason: null,
    entityType: "session",
    entityId: "sess_91",
    oldValue: null,
    newValue: { provider: "credentials" },
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0",
    metadata: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    id: "log_02",
    organizationId: "org_demo",
    userId: "usr_bob",
    actorType: "user",
    action: "api_key.revoke",
    outcome: "success",
    reason: "rotation",
    entityType: "api_key",
    entityId: "key_42",
    oldValue: { active: true },
    newValue: { active: false },
    ipAddress: "203.0.113.10",
    userAgent: "curl/8.4",
    metadata: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "log_03",
    organizationId: "org_demo",
    userId: null,
    actorType: "system",
    action: "billing.invoice.failed",
    outcome: "failure",
    reason: "card_declined",
    entityType: "billing",
    entityId: "in_999",
    oldValue: { status: "open" },
    newValue: { status: "failed" },
    ipAddress: null,
    userAgent: null,
    metadata: { stripeCode: "card_declined" },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

const meta: Meta<typeof AuditLogTable> = {
  title: "Dashboard/Audit/Table",
  component: AuditLogTable,
  tags: ["autodocs"],
  decorators: [(Story) => withIntl(<Story />)],
  parameters: {
    docs: {
      description: {
        component:
          "Tabular audit log with expandable diff rows and outcome pills. Loading and empty states are exercised by the dedicated stories below.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof AuditLogTable>;

export const Default: Story = {
  args: { logs: FIXTURE_LOGS, isLoading: false },
};

export const Loading: Story = {
  args: { logs: [], isLoading: true },
};

export const Empty: Story = {
  args: { logs: [], isLoading: false },
};

export const Filters: StoryObj<typeof AuditLogFilters> = {
  name: "Filters/Default",
  render: () => withIntl(<AuditLogFilters onChange={() => undefined} />),
};
