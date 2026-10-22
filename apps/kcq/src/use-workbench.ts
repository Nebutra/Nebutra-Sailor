import { brand } from "@nebutra/brand/metadata";
/** Account/workspace actions are separate from chart presentation. */

import {
  AgentWorkbenchShell,
  BrowserAgentBridge,
  createAgentPanelWidthStorage,
  KlineChart,
} from "@363045841yyt/klinechart";
import { ReadOnlyProviderCredentialStore } from "@363045841yyt/klinechart-agent-runtime";
import { createBrowserRuntimeSessions } from "@363045841yyt/klinechart-agent-runtime/browser";
import type { ChartController } from "@363045841yyt/klinechart-core";
import { scopedPersistenceName } from "@363045841yyt/klinechart-core/persistence-scope";
import {
  type BrowserAuthContext,
  buildAuthCenterSignInUrl,
  type createAuthCenterBrowserClient,
} from "@nebutra/auth/browser";
import { computed, onBeforeUnmount, onMounted, shallowRef } from "vue";
import { createActivationAnalytics } from "./activation";
import { APP_PATH } from "./main-route";
import {
  createManagedAiClient,
  MANAGED_AI_CREDENTIAL,
  MANAGED_AI_MODEL,
  MANAGED_AI_NAME,
  MANAGED_AI_OUTPUT_TOKENS,
  managedAiFetch,
} from "./managed-ai";
import type { MarketConnections } from "./market-connections";
import { createQuickStart, MARKET_SHORTCUTS } from "./quick-start";
import type { WalletState } from "./wallet";
import { collectRunMilestones, type HelpSection } from "./workbench-support";

