import { auth, currentUser } from "@clerk/nextjs/server";
import { AlertTriangle, Clock, Shield, Smartphone } from "lucide-react";

export const metadata = {
  title: "Security — Settings",
};

export default async function SecuritySettingsPage() {
  const { sessionId } = await auth();
  const user = await currentUser();

  const hasMfa = user?.twoFactorEnabled ?? false;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--neutral-12)]">Security</h2>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">
          Manage authentication and session security for your account.
        </p>
      </div>

      {/* Two-factor authentication */}
      <section className="p-6 rounded-lg border border-[var(--neutral-7)]">
        <div className="gap-4 flex items-start justify-between">
          <div className="gap-3 flex items-start">
            <div className="mt-0.5 p-2 rounded-md bg-[var(--neutral-2)]">
              <Smartphone className="h-4 w-4 text-[var(--neutral-11)]" aria-hidden />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--neutral-12)]">
                Two-factor authentication
              </h3>
              <p className="mt-1 text-sm text-[var(--neutral-11)]">
                Add an extra layer of security with an authenticator app or SMS.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {hasMfa ? (
              <span className="gap-1.5 bg-green-50 px-2.5 py-1 text-xs font-medium ring-green-600/20 inline-flex items-center rounded-full text-green-700 ring-1 ring-inset">
                <Shield className="h-3 w-3" aria-hidden />
                Enabled
              </span>
            ) : (
              <span className="gap-1.5 bg-amber-50 px-2.5 py-1 text-xs font-medium ring-amber-600/20 inline-flex items-center rounded-full text-amber-700 ring-1 ring-inset">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Not enabled
              </span>
            )}
          </div>
        </div>

        {!hasMfa && (
          <div className="mt-4">
            <a
              href="https://accounts.clerk.dev/user/security"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium inline-flex items-center rounded-md border border-[var(--neutral-7)] text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)] focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 focus:outline-none"
            >
              Enable 2FA
            </a>
          </div>
        )}
      </section>

      {/* Active session */}
      <section className="p-6 rounded-lg border border-[var(--neutral-7)]">
        <div className="gap-3 flex items-start">
          <div className="mt-0.5 p-2 rounded-md bg-[var(--neutral-2)]">
            <Clock className="h-4 w-4 text-[var(--neutral-11)]" aria-hidden />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">Active session</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">
              You are currently signed in as{" "}
              <span className="font-medium text-[var(--neutral-12)]">{email}</span>.
            </p>
            {sessionId && (
              <p className="mt-1 text-xs font-mono text-[var(--neutral-11)]">
                Session: {sessionId.slice(0, 16)}…
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Password */}
      <section className="p-6 rounded-lg border border-[var(--neutral-7)]">
        <div className="gap-3 flex items-start">
          <div className="mt-0.5 p-2 rounded-md bg-[var(--neutral-2)]">
            <Shield className="h-4 w-4 text-[var(--neutral-11)]" aria-hidden />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[var(--neutral-12)]">Password</h3>
            <p className="mt-1 text-sm text-[var(--neutral-11)]">
              Update your password or manage linked social accounts.
            </p>
            <div className="mt-4">
              <a
                href="https://accounts.clerk.dev/user/security"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm font-medium inline-flex items-center rounded-md border border-[var(--neutral-7)] text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)] focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 focus:outline-none"
              >
                Manage in Clerk
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-red-50/40 p-6 rounded-lg border border-red-200">
        <h3 className="text-sm font-medium text-red-800">Danger zone</h3>
        <p className="mt-1 text-sm text-red-700">
          Deleting your account is permanent and cannot be undone. All data associated with your
          account will be removed.
        </p>
        <div className="mt-4">
          <a
            href="https://accounts.clerk.dev/user"
            target="_blank"
            rel="noopener noreferrer"
            className="border-red-300 px-3 py-2 text-sm font-medium hover:bg-red-100 focus:ring-red-500 inline-flex items-center rounded-md border text-red-700 transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none"
          >
            Delete account
          </a>
        </div>
      </section>
    </div>
  );
}
