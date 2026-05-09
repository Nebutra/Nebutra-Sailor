import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { requireAuth } from "@/lib/auth";

// =============================================================================
// /notifications — full inbox page (server entry)
// =============================================================================
// Renders the dedicated notifications inbox. The shell layout already provides
// the chrome (sidebar + header with InboxBell); this page renders only the
// settings-style content area + container.
//
// English literals are used inline for now; once shared i18n keys
// (notifications.page.*) ship in @nebutra/i18n the title/description below
// can be replaced with `useTranslations("notifications.page")`.
// =============================================================================

export const metadata = {
  title: "Notifications",
};

export default async function NotificationsPage(): Promise<React.ReactElement> {
  await requireAuth();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--neutral-12)]">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">
          Review every alert sent to your account. Filter by status, archive items you no longer
          need, or clear the unread badge in one click.
        </p>
      </header>

      <NotificationsPageClient />
    </div>
  );
}
