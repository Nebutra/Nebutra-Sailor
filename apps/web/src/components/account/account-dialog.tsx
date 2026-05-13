"use client";

import { useAuth } from "@nebutra/auth/client";
import { useTheme } from "@nebutra/tokens";
import { EmptyState } from "@nebutra/ui/layout";
import { BrandMark, Dialog, DialogContent } from "@nebutra/ui/primitives";
import {
  ArrowRight,
  CreditCard,
  Keyboard,
  LifeBuoy,
  Mail,
  Monitor,
  Moon,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  User,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";
import { PersonalizationTab } from "@/components/personalization/personalization-tab";

/**
 * AccountDialog — unified account modal (Profile / Subscription / Billing / Preferences).
 *
 * Replaces the previous theme-only QuickSettings template. Built on the
 * `@nebutra/ui/primitives` Dialog (focus trap + ESC + restore for free) and
 * the canonical EmptyState `tone="branded"` for first-touch panels.
 *
 * Deep-link to `/settings/*` is preserved — every tab has an "Open full
 * settings" footer link. The dialog is a complement, not a replacement.
 *
 * Keyboard shortcut: ⌘, opens / toggles.
 */

type TabId = "profile" | "personalization" | "subscription" | "billing" | "preferences";

interface AccountDialogContextValue {
  open: boolean;
  activeTab: TabId;
  openDialog: (tab?: TabId) => void;
  closeDialog: () => void;
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: TabId) => void;
}

const AccountDialogContext = createContext<AccountDialogContextValue | null>(null);

export function AccountDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const openDialog = useCallback((tab?: TabId) => {
    if (tab) setActiveTab(tab);
    setOpen(true);
  }, []);
  const closeDialog = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModKey = event.metaKey || event.ctrlKey;
      if (isModKey && event.key === ",") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const value = useMemo<AccountDialogContextValue>(
    () => ({ open, activeTab, openDialog, closeDialog, setOpen, setActiveTab }),
    [open, activeTab, openDialog, closeDialog],
  );

  return <AccountDialogContext.Provider value={value}>{children}</AccountDialogContext.Provider>;
}

export function useAccountDialog(): AccountDialogContextValue {
  const ctx = useContext(AccountDialogContext);
  if (!ctx) {
    throw new Error("useAccountDialog must be used within an AccountDialogProvider");
  }
  return ctx;
}

interface TabConfig {
  id: TabId;
  labelKey: string;
  icon: typeof User;
}

