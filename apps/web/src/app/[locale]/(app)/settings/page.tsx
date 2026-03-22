import { currentUser } from "@clerk/nextjs/server";
import { requireOrg } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOrg();
  const user = await currentUser();

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--neutral-12)]">Profile</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--neutral-11)]">Name</dt>
            <dd className="font-medium text-[var(--neutral-12)]">{user?.fullName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--neutral-11)]">Email</dt>
            <dd className="font-medium text-[var(--neutral-12)]">
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--neutral-12)]">Danger Zone</h2>
        <p className="mb-4 text-sm text-[var(--neutral-11)]">
          These actions are permanent and cannot be undone.
        </p>
        <button
          type="button"
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
        >
          Delete Organization
        </button>
      </section>
    </div>
  );
}
