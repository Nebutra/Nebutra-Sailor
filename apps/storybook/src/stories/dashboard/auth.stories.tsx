/**
 * Stories for the auth-flow surfaces.
 *
 * `ResetPasswordForm` calls `useRouter` from `next/navigation`. Storybook is
 * not running inside a Next.js app, so the router is `null` until used —
 * which is fine because the success branch only invokes `router.push` on
 * link click. The forms accept `onSubmit` overrides so we never hit the
 * real `/api/auth/*` endpoints.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { ForgotPasswordForm } from "../../../../web/src/components/auth/forgot-password-form";
import { ResetPasswordForm } from "../../../../web/src/components/auth/reset-password-form";
import { VerifyEmailResult } from "../../../../web/src/components/auth/verify-email-result";
import { withIntl } from "./_shared";

const meta: Meta<typeof ForgotPasswordForm> = {
  title: "Dashboard/Auth/ForgotPassword",
  component: ForgotPasswordForm,
  tags: ["autodocs"],
  decorators: [(Story) => withIntl(<Story />)],
  parameters: {
    docs: {
      description: {
        component:
          "Forgot-password form. The default story succeeds after a short delay; the error story surfaces the localized invalid-credentials key.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ForgotPasswordForm>;

export const Default: Story = {
  args: {
    onSubmit: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: {
    onSubmit: async () => {
      throw { code: "USER_NOT_FOUND" };
    },
  },
};

export const ResetDefault: StoryObj<typeof ResetPasswordForm> = {
  name: "Reset/Default",
  render: () =>
    withIntl(
      <ResetPasswordForm
        token="demo-reset-token"
        onSubmit={async () => {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }}
      />,
    ),
};

export const ResetError: StoryObj<typeof ResetPasswordForm> = {
  name: "Reset/Error",
  render: () =>
    withIntl(
      <ResetPasswordForm
        token="invalid-token"
        onSubmit={async () => {
          throw { code: "INVALID_CREDENTIALS" };
        }}
      />,
    ),
};

export const VerifySuccess: StoryObj<typeof VerifyEmailResult> = {
  name: "Verify/Success",
  render: () => withIntl(<VerifyEmailResult success={true} />),
};

export const VerifyFailure: StoryObj<typeof VerifyEmailResult> = {
  name: "Verify/Failure",
  render: () => withIntl(<VerifyEmailResult success={false} errorKey="sessionExpired" />),
};
