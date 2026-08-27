import { createRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { rootRoute } from "./__root";

const tabs = ["profile", "team", "api-keys", "provider-keys", "webhooks", "security"] as const;
type SettingsTab = (typeof tabs)[number];

function isSettingsTab(value: unknown): value is SettingsTab {
  return typeof value === "string" && (tabs as readonly string[]).includes(value);
}

function SettingsRoute() {
  const search = settingsRoute.useSearch();
  const navigate = settingsRoute.useNavigate();
  const activeTab = search.tab;
  const panelCopy = useMemo(() => {
    switch (activeTab) {
      case "team":
        return "Team membership mutations are served by the gateway/BFF organization boundary.";
      case "api-keys":
        return "API key reads and writes continue through the existing API client boundary.";
      case "provider-keys":
        return "Provider key storage stays server-side; the Product App only triggers mutations.";
      case "webhooks":
        return "Webhook endpoint and delivery state belongs to the gateway webhook boundary.";
      case "security":
        return "Session, passkey, and account security stay behind the auth facade.";
      default:
        return "Profile and avatar data are loaded through browser-safe API calls and React Query.";
    }
  }, [activeTab]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-11">
          Settings uses URL search state for recoverable tabs while server data stays in TanStack
          Query.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className="rounded-[var(--radius-sm)] border border-neutral-7 px-3 py-2 text-sm capitalize text-neutral-11 data-[active=true]:bg-neutral-12 data-[active=true]:text-neutral-1"
            data-active={activeTab === tab}
            onClick={() => void navigate({ search: { tab }, replace: true })}
          >
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>
      <section className="rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
        <h2 className="text-lg font-semibold capitalize">{activeTab.replace("-", " ")}</h2>
        <p className="mt-2 text-sm text-neutral-11">{panelCopy}</p>
      </section>
    </section>
  );
}

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  validateSearch: (search): { tab: SettingsTab } => ({
    tab: isSettingsTab(search.tab) ? search.tab : "profile",
  }),
  component: SettingsRoute,
});
