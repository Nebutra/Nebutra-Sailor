import { Button } from "@nebutra/ui/components";
import type { SecurityCapabilities } from "./security-capabilities";

const PROVIDER_LABELS: Record<string, string> = {
  apple: "Apple",
  discord: "Discord",
  github: "GitHub",
  google: "Google",
  microsoft: "Microsoft",
};

interface ConnectedAccountsBlockProps {
  capability: SecurityCapabilities["connectedAccounts"];
  loading?: boolean;
}

function formatProvider(providerId: string) {
  return PROVIDER_LABELS[providerId] ?? providerId.replace(/[-_]/g, " ");
}

export function ConnectedAccountsBlock({
  capability,
  loading = false,
}: ConnectedAccountsBlockProps) {
  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">Connected accounts</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            Review OAuth sign-in methods linked to your Nebutra identity.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {capability.available ? "Discovery enabled" : "Provider managed"}
        </span>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-2)]" />
      ) : capability.linkedProviders.length > 0 ? (
        <div className="space-y-3">
          {capability.linkedProviders.map((providerId) => (
            <div
              key={providerId}
              className="flex flex-col gap-3 rounded-lg border border-[var(--neutral-7)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-medium capitalize text-[var(--neutral-12)]">
                  {formatProvider(providerId)}
                </p>
                <p className="mt-1 text-xs text-[var(--neutral-10)]">Linked sign-in provider</p>
              </div>
              <Button disabled htmlType="button" variant="outlined">
                Connected
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--neutral-11)]">No connected OAuth providers found.</p>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--neutral-10)]">{capability.reason}</p>
      <div className="mt-4">
        <Button disabled htmlType="button" variant="outlined">
          Link provider unavailable
        </Button>
      </div>
    </section>
  );
}
