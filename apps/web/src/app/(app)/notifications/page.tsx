import { getTranslations } from "next-intl/server";
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { requireAuth } from "@/lib/auth";

// =============================================================================
// /notifications — full inbox page (server entry)
// =============================================================================
// Renders the dedicated notifications inbox. The shell layout already provides
// the chrome (sidebar + header with InboxBell); this page renders only the
// settings-style content area + container.
// =============================================================================

export async function generateMetadata() {
  const t = await getTranslations("notifications.page");
  return { title: t("title") };
}

export default async function NotificationsPage(): Promise<React.ReactElement> {
  await requireAuth();
  const t = await getTranslations("notifications.page");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--neutral-12)]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("description")}</p>
      </header>

      <NotificationsPageClient />
    </div>
  );
}
