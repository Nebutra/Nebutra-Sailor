/**
 * Stories for the account-management surfaces.
 *
 * Both components consume `next-intl`'s `useTranslations` and accept callable
 * overrides for their network operations. We pass in-memory mocks so stories
 * never hit the real `/api/account/*` endpoints.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { DataExportCard } from "../../../../web/src/components/account/data-export-card";
import { EmailChangeForm } from "../../../../web/src/components/account/email-change-form";
import { withIntl } from "./_shared";

const meta: Meta<typeof DataExportCard> = {
  title: "Dashboard/Account/DataExport",
  component: DataExportCard,
  tags: ["autodocs"],
  decorators: [(Story) => withIntl(<Story />)],
  parameters: {
    docs: {
      description: {
        component:
          "GDPR / PIPL data export card. Click the button to start an export — the inline mock resolves immediately with a sample JSON payload.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DataExportCard>;

export const Default: Story = {
  args: {
    startExport: async () => ({
      exportId: "exp_demo_01",
      status: "ready" as const,
    }),
    fetchExport: async () => ({
      exportId: "exp_demo_01",
      status: "ready" as const,
      inline: true,
      data: { profile: { email: "demo@nebutra.com" }, audit: [] },
    }),
  },
};

export const Pending: Story = {
  args: {
    startExport: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { exportId: "exp_demo_02", status: "pending" as const };
    },
    fetchExport: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        exportId: "exp_demo_02",
        status: "ready" as const,
        inline: true,
        data: { profile: { email: "demo@nebutra.com" } },
      };
    },
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: {
    startExport: async () => {
      throw new globalThis.Error("Export service is currently unavailable.");
    },
    fetchExport: async () => {
      throw new globalThis.Error("not reached");
    },
  },
};

export const EmailChange: StoryObj<typeof EmailChangeForm> = {
  name: "EmailChange/Default",
  render: () =>
    withIntl(
      <EmailChangeForm
        requestEmailChange={async ({ newEmail }) => {
          await new Promise((resolve) => setTimeout(resolve, 400));
          return { ok: true, verificationSent: true, newEmail };
        }}
      />,
    ),
};

export const EmailChangeError: StoryObj<typeof EmailChangeForm> = {
  name: "EmailChange/Error",
  render: () =>
    withIntl(
      <EmailChangeForm
        requestEmailChange={async () => {
          throw new globalThis.Error("That email address is already in use.");
        }}
      />,
    ),
};
