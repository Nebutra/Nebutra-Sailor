"use client";

import { useAuth } from "@nebutra/auth/client";
import {
  ArrowRight,
  CreditCard,
  Command as Keyboard,
  Lifebuoy as LifeBuoy,
  LoaderCircle as Loader2,
  Envelope as Mail,
  DeviceDesktop as Monitor,
  Moon,
  SettingsGear as SettingsIcon,
  Sparkles,
  Sun,
  User,
  Sparkles as Wand2,
} from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import {
  BrandMark,
  Button,
  Dialog,
  DialogContent,
  Entity,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import dynamic from "next/dynamic";
import Image from "next/image";
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
import { dicebearAvatarUrl } from "@/lib/avatar";

/**
 * AccountDialog — unified account modal (Profile / Subscription / Preferences).
 *
 * Replaces the previous theme-only QuickSettings template. Built on the
 * `@nebutra/ui/primitives` Dialog (focus trap + ESC + restore for free).
 *
 * Deep-link to `/settings/*` is preserved — every tab has an "Open full
 * settings" footer link. The dialog is a complement, not a replacement.
 *
 * Keyboard shortcut: ⌘, opens / toggles.
 */

type TabId = "profile" | "personalization" | "subscription" | "preferences";

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
  { id: "preferences", labelKey: "tabs.preferences", icon: SettingsIcon },
];

const PersonalizationTab = dynamic(
  () =>
    import("@/components/personalization/personalization-tab").then(
      (module) => module.PersonalizationTab,
    ),
  {
    loading: () => (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  },
);

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
            className="shrink-0 border-b border-border bg-muted/30 p-3 sm:w-[200px] sm:border-b-0 sm:border-r"
          >
            <div className="mb-3 px-2 pt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
                      // Same current-page treatment as SidebarNav: soft surface,
                      // accent spent on the icon. The old classes carried an
                      // invalid opacity stack (bg-primary/10/60) that emitted
                      // nothing, so the active tab had no surface at all.
                      className={`flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-left text-[13px] leading-5 transition-[background-color,color] duration-micro ease-brand ${
                        isActive
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/55 hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={cn("h-4 w-4 shrink-0", isActive && "text-primary")}
                        aria-hidden="true"
                      />
                      <span className="truncate">{t(tab.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right panel */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  {t(`${activeTab}.title`)}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
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

            <footer className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
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
              <Image
                src={imageUrl}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-[var(--radius-2xl)] object-cover ring-2 ring-border"
              />
            ) : (
              <img
                src={dicebearAvatarUrl(email ?? name)}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-[var(--radius-2xl)] object-cover ring-2 ring-border"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {name ?? email ?? t("profile.unknown")}
            </p>
            {email && (
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{email}</span>
              </p>
            )}
          </div>
        </div>

        <Entity
          as="button"
          chevron
          onClick={onOpenFull}
          className="rounded-[var(--radius-lg)] border border-border bg-card hover:bg-accent/40"
          left={<SettingsIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        >
          <Entity.Content title={t("profile.manageCta")} />
        </Entity>
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
        {/* One surface, one accent. This card used to stack a primary-tinted
            gradient, a haloed gradient brand mark, a blue badge and a blue CTA
            — four blues in one panel. The brand mark stays (identity, small);
            the tint and the halo go. */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("subscription.currentPlan")}
              </p>
              <div className="mt-2">{planBadge}</div>
            </div>
            <BrandMark size="md" variant="gradient">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </BrandMark>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="group w-full justify-between"
            size="sm"
            type="button"
            onClick={onUpgrade}
            suffix={
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            }
          >
            {t("subscription.upgradeCta")}
          </Button>
          <Entity
            as="button"
            chevron
            onClick={onManage}
            className="rounded-[var(--radius-lg)] border border-border bg-card hover:bg-accent/40"
            left={<CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          >
            <Entity.Content title={t("subscription.manageCta")} />
          </Entity>
        </div>
      </div>
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("preferences.theme")}
          </p>
          <ToggleGroup
            type="single"
            variant="pill"
            value={theme ?? ""}
            onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
            aria-label={t("preferences.theme")}
            className="grid w-full grid-cols-3 gap-2 rounded-none bg-transparent p-0"
          >
            {(
              [
                { id: "light", icon: Sun },
                { id: "dark", icon: Moon },
                { id: "system", icon: Monitor },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              return (
                <ToggleGroupItem
                  key={option.id}
                  value={option.id}
                  variant="pill"
                  // The dark: overrides carried the same invalid opacity stack
                  // (bg-primary/5/20) as the tab rail; the semantic tokens already
                  // switch per mode, so the overrides were noise.
                  className="h-auto flex-col gap-1.5 rounded-[var(--radius-lg)] border border-border bg-card px-3 py-3 text-xs font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{t(`preferences.${option.id}`)}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("preferences.help")}
          </p>
          <div className="flex flex-col gap-1.5">
            <Entity
              as="button"
              chevron
              onClick={onReportIssue}
              className="rounded-[var(--radius-lg)] hover:bg-accent/40"
              left={<LifeBuoy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            >
              <Entity.Content title={t("preferences.reportIssue")} />
            </Entity>
            <Entity
              as="button"
              chevron
              onClick={onShortcuts}
              className="rounded-[var(--radius-lg)] hover:bg-accent/40"
              left={<Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            >
              <Entity.Content title={t("preferences.shortcuts")} />
            </Entity>
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