export { AgentWorkbenchShell, KlineChart };
export interface WorkbenchProps {
  context: BrowserAuthContext | null;
  auth: ReturnType<typeof createAuthCenterBrowserClient>;
  scope: string;
  marketConnections: MarketConnections;
}
export function useWorkbench(props: WorkbenchProps) {
  const busy = shallowRef(false);
  const error = shallowRef("");
  const controller = shallowRef<ChartController | null>(null);
  const hasData = shallowRef(false);
  const dataLoading = shallowRef(false);
  const dataError = shallowRef<string | null>(null);
  const hasSelection = shallowRef(false);
  const chartReady = shallowRef(false);
  const help = shallowRef<HelpSection | null>(null);
  const helpReturnFocus = shallowRef<HTMLElement | null>(null);
  const chartTheme = shallowRef<"light" | "dark">("light");
  const supportViewport = shallowRef<"compact" | "wide">(
    window.innerWidth < 880 ? "compact" : "wide",
  );
  const analytics = createActivationAnalytics({
    storage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    doNotTrack: () =>
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
    config: import.meta.env.VITE_PUBLIC_POSTHOG_KEY
      ? {
          posthog: {
            apiKey: import.meta.env.VITE_PUBLIC_POSTHOG_KEY,
            host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? `https://${brand.domains.analytics}`,
          },
        }
      : {},
  });
  const analyticsConsent = shallowRef(analytics.getConsent());
  const quickStart = createQuickStart({
    getController: () => controller.value,
    track: analytics.track,
  });
  const collectRuns = collectRunMilestones(Date.now());
  let chartLoaded = false;
  const diagnostics = computed(() => ({
    chartRevision: __KCQ_CHART_REVISION__,
    theme: chartTheme.value,
    viewport: supportViewport.value,
  }));
  function openHelp(section: HelpSection, returnFocus?: HTMLElement) {
    supportViewport.value = window.innerWidth < 880 ? "compact" : "wide";
    helpReturnFocus.value = returnFocus ?? null;
    analyticsConsent.value = analytics.getConsent();
    help.value = section;
    void analytics.track({ action: section === "guide" ? "guide_opened" : "feedback_opened" });
  }
  function setAnalyticsConsent(enabled: boolean) {
    const saved = analytics.setConsent(enabled);
    analyticsConsent.value = analytics.getConsent();
    return saved;
  }
  function retryChart() {
    const chart = controller.value;
    const spec = chart?.symbols.peek()[0];
    if (chart && spec && !dataLoading.value) chart.resetToFetcher(spec);
  }
  let unsubscribeData: (() => void)[] = [];
  // The workspace named here is the one whose KCQ wallet pays for Agent calls and the one
  // the balance chip reads, so what is shown is always what is spent.
  const workspace = props.context?.activeWorkspaceId ?? "personal";
  const wallet = shallowRef<WalletState>({ status: "loading" });
  const lowBalance = shallowRef(false);
  let walletRequest: AbortController | undefined;
  // The gateway picks the model and tier from the session; the placeholder id is never routed.
  const managedAi = createManagedAiClient(window.location.origin, undefined, workspace);
  async function refreshWallet() {
    if (!props.context) return;
    walletRequest?.abort();
    const request = new AbortController();
    walletRequest = request;
    try {
      const next = await managedAi.getWallet(request.signal);
      if (!request.signal.aborted) wallet.value = next;
    } catch {
      if (!request.signal.aborted) wallet.value = { status: "error" };
    }
  }
  function onWalletFocus() {
    if (document.visibilityState === "visible") void refreshWallet();
  }
  const bridge = new BrowserAgentBridge({
    managedProvider: {
      name: MANAGED_AI_NAME,
      baseUrl: managedAi.baseUrl,
      model: { id: MANAGED_AI_MODEL, maxOutputTokens: MANAGED_AI_OUTPUT_TOKENS },
      credentials: new ReadOnlyProviderCredentialStore(MANAGED_AI_CREDENTIAL),
      fetch: managedAiFetch(undefined, workspace, {
        // The library only sees a failed request; the shell offers the way forward.
        onInsufficientBalance: () => {
          lowBalance.value = true;
          void refreshWallet();
        },
      }),
    },
    getChartAgent: () => controller.value?.agent,
    createSessions: (redaction) =>
      createBrowserRuntimeSessions({
        databaseName: scopedPersistenceName("agent-sessions"),
        redaction,
      }),
  });
  const panelWidthStorage = createAgentPanelWidthStorage();
  const unsubscribeAgent = bridge.subscribe((event) => {
    if (event.type !== "session.snapshot") return;
    for (const action of collectRuns(event.snapshot.runs)) void analytics.track({ action });
  });
  const signInUrl = buildAuthCenterSignInUrl(window.location.origin + APP_PATH, {
    NEXT_PUBLIC_AUTH_URL: `https://${brand.domains.auth}`,
  });
  async function switchWorkspace(id: string | null) {
    if (busy.value || id === (props.context?.activeWorkspaceId ?? null)) return;
    busy.value = true;
    quickStart.cancel();
    error.value = "";
    try {
      await props.auth.selectWorkspace(id);
      await bridge.close();
      window.location.reload();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "工作区切换失败，请重试。";
      busy.value = false;
    }
  }
  async function signOut() {
    busy.value = true;
    quickStart.cancel();
    error.value = "";
    try {
      await props.auth.signOut();
      await bridge.close();
      window.location.reload();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "退出失败，请重试。";
      busy.value = false;
    }
  }
  function onControllerReady(value: ChartController) {
    quickStart.cancel();
    unsubscribeData.forEach((unsubscribe) => {
      unsubscribe();
    });
    controller.value = value;
    chartReady.value = true;
    const updateDataState = () => {
      hasData.value = value.data.peek().length > 0;
      hasSelection.value = value.symbols.peek().some((spec) => Boolean(spec.symbol.trim()));
      if (hasSelection.value && (quickStart.loading.value || quickStart.error.value))
        quickStart.cancel();
      dataLoading.value = value.dataLoading.peek();
      dataError.value = value.dataError.peek();
      if (hasData.value && !chartLoaded) {
        chartLoaded = true;
        void analytics.track({ action: "chart_loaded" });
      }
    };
    updateDataState();
    unsubscribeData = [value.data, value.dataLoading, value.dataError, value.symbols].map(
      (signal) => signal.subscribe(updateDataState),
    );
    bridge.bindChartAgent(value.agent);
    onThemeChange(value.theme.peek());
  }
  function onThemeChange(theme: "light" | "dark") {
    chartTheme.value = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  onMounted(() => {
    void analytics.track({ action: "workbench_opened" });
    void refreshWallet();
    window.addEventListener("focus", onWalletFocus);
  });
  onBeforeUnmount(() => {
    quickStart.cancel();
    controller.value = null;
    unsubscribeAgent();
    walletRequest?.abort();
    window.removeEventListener("focus", onWalletFocus);
    unsubscribeData.forEach((unsubscribe) => {
      unsubscribe();
    });
    void bridge.close();
  });
  return {
    busy,
    wallet,
    lowBalance,
    refreshWallet,
    hasData,
    dataLoading,
    dataError,
    hasSelection,
    chartReady,
    quickStart,
    shortcuts: MARKET_SHORTCUTS,
    retryChart,
    help,
    helpReturnFocus,
    openHelp,
    analyticsConsent,
    setAnalyticsConsent,
    diagnostics,
    error,
    bridge,
    panelWidthStorage,
    signInUrl,
    switchWorkspace,
    signOut,
    onControllerReady,
    onThemeChange,
  };
}
