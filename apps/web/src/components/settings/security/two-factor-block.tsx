import { Button } from "@nebutra/ui/components";
import type { SecurityCapabilities } from "./security-capabilities";

interface TwoFactorBlockProps {
  capability: SecurityCapabilities["twoFactor"];
}

export function TwoFactorBlock({ capability }: TwoFactorBlockProps) {
  const status = capability.requiresPasswordAccount ? "Needs password account" : "Not wired";

  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">
            Two-factor authentication
          </h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            Add a second verification step for sensitive sign-ins and account changes.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {capability.available ? "Available" : status}
        </span>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
        <p className="text-sm font-medium text-[var(--neutral-12)]">Authenticator app setup</p>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{capability.reason}</p>
      </div>

      <div className="mt-4">
        <Button disabled htmlType="button" variant="outlined">
          Enable 2FA unavailable
        </Button>
      </div>
    </section>
  );
}
