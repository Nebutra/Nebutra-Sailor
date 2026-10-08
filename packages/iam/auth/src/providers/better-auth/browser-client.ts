/** Framework-neutral browser adapter for first-party products, including Vue. */
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export interface BrowserWorkspace {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}
export interface BrowserAuthContext {
  user: { id: string; name: string; email: string; image: string | null };
  activeWorkspaceId: string | null;
  workspaces: BrowserWorkspace[];
}

/** Uses the official SDK; the auth center validates cookies, CSRF and membership. */
export function createAuthCenterBrowserClient(baseURL: string) {
  const client = createAuthClient({
    baseURL,
    plugins: [organizationClient()],
    fetchOptions: { credentials: "include" },
  });
  return {
    async getContext(): Promise<BrowserAuthContext | null> {
      const session = await client.getSession({ query: { disableCookieCache: true } });
      if (session.error) throw new Error(session.error.message ?? "Unable to verify your session.");
      if (!session.data) return null;
      const organizations = await client.organization.list();
      if (organizations.error)
        throw new Error(organizations.error.message ?? "Unable to load workspaces.");
      const { user } = session.data;
      return {
        user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
        activeWorkspaceId: session.data.session.activeOrganizationId ?? null,
        workspaces: (organizations.data ?? []).map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          image: org.logo ?? null,
        })),
      };
    },
    async selectWorkspace(organizationId: string | null): Promise<void> {
      const result = await client.organization.setActive({ organizationId });
      if (result.error) throw new Error(result.error.message ?? "Unable to switch workspace.");
    },
    async signOut(): Promise<void> {
      const result = await client.signOut();
      if (result.error) throw new Error(result.error.message ?? "Unable to sign out.");
    },
    async updateProfile(name: string): Promise<void> {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 64) throw new Error("名称须为 1–64 个字符。");
      const result = await client.updateUser({ name: trimmed });
      if (result.error) throw new Error(result.error.message ?? "Unable to update your profile.");
    },
  };
}
