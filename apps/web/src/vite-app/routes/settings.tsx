import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import { createRoute } from "@tanstack/react-router";
import { ProfilePanel } from "@/vite-app/settings/profile-panel";
import { SecurityPanel } from "@/vite-app/settings/security-panel";
import { WorkspacePanel } from "@/vite-app/settings/workspace-panel";
import { rootRoute } from "./__root";

const SECTIONS = [
  { value: "profile", label: "Profile" },
  { value: "workspace", label: "Workspace" },
  { value: "security", label: "Security" },
] as const;

type SettingsTab = (typeof SECTIONS)[number]["value"];

function toSettingsTab(value: unknown): SettingsTab {
  // `team` is what this section was called before; old links still land on it.
  if (value === "team") return "workspace";
  return SECTIONS.some((section) => section.value === value) ? (value as SettingsTab) : "profile";
}

function SettingsRoute() {
  const { tab } = settingsRoute.useSearch();
  const navigate = settingsRoute.useNavigate();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-neutral-11">
          Manage your profile, your workspace and where you're signed in.
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(next) =>
          void navigate({ search: { tab: toSettingsTab(next) }, replace: true })
        }
        variant="line"
      >
        <TabsList aria-label="Settings sections">
          {SECTIONS.map((section) => (
            <TabsTrigger key={section.value} value={section.value}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" className="pt-6">
          <ProfilePanel />
        </TabsContent>
        <TabsContent value="workspace" className="pt-6">
          <WorkspacePanel />
        </TabsContent>
        <TabsContent value="security" className="pt-6">
          <SecurityPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  validateSearch: (search): { tab: SettingsTab } => ({ tab: toSettingsTab(search.tab) }),
  component: SettingsRoute,
});
