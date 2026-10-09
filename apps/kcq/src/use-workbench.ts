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
import { onBeforeUnmount, onMounted, shallowRef } from "vue";
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
import type { WalletState } from "./wallet";

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
  const signInUrl = buildAuthCenterSignInUrl(window.location.origin + APP_PATH, {
    NEXT_PUBLIC_AUTH_URL: `https://${brand.domains.auth}`,
  });
  async function switchWorkspace(id: string | null) {
    if (busy.value || id === (props.context?.activeWorkspaceId ?? null)) return;
    busy.value = true;
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
    unsubscribeData.forEach((unsubscribe) => {
      unsubscribe();
    });
    controller.value = value;
    const updateDataState = () => {
      hasData.value = value.data.peek().length > 0;
      dataLoading.value = value.dataLoading.peek();
      dataError.value = value.dataError.peek();
    };
    updateDataState();
    unsubscribeData = [value.data, value.dataLoading, value.dataError].map((signal) =>
      signal.subscribe(updateDataState),
    );
    bridge.bindChartAgent(value.agent);
    onThemeChange(value.theme.peek());
  }
  function onThemeChange(theme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  onMounted(() => {
    void refreshWallet();
    window.addEventListener("focus", onWalletFocus);
  });
  onBeforeUnmount(() => {
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
