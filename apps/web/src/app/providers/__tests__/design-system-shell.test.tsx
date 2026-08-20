// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest 4 may expose Node's experimental localStorage, which does not always
// implement the complete Storage API under jsdom.
{
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  Object.defineProperty(window, "localStorage", { value: storage, writable: true });
}

// ── Auth / permission / i18n stubs ──────────────────────────────────────────
const useAuthMock = vi.fn();
let mockPathname = "/en/workspace";
vi.mock("@nebutra/auth/client", () => ({
  useAuth: () => useAuthMock(),
  getConfiguredAuthProvider: () => "dev",
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({ can: () => false }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// dashboard-nav.ts imports `routing.locales` from this module; the real module
// calls next-intl's createNavigation() at load time, which fails to resolve
// next/navigation under the node-inlined ESM test pipeline. Stub the surface
// the component actually uses.
vi.mock("@nebutra/i18n/routing", () => ({
  routing: { locales: ["en", "zh"], defaultLocale: "en" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// ── Sidebar context + zustand expansion store (pure local UI state) ──────────
vi.mock("@/components/navigation/sidebar-context", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSidebar: () => ({ collapsed: false, toggle: vi.fn() }),
}));

const setExpansionOpenMock = vi.fn();
vi.mock("@/components/navigation/sidebar-expansion-store", () => ({
  useSidebarExpansion: () => ({ map: {}, setOpen: setExpansionOpenMock }),
  useSidebarExpansionStore: {
    persist: { rehydrate: vi.fn() },
    getState: () => ({ hasRestored: () => false }),
  },
}));

// ── Presentational shell mocks — flatten the section data so we can assert on
// the workspace labels + thread titles the data layer feeds in. This isolates
// the react-query migration (organizations → options, threads → children,
// invalidation on new-project) from the heavy real UI tree. ──────────────────
interface MockSidebarItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}
interface MockSidebarSection {
  id: string;
  label?: string;
  items: MockSidebarItem[];
  actions?: { id: string; label: string; onClick?: () => void }[];
}

vi.mock("@nebutra/ui/layout", () => ({
  AppShell: ({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) => (
    <div>
      {sidebar}
      {children}
    </div>
  ),
}));

vi.mock("@nebutra/ui/patterns", () => ({
  SidebarNav: ({ sections }: { sections: MockSidebarSection[] }) => (
    <nav>
      {sections.map((section) => (
        <div key={section.id} data-section={section.id}>
          {section.actions?.map((action) => (
            <button key={action.id} type="button" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
          {section.items.map((item) => (
            <div key={item.id} data-item={item.id}>
              <span>{item.label}</span>
              {item.children?.map((child) => (
                <span key={child.id} data-child={child.id}>
                  {child.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  ),
  WorkspaceSwitcher: () => null,
}));

// Partial mock: the dropdown family is flattened (its popup needs a pointer
// stack jsdom does not provide) and `toast` is spied. Every other primitive —
// Button, and whatever the shell reaches for next — stays real.
vi.mock("@nebutra/ui/primitives", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@nebutra/ui/primitives")>()),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => null,
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/components/notifications/notifications-dialog", () => ({
  NotificationsDialog: () => null,
}));
vi.mock("@/components/navigation/user-menu", () => ({
  UserMenu: () => null,
}));
vi.mock("@/components/navigation/view-transition-link", () => ({
  ViewTransitionLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/brand/brand-assets", () => ({
  BrandLogo: () => null,
  webBrandLabels: { homeLink: "Open product home", primaryNavigation: "Primary navigation" },
}));

import { FeedbackDialogProvider } from "@/components/feedback/feedback-dialog-provider";
import { DesignSystemShell } from "../design-system-shell";

const ORG_ALPHA = { id: "org_alpha", name: "Alpha Org" };
const ORG_BETA = { id: "org_beta", name: "Beta Org" };
const THREAD = { id: "t1", title: "First Thread", lastActivityAt: "2026-01-01T00:00:00Z" };

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(ui: ReactElement) {
  const client = makeTestClient();
  const utils = render(
    <QueryClientProvider client={client}>
      <FeedbackDialogProvider>{ui}</FeedbackDialogProvider>
    </QueryClientProvider>,
  );
  return { client, ...utils };
}

describe("DesignSystemShell (react-query integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockPathname = "/en/workspace";
    useAuthMock.mockReturnValue({
      isSignedIn: true,
      session: { organizationId: null },
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads real org labels then threads — never renders mock/seed workspaces", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations" && method === "GET") {
        return Promise.resolve(jsonResponse({ organizations: [ORG_ALPHA, ORG_BETA] }));
      }
      if (url.startsWith("/api/organizations/org_alpha/threads") && method === "GET") {
        return Promise.resolve(jsonResponse({ threads: [THREAD] }));
      }
      return Promise.resolve(jsonResponse({ threads: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(
      <DesignSystemShell>
        <div data-testid="page-content" />
      </DesignSystemShell>,
    );

    // No mock/seed workspaces ever render — not before the org query resolves,
    // and not after. The sidebar is backed exclusively by real organizations.
    expect(screen.getAllByText("Startup OS").length).toBeGreaterThan(0);
    expect(screen.queryByText("Starter Workspace")).not.toBeInTheDocument();

    // Once the org list resolves, the real org labels render and the active
    // workspace (org_alpha via resolvePreferredWorkspaceId → options[0]) loads
    // its threads.
    await waitFor(() => {
      expect(screen.getByText("Alpha Org")).toBeInTheDocument();
    });
    expect(screen.getByText("Beta Org")).toBeInTheDocument();
    expect(screen.queryByText("Starter Workspace")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("First Thread")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/organizations", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/organizations/org_alpha/threads",
      expect.any(Object),
    );
  });

  it("renders no workspaces (no seed, no crash) when the organizations fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({}, { status: 500 })));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(
      <DesignSystemShell>
        <div data-testid="page-content" />
      </DesignSystemShell>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/organizations", expect.any(Object));
    });

    // Org query errors → NO mock/seed workspaces appear (the Projects section
    // stays empty). The shell degrades gracefully and still renders page content.
    await waitFor(() => {
      expect(screen.getByTestId("page-content")).toBeInTheDocument();
    });
    expect(screen.queryByText("Starter Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Growth Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Enterprise Workspace")).not.toBeInTheDocument();
  });

  it("does not render seed workspace copy on Startup OS when no organizations are returned", async () => {
    mockPathname = "/en/startup-os";
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations" && method === "GET") {
        return Promise.resolve(jsonResponse({ organizations: [] }));
      }
      return Promise.resolve(jsonResponse({ threads: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(
      <DesignSystemShell>
        <div data-testid="page-content" />
      </DesignSystemShell>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/organizations", expect.any(Object));
    });
    // Wait for the empty-organizations result to reconcile before asserting the
    // negative cases — `waitFor` above only confirms the fetch fired, not that
    // the render settled, which races under heavy parallel-suite load.
    await waitFor(() => {
      expect(screen.getAllByText("Startup OS").length).toBeGreaterThan(0);
      expect(screen.queryByText("Starter Workspace")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Growth Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Enterprise Workspace")).not.toBeInTheDocument();
  });

  it("invalidates the threads query after creating a project (background refetch)", async () => {
    let threadsGetCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url === "/api/organizations" && method === "GET") {
        return Promise.resolve(jsonResponse({ organizations: [ORG_ALPHA] }));
      }
      if (url.startsWith("/api/organizations/org_alpha/threads") && method === "GET") {
        threadsGetCount += 1;
        // First load empty; after create-invalidation the new thread appears.
        return Promise.resolve(jsonResponse({ threads: threadsGetCount > 1 ? [THREAD] : [] }));
      }
      if (url.startsWith("/api/organizations/org_alpha/threads") && method === "POST") {
        return Promise.resolve(jsonResponse({ thread: THREAD }, { status: 201 }));
      }
      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "prompt").mockReturnValue("First Thread");

    const user = userEvent.setup();
    renderWithClient(
      <DesignSystemShell>
        <div data-testid="page-content" />
      </DesignSystemShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha Org")).toBeInTheDocument();
    });
    // Initial threads load fired (empty).
    await waitFor(() => {
      expect(threadsGetCount).toBe(1);
    });

    await user.click(screen.getByRole("button", { name: "newProject" }));

    // POST fired, then the threads query was invalidated → a second GET.
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).startsWith("/api/organizations/org_alpha/threads") &&
            (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(threadsGetCount).toBeGreaterThan(1);
    });
    await waitFor(() => {
      expect(screen.getByText("First Thread")).toBeInTheDocument();
    });
  });
});
