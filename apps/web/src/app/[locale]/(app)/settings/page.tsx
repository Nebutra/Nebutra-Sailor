import { AvatarUploadForm } from "@/components/account/avatar-upload-form";
import { ProfileForm } from "@/components/account/profile-form";
import { getUser, requireOrg } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOrg();
  const user = await getUser();

  return (
    <div className="space-y-8">
      <ProfileForm />

      <AvatarUploadForm
        initialAvatarUrl={user?.imageUrl ?? null}
        fallbackName={user?.name ?? user?.email ?? ""}
      />

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
