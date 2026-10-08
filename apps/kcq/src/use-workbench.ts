/** Account/workspace actions are separate from chart presentation. */

import {
  AgentWorkbenchShell,
  BrowserAgentBridge,
  createAgentPanelWidthStorage,
  KlineChart,
} from "@363045841yyt/klinechart";
import { createBrowserRuntimeSessions } from "@363045841yyt/klinechart-agent-runtime/browser";
import type { ChartController } from "@363045841yyt/klinechart-core";
import { scopedPersistenceName } from "@363045841yyt/klinechart-core/persistence-scope";
import {
  type BrowserAuthContext,
  buildAuthCenterSignInUrl,
  type createAuthCenterBrowserClient,
} from "@nebutra/auth/browser";
import { onBeforeUnmount, shallowRef } from "vue";

import type { MarketConnections } from "./market-connections";

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
  const bridge = new BrowserAgentBridge({
    getChartAgent: () => controller.value?.agent,
    createSessions: (redaction) =>
      createBrowserRuntimeSessions({
        databaseName: scopedPersistenceName("agent-sessions"),
        redaction,
      }),
  });
  const panelWidthStorage = createAgentPanelWidthStorage();
  const signInUrl = buildAuthCenterSignInUrl(window.location.origin + "/", {
    NEXT_PUBLIC_AUTH_URL: "https://auth.nebutra.com",
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
  onBeforeUnmount(() => {
    unsubscribeData.forEach((unsubscribe) => {
      unsubscribe();
    });
    void bridge.close();
  });
  return {
    busy,
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
