import { DataExportCard } from "@/components/account/data-export-card";
import { EmailChangeForm } from "@/components/account/email-change-form";
import { requireOrg } from "@/lib/auth";

/**
 * Personal account settings, as distinct from `/settings` (General), which
 * holds the profile, the avatar and the organization danger zone.
 *
 * This page was referenced before it existed. Three independent places linked
 * to `/settings/account` and got a 404: the landing user-avatar menu, and both
 * buttons on the email-change confirmation page — so a user who had just
 * changed their address was sent nowhere.
 *
 * Two finished features were waiting for it. EmailChangeForm and
 * DataExportCard each have an API route, tests and a Storybook story, and
 * neither was rendered anywhere in the product: the email-change flow had a
 * token confirmation page and no way to start, and the GDPR export existed
 * only as `/api/account/export`. They are mounted here rather than bolted onto
 * General, because both are account-scoped and General is organization-scoped
 * at the bottom (Delete Organization).
 */
export const metadata = { title: "Account" };

export default async function AccountSettingsPage() {
  await requireOrg();

  return (
    <div className="space-y-8">
      <EmailChangeForm />
      <DataExportCard />
    </div>
  );
}
