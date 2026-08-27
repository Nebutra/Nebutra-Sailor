import { FullPageStatus } from "@nebutra/ui/layout";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof FullPageStatus> = {
  title: "Layout/FullPageStatus",
  component: FullPageStatus,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Restrained full-page status template for 404, 500, and other authenticated error/not-found states. Not for `global-error.tsx` (which renders outside the root layout).",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FullPageStatus>;

export const NotFound: Story = {
  args: {
    code: "Error 404",
    title: (
      <>
        We couldn&apos;t find that <FullPageStatus.Accent>page</FullPageStatus.Accent>.
      </>
    ),
    description:
      "The page you're looking for doesn't exist or has been moved. Check the URL, or head back to the dashboard.",
    primaryAction: { label: "Go to dashboard", href: "/" },
    secondaryAction: { label: "Contact support", href: "/support" },
  },
};

export const ServerError: Story = {
  args: {
    code: "Error 500",
    title: "Something went wrong.",
    description:
      "An unexpected error occurred. Our team has been notified automatically. You can try again, or return to the dashboard.",
    primaryAction: { label: "Try again", onClick: () => alert("retry") },
    secondaryAction: { label: "Return home", href: "/" },
    meta: { errorId: "abc123def456", statusUrl: "status.nebutra.com" },
  },
};

export const Minimal: Story = {
  args: {
    code: "Error 403",
    title: "Access denied.",
    description: "You don't have permission to view this page.",
    primaryAction: { label: "Go to dashboard", href: "/" },
  },
};
