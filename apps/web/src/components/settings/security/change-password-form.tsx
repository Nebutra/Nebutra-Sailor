import type { SecurityCapabilities } from "./security-capabilities";

interface ChangePasswordFormProps {
  capability: SecurityCapabilities["password"];
  loading?: boolean;
}

export function ChangePasswordForm({ capability, loading = false }: ChangePasswordFormProps) {
  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--neutral-12)]">Password</h3>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            Check whether this account has a credential sign-in method and explain the safest
            supported password path.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[var(--neutral-7)] px-2.5 py-1 text-xs font-medium text-[var(--neutral-11)]">
          {capability.hasPasswordAccount ? "Credential attached" : "OAuth only"}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--neutral-11)]">Loading password capabilities…</p>
      ) : capability.hasPasswordAccount ? (
        <div className="space-y-3 text-sm text-[var(--neutral-11)]">
          <p>{capability.reason}</p>
          <p>
            For now, use the existing sign-in recovery flow or rotate sessions below when you need
            to reduce account exposure.
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--neutral-11)]">{capability.reason}</p>
      )}
    </section>
  );
}