const TABS: ReadonlyArray<TabConfig> = [
  { id: "profile", labelKey: "tabs.profile", icon: User },
  { id: "personalization", labelKey: "tabs.personalization", icon: Wand2 },
  { id: "subscription", labelKey: "tabs.subscription", icon: Sparkles },
  { id: "billing", labelKey: "tabs.billing", icon: Receipt },
  { id: "preferences", labelKey: "tabs.preferences", icon: SettingsIcon },
];

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "?";
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) return (tokens[0][0] + tokens[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function AccountDialog({ planBadge }: { planBadge?: ReactNode } = {}) {
  const t = useTranslations("account");
  const { open, activeTab, setActiveTab, setOpen, closeDialog } = useAccountDialog();
  const { user } = useAuth();
  const router = useRouter();
  const { openDialog: openFeedback } = useFeedbackDialog();

  const go = useCallback(
    (href: string) => {
      closeDialog();
      router.push(href);
    },
    [closeDialog, router],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[760px]" aria-label={t("ariaLabel")}>
        <div className="flex min-h-[480px] flex-col sm:flex-row">
          {/* Left rail — tabs */}
          <nav
            aria-label={t("navLabel")}
            className="shrink-0 border-b border-neutral-6 bg-neutral-2/40 p-3 sm:w-[200px] sm:border-b-0 sm:border-r dark:border-white/10 dark:bg-white/[0.02]"
          >
            <div className="mb-3 px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
              {t("title")}
            </div>
            <ul className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <li key={tab.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-3/60 text-blue-12 dark:bg-blue-3/20 dark:text-blue-9"
                          : "text-neutral-11 hover:bg-neutral-3/60 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/[0.05] dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t(tab.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right panel */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-neutral-6 px-6 py-4 dark:border-white/10">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
                  {t(`${activeTab}.title`)}
                </h2>
                <p className="mt-0.5 truncate text-xs text-neutral-10 dark:text-white/50">
                  {t(`${activeTab}.subtitle`)}
                </p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === "profile" && (
                <ProfilePanel
                  name={user?.name ?? null}
                  email={user?.email ?? null}
                  imageUrl={user?.imageUrl ?? null}
                  onOpenFull={() => go("/settings")}
                  t={t}
                />
              )}

              {activeTab === "personalization" && <PersonalizationTab />}

              {activeTab === "subscription" && (
                <SubscriptionPanel
                  onUpgrade={() => go("/choose-plan")}
                  onManage={() => go("/billing")}
                  planBadge={planBadge}
                  t={t}
                />
              )}

              {activeTab === "billing" && <BillingPanel onOpenFull={() => go("/billing")} t={t} />}

              {activeTab === "preferences" && (
                <PreferencesPanel
                  onReportIssue={() => {
                    closeDialog();
                    openFeedback();
                  }}
                  onShortcuts={() => go("/settings/shortcuts")}
                  t={t}
                />
              )}
            </div>

            <footer className="border-t border-neutral-6 px-6 py-3 text-[11px] text-neutral-10 dark:border-white/10 dark:text-white/40">
              {t("tip", {
                key: "⌘,",
              })}
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ─── Panels ────────────────────────────────────────────────────────────────

  function ProfilePanel({
    name,
    email,
    imageUrl,
    onOpenFull,
    t,
  }: {
    name: string | null;
    email: string | null;
    imageUrl: string | null;
    onOpenFull: () => void;
    t: ReturnType<typeof useTranslations>;
  }) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-neutral-6 dark:ring-white/10"
              />
            ) : (
              <BrandMark size="lg" variant="gradient">
                <span className="font-semibold text-base">{initialsFor(name, email)}</span>
              </BrandMark>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-neutral-12 dark:text-white">
              {name ?? email ?? t("profile.unknown")}
            </p>
            {email && (
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-neutral-11 dark:text-white/60">
                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{email}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFull}
          className="group flex items-center justify-between rounded-xl border border-neutral-6 bg-neutral-1 px-4 py-3 text-sm transition-colors hover:border-neutral-7 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
        >
          <span className="flex items-center gap-2.5 text-neutral-12 dark:text-white">
            <SettingsIcon
              className="h-4 w-4 text-neutral-10 dark:text-white/60"
              aria-hidden="true"
            />
            <span>{t("profile.manageCta")}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-10 transition-transform group-hover:translate-x-0.5 dark:text-white/60" />
        </button>
      </div>
    );
  }

  function SubscriptionPanel({
    onUpgrade,
    onManage,
    planBadge,
    t,
  }: {
    onUpgrade: () => void;
    onManage: () => void;
    planBadge?: ReactNode;
    t: ReturnType<typeof useTranslations>;
  }) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-neutral-6 bg-gradient-to-br from-blue-2/40 to-transparent p-4 dark:border-white/10 dark:from-blue-2/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
                {t("subscription.currentPlan")}
              </p>
              <div className="mt-2">{planBadge}</div>
            </div>
            <BrandMark size="md" variant="gradient" halo>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </BrandMark>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onUpgrade}
            className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-gradient)" }}
          >
            <span>{t("subscription.upgradeCta")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={onManage}
            className="group flex items-center justify-between rounded-xl border border-neutral-6 bg-neutral-1 px-4 py-3 text-sm text-neutral-12 transition-colors hover:border-neutral-7 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-2">
              <CreditCard
                className="h-4 w-4 text-neutral-10 dark:text-white/60"
                aria-hidden="true"
              />
              {t("subscription.manageCta")}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-neutral-10 transition-transform group-hover:translate-x-0.5 dark:text-white/60" />
          </button>
        </div>
      </div>
    );
  }

  function BillingPanel({
    onOpenFull,
    t,
  }: {
    onOpenFull: () => void;
    t: ReturnType<typeof useTranslations>;
  }) {
    return (
      <EmptyState
        tone="branded"
        size="md"
        title={t("billing.empty.title")}
        description={t("billing.empty.description")}
        action={
          <button
            type="button"
            onClick={onOpenFull}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-gradient)" }}
          >
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            {t("billing.empty.cta")}
          </button>
        }
      />
    );
  }

  function PreferencesPanel({
    onReportIssue,
    onShortcuts,
    t,
  }: {
    onReportIssue: () => void;
    onShortcuts: () => void;
    t: ReturnType<typeof useTranslations>;
  }) {
    const { theme, setTheme } = useTheme();

    return (
      <div className="flex flex-col gap-5">
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
            {t("preferences.theme")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "light", icon: Sun },
                { id: "dark", icon: Moon },
                { id: "system", icon: Monitor },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={isActive}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-blue-7 bg-blue-2/60 text-blue-12 dark:border-blue-7/60 dark:bg-blue-2/20 dark:text-blue-9"
                      : "border-neutral-6 bg-neutral-1 text-neutral-11 hover:border-neutral-7 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/70 dark:hover:border-white/20"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{t(`preferences.${option.id}`)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
            {t("preferences.help")}
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onReportIssue}
              className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/[0.05]"
            >
              <span className="flex items-center gap-2.5">
                <LifeBuoy
                  className="h-4 w-4 text-neutral-10 dark:text-white/60"
                  aria-hidden="true"
                />
                {t("preferences.reportIssue")}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-10 transition-transform group-hover:translate-x-0.5 dark:text-white/40" />
            </button>
            <button
              type="button"
              onClick={onShortcuts}
              className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/[0.05]"
            >
              <span className="flex items-center gap-2.5">
                <Keyboard
                  className="h-4 w-4 text-neutral-10 dark:text-white/60"
                  aria-hidden="true"
                />
                {t("preferences.shortcuts")}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-10 transition-transform group-hover:translate-x-0.5 dark:text-white/40" />
            </button>
          </div>
        </section>
      </div>
    );
  }
}

/**
 * Single mount-point for the account dialog. Wrap the authenticated shell
 * with this provider so any descendant can call `useAccountDialog().openDialog()`.
 *
 *   <AccountDialogMount>
 *     <FeedbackMount>...
 */
export function AccountDialogMount({
  children,
  planBadge,
}: {
  children: ReactNode;
  /**
   * Server-rendered slot for the subscription tab's plan badge.
   * Pass `<PlanBadge />` from a Server Component (e.g. the app layout) —
   * client code MUST NOT import `PlanBadge` directly, since it pulls in
   * server-only modules (`next/headers`, Prisma, Clerk).
   */
  planBadge?: ReactNode;
}) {
  return (
    <AccountDialogProvider>
      {children}
      <AccountDialog planBadge={planBadge} />
    </AccountDialogProvider>
  );
}
