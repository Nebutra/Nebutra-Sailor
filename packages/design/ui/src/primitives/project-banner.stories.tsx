import { RotateCounterClockwise, ShieldCheck, Warning as WarningIcon } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { ProjectBanner } from "./project-banner";

const meta: Meta<typeof ProjectBanner> = {
  title: "Primitives/ProjectBanner",
  component: ProjectBanner,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-width, non-dismissible banner for project-wide states that need " +
          "resolution — overdue billing, active rollback, attack mitigation, " +
          "expiring trial. Pair with Note / Toast / Modal for narrower scopes.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ProjectBanner>;

export const Success: Story = {
  render: () => (
    <ProjectBanner
      variant="success"
      icon={<ShieldCheck className="h-4 w-4 shrink-0" />}
      label="Attack Challenge Mode is enabled for this project"
      callToAction={{ label: "Disable", href: "#" }}
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ProjectBanner
      variant="warning"
      icon={<RotateCounterClockwise className="h-4 w-4 shrink-0" />}
      label="This project was rolled back by @johnphamous"
      callToAction={{
        label: "Undo Rollback",
        onClick: () => alert("Undo clicked"),
      }}
    />
  ),
};

export const ErrorVariant: Story = {
  name: "Error",
  render: () => (
    <ProjectBanner
      variant="error"
      icon={<WarningIcon className="h-4 w-4 shrink-0" />}
      label="Payment failed, pay any open invoices before your account is shut down"
      callToAction={{ label: "Pay Invoices", href: "#" }}
    />
  ),
};

export const Info: Story = {
  render: () => (
    <ProjectBanner
      variant="info"
      label="Your Pro trial expires in 3 days"
      callToAction={{ label: "Update Payment Method", href: "#" }}
    />
  ),
};

export const NoCta: Story = {
  name: "Without CTA (discouraged)",
  render: () => (
    <ProjectBanner
      variant="info"
      label="A banner without a resolver action is a dead end — prefer a Note instead."
    />
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ProjectBanner
        variant="success"
        icon={<ShieldCheck className="h-4 w-4 shrink-0" />}
        label="Attack Challenge Mode is enabled for this project"
        callToAction={{ label: "Disable", href: "#" }}
      />
      <ProjectBanner
        variant="warning"
        icon={<RotateCounterClockwise className="h-4 w-4 shrink-0" />}
        label="This project was rolled back by @johnphamous"
        callToAction={{ label: "Undo Rollback", onClick: () => undefined }}
      />
      <ProjectBanner
        variant="error"
        icon={<WarningIcon className="h-4 w-4 shrink-0" />}
        label="Payment failed, pay any open invoices before your account is shut down"
        callToAction={{ label: "Pay Invoices", href: "#" }}
      />
      <ProjectBanner
        variant="info"
        label="Your Pro trial expires in 3 days"
        callToAction={{ label: "Update Payment Method", href: "#" }}
      />
    </div>
  ),
};
