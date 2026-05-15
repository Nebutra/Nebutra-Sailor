"use client";

import { RotateCounterClockwise, ShieldCheck, Warning as WarningIcon } from "@nebutra/icons";
import { ProjectBanner } from "@nebutra/ui/primitives";

export function ProjectBannerDemo() {
  return (
    <div className="flex w-full flex-col gap-4">
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
  );
}
