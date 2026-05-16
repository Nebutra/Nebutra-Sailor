/**
 * Stories for the Webhooks dashboard surfaces.
 *
 * Both components are pure React. The list component performs an internal
 * fetch when `initialEndpoints` is omitted — we always pass a fixture so
 * stories never make real network calls.
 */
import type { Meta, StoryObj } from "@storybook/react";
import {
  CreateWebhookDialog,
  type CreateWebhookResult,
} from "../../../../web/src/components/webhooks/create-webhook-dialog";
import {
  type WebhookEndpointView,
  WebhooksList,
} from "../../../../web/src/components/webhooks/webhooks-list";

const FIXTURE_ENDPOINTS: WebhookEndpointView[] = [
  {
    id: "wh_01",
    url: "https://api.example.com/webhooks/nebutra",
    events: ["invoice.paid", "invoice.failed", "subscription.updated"],
    isActive: true,
    signingSecretMasked: "whsec_***************************4f2a",
    createdAt: "2025-09-12T09:32:00Z",
    lastDeliveredAt: "2025-09-12T10:04:00Z",
  },
  {
    id: "wh_02",
    url: "https://hooks.staging.example.com/nebutra",
    events: ["user.created", "user.deleted"],
    isActive: false,
    signingSecretMasked: "whsec_***************************91ef",
    createdAt: "2025-10-03T16:00:00Z",
    lastDeliveredAt: null,
  },
];

const meta: Meta<typeof WebhooksList> = {
  title: "Dashboard/Webhooks/List",
  component: WebhooksList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Webhook endpoints with toggle, edit, delete, and view-deliveries actions. Pass `initialEndpoints` to avoid network fetches.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof WebhooksList>;

export const Default: Story = {
  args: {
    initialEndpoints: FIXTURE_ENDPOINTS,
    onToggleActive: async () => undefined,
    onDelete: async () => undefined,
    onEdit: () => undefined,
    onViewDeliveries: () => undefined,
  },
};

export const Empty: Story = {
  args: {
    initialEndpoints: [],
  },
};

export const ReadOnly: Story = {
  name: "Default/ReadOnly",
  args: {
    initialEndpoints: FIXTURE_ENDPOINTS,
  },
};

export const CreateDialog: StoryObj<typeof CreateWebhookDialog> = {
  name: "Dialog/Default",
  render: () => (
    <div className="mx-auto max-w-xl rounded-xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <CreateWebhookDialog
        onSubmit={async ({ url, events }) => {
          await new Promise((resolve) => setTimeout(resolve, 400));
          const result: CreateWebhookResult = {
            endpoint: {
              id: "wh_new",
              url,
              events,
              isActive: true,
              signingSecretMasked: "whsec_***************************demo",
              createdAt: "2025-10-20T08:00:00Z",
              lastDeliveredAt: null,
            },
            signingSecret: "whsec_demo_signing_secret_value_replace_in_real_use",
          };
          return result;
        }}
      />
    </div>
  ),
};
