/**
 * Stories for the API Keys dashboard surfaces.
 *
 * Components are imported via relative paths from `apps/web` because storybook
 * does not register a path alias to that workspace. Heavy runtime mocks (auth,
 * permissions) are not required here — both components are pure React.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { type ApiKey, ApiKeysList } from "../../../../web/src/components/api-keys/api-keys-list";
import {
  CreateApiKeyDialog,
  type CreatedApiKey,
} from "../../../../web/src/components/api-keys/create-api-key-dialog";

const CREATED_KEY: CreatedApiKey = {
  id: "key_new",
  name: "Demo key",
  key: "nbtr_live_demo_secret_value_do_not_use_in_production",
  keyPrefix: "nbtr_live_demo",
  scopes: ["read"],
  rateLimitRps: 100,
  expiresAt: null,
  lastUsedAt: null,
  createdAt: "2026-01-15T12:00:00Z",
};

const PRODUCTION_KEY: ApiKey = {
  id: "key_01",
  name: "Production backend",
  keyPrefix: "nbtr_live_8af2",
  lastUsedAt: "2026-01-15T09:00:00Z",
  scopes: ["read", "write"],
  rateLimitRps: 100,
  expiresAt: null,
  createdAt: "2025-09-01T10:00:00Z",
};

const FIXTURE_KEYS: ApiKey[] = [
  PRODUCTION_KEY,
  {
    id: "key_02",
    name: "Staging deploy bot",
    keyPrefix: "nbtr_test_18d9",
    lastUsedAt: null,
    scopes: ["read"],
    rateLimitRps: 25,
    expiresAt: null,
    createdAt: new Date("2025-11-12T08:30:00Z").toISOString(),
  },
  {
    id: "key_03",
    name: "Analytics pipeline",
    keyPrefix: "nbtr_live_f31a",
    lastUsedAt: "2026-01-08T12:00:00Z",
    scopes: ["read", "admin"],
    rateLimitRps: 50,
    expiresAt: "2026-12-01T00:00:00Z",
    createdAt: new Date("2024-06-15T14:00:00Z").toISOString(),
  },
];

const meta: Meta<typeof ApiKeysList> = {
  title: "Dashboard/ApiKeys/List",
  component: ApiKeysList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "List of provisioned API keys with revoke action. Renders an empty-state CTA when no keys exist.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ApiKeysList>;

export const Default: Story = {
  args: {
    keys: FIXTURE_KEYS,
    onCreate: () => undefined,
    onRevoke: async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    },
  },
};

export const Empty: Story = {
  args: {
    keys: [],
    onCreate: () => undefined,
    onRevoke: async () => undefined,
  },
};

export const Single: Story = {
  args: {
    keys: [PRODUCTION_KEY],
    onCreate: () => undefined,
    onRevoke: async () => undefined,
  },
};

function CreateDialogClosedDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-4 py-2 text-[color:var(--neutral-1)] text-sm font-medium"
        style={{ background: "var(--brand-gradient)" }}
      >
        Open create-key dialog
      </button>
      <CreateApiKeyDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={async (input) => ({
          ...CREATED_KEY,
          name: input.name,
          scopes: input.scopes,
        })}
      />
    </div>
  );
}

export const CreateDialogClosed: StoryObj<typeof CreateApiKeyDialog> = {
  name: "Dialog/Closed",
  render: () => <CreateDialogClosedDemo />,
};

function CreateDialogOpenDemo() {
  const [open, setOpen] = useState(true);

  return (
    <CreateApiKeyDialog
      open={open}
      onOpenChange={setOpen}
      onCreate={async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        return CREATED_KEY;
      }}
    />
  );
}

export const CreateDialogOpen: StoryObj<typeof CreateApiKeyDialog> = {
  name: "Dialog/Open",
  render: () => <CreateDialogOpenDemo />,
};
