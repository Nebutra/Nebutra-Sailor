"use client";

import { useAuth } from "@nebutra/auth/client";
import {
  Bell,
  Command,
  External as ExternalLink,
  FileText,
  Key,
  Connection as Plug,
  SettingsGear as SettingsIcon,
  Shield,
  Users,
} from "@nebutra/icons";
import { Dialog, DialogContent } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AvatarUploadForm } from "@/components/account/avatar-upload-form";
import { ProfileForm } from "@/components/account/profile-form";

// =============================================================================
// SettingsDialog — in-shell settings overlay (Cross-reference: /settings/*)
// =============================================================================
// Renders the full settings nav as a Dialog so users never lose page context.
// Each tab thin-wraps the same components used by the matching /settings/*
// route, so behavior stays in sync. Routes remain as deep-link / SEO fallback.
// =============================================================================

type SettingsTabId =
  | "general"
  | "security"
  | "team"
  | "api-keys"
  | "webhooks"
  | "notifications"
  | "shortcuts"
  | "audit-log"
  | "members";

interface SettingsDialogContextValue {
  open: boolean;
  activeTab: SettingsTabId;
  openDialog: (tab?: SettingsTabId) => void;
  closeDialog: () => void;
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: SettingsTabId) => void;
}

const SettingsDialogContext = createContext<SettingsDialogContextValue | null>(null);

export function SettingsDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");

  const openDialog = useCallback((tab?: SettingsTabId) => {
    if (tab) setActiveTab(tab);
    setOpen(true);
  }, []);
  const closeDialog = useCallback(() => setOpen(false), []);

  const value = useMemo<SettingsDialogContextValue>(
    () => ({ open, activeTab, openDialog, closeDialog, setOpen, setActiveTab }),
    [open, activeTab, openDialog, closeDialog],
  );

  return <SettingsDialogContext.Provider value={value}>{children}</SettingsDialogContext.Provider>;
}

export function useSettingsDialog(): SettingsDialogContextValue {
  const ctx = useContext(SettingsDialogContext);
  if (!ctx) {
    throw new Error("useSettingsDialog must be used within a SettingsDialogProvider");
  }
  return ctx;
}

/** Convenience: Provider + mounted Dialog in one wrapper for the app layout. */
export function SettingsDialogMount({ children }: { children: ReactNode }) {
  return (
    <SettingsDialogProvider>
      {children}
      <SettingsDialog />
    </SettingsDialogProvider>
  );
}

interface TabConfig {
  id: SettingsTabId;
  label: string;
  icon: typeof SettingsIcon;
  /** Deep-link target — the same /settings/* page used as fallback. */
  href: string;
}

const TABS: ReadonlyArray<TabConfig> = [
  { id: "general", label: "General", icon: SettingsIcon, href: "/settings" },
  { id: "security", label: "Security", icon: Shield, href: "/settings/security" },
  { id: "team", label: "Team", icon: Users, href: "/settings/team" },
  { id: "api-keys", label: "API Keys", icon: Key, href: "/settings/api-keys" },
  { id: "webhooks", label: "Webhooks", icon: Plug, href: "/settings/webhooks" },
  { id: "notifications", label: "Notifications", icon: Bell, href: "/settings/notifications" },
  { id: "shortcuts", label: "Shortcuts", icon: Command, href: "/settings/shortcuts" },
  { id: "audit-log", label: "Audit Log", icon: FileText, href: "/settings/audit-log" },
  { id: "members", label: "Members", icon: Users, href: "/settings/organization/members" },
];

// ─── Lazy panels ─────────────────────────────────────────────────────────────
// Heavy panels are dynamically imported so the dialog stays light until the
// user opens the relevant tab.

const LoadingPanel = () => (
  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
    Loading…
  </div>
);

const SecuritySettingsClient = dynamic(
  () =>
    import("@/components/settings/security/security-settings-client").then(
      (m) => m.SecuritySettingsClient,
    ),
  { ssr: false, loading: LoadingPanel },
);

const ApiKeysPageClient = dynamic(
  () =>
    import("@/app/[locale]/(app)/settings/api-keys/api-keys-client").then(
      (m) => m.ApiKeysPageClient,
    ),
  { ssr: false, loading: LoadingPanel },
);

// ─── Panels ──────────────────────────────────────────────────────────────────

function GeneralPanel() {
  const { user } = useAuth();
  return (
    <div className="space-y-8">
      <ProfileForm />
      <AvatarUploadForm
        initialAvatarUrl={user?.imageUrl ?? null}
        email={user?.email ?? null}
        fallbackName={user?.name ?? user?.email ?? ""}
      />
    </div>
  );
}

function SecurityPanel() {
  return <SecuritySettingsClient />;
}

function ApiKeysPanel() {
  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-base font-semibold text-foreground">API Keys</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and manage API keys for programmatic access.
        </p>
      </header>
      <ApiKeysPageClient />
    </div>
  );
}

// Server-data tabs — render a quick-link card pointing at the full route.
function DeferToRoutePanel({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-card p-6">
      <h3 className="text-base font-semibold text-foreground">{label}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This section uses server-rendered data and is best viewed on its own page.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
      >
        Open full settings
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function PanelForTab({ tab }: { tab: SettingsTabId }) {
  const config = TABS.find((t) => t.id === tab);
  switch (tab) {
    case "general":
      return <GeneralPanel />;
    case "security":
      return <SecurityPanel />;
    case "api-keys":
      return <ApiKeysPanel />;
    case "team":
    case "webhooks":
    case "notifications":
    case "shortcuts":
    case "audit-log":
    case "members":
      return <DeferToRoutePanel href={config?.href ?? "/settings"} label={config?.label ?? ""} />;
  }
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

export function SettingsDialog() {
  const { open, activeTab, setActiveTab, setOpen } = useSettingsDialog();
  // Reset to the General tab when the dialog closes so the next open is clean
  // (unless the caller explicitly requested a tab when opening).
  useEffect(() => {
    if (!open) {
      // Defer so the user sees the closing animation on the active tab.
      const id = setTimeout(() => setActiveTab("general"), 250);
      return () => clearTimeout(id);
    }
  }, [open, setActiveTab]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-4xl overflow-hidden p-0 sm:rounded-[var(--radius-2xl)]"
        aria-label="Settings"
      >
        <div className="flex min-h-[520px] flex-col sm:flex-row">
          {/* Left rail */}
          <nav
            aria-label="Settings sections"
            className="shrink-0 border-b border-border bg-muted/40 p-3 sm:w-[200px] sm:border-b-0 sm:border-r"
          >
            <div className="mb-3 px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Settings
            </div>
            <ul className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
              {TABS.map((t) => {
                const Icon = t.icon;
                const isActive = t.id === activeTab;
                return (
                  <li key={t.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium transition-colors",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right pane */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  {TABS.find((t) => t.id === activeTab)?.label ?? "Settings"}
                </h2>
              </div>
            </header>
            <div className="max-h-[68vh] flex-1 overflow-y-auto px-6 py-5">
              <PanelForTab tab={activeTab} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
