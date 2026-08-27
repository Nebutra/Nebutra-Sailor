import { cookies } from "next/headers";
import { DashboardHintCard } from "./dashboard-hint-card";

const COOKIE_NAME = "nebutra_dashboard_hint_dismissed";

/**
 * Server-rendered first-visit hint.
 *
 * Honesty contract:
 *   - Renders nothing if the user has previously dismissed (cookie set)
 *   - Renders nothing if cookie state can't be read (avoid layout flash for
 *     repeat visitors when SSR has no incoming cookies)
 *   - The dismiss action is owned by the client component — we only own the
 *     read-time gate here.
 */
export async function DashboardHint() {
  const store = await cookies();
  const dismissed = store.get(COOKIE_NAME)?.value === "1";
  if (dismissed) return null;
  return <DashboardHintCard cookieName={COOKIE_NAME} />;
}
