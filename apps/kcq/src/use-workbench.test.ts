// @vitest-environment jsdom
import type { ChartController } from "@363045841yyt/klinechart-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h } from "vue";
import { useWorkbench, type WorkbenchProps } from "./use-workbench";

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  close: vi.fn(async () => {}),
  unsubscribeAgent: vi.fn(),
  bindChartAgent: vi.fn(),
  listener: undefined as ((event: unknown) => void) | undefined,
}));
vi.mock("./activation", () => ({
  createActivationAnalytics: () => ({
    track: mocks.track,
    getConsent: () => false,
    setConsent: () => true,
  }),
}));
vi.mock("@363045841yyt/klinechart", () => ({
  KlineChart: {},
  AgentWorkbenchShell: {},
  createAgentPanelWidthStorage: () => ({}),
  BrowserAgentBridge: class {
    bindChartAgent = mocks.bindChartAgent;
    close = mocks.close;
    subscribe(listener: (event: unknown) => void) {
      mocks.listener = listener;
      return mocks.unsubscribeAgent;
    }
  },
}));
vi.mock("@363045841yyt/klinechart-agent-runtime", () => ({
  ReadOnlyProviderCredentialStore: class {},
}));
vi.mock("@363045841yyt/klinechart-agent-runtime/browser", () => ({
  createBrowserRuntimeSessions: vi.fn(),
}));

function signal<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    peek: () => value,
    set: (next: T) => {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    listeners,
  };
}
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("workbench activation lifecycle", () => {
  it("tracks loaded charts once, retries through the public API and releases subscriptions", () => {
    vi.stubGlobal("__KCQ_CHART_REVISION__", "source-revision");
    const data = signal<unknown[]>([]);
    const symbols = signal([{ symbol: "BTCUSDT", market: "crypto" }]);
    const dataLoading = signal(false);
    const dataError = signal<string | null>(null);
    const resetToFetcher = vi.fn();
    let workbench!: ReturnType<typeof useWorkbench>;
    const app = createApp({
      setup: function WorkbenchHarness() {
        workbench = useWorkbench({ context: null } as WorkbenchProps);
        return () => h("div");
      },
    });
    const host = document.createElement("div");
    app.mount(host);
    workbench.onControllerReady({
      data,
      symbols,
      dataLoading,
      dataError,
      theme: signal("dark"),
      agent: {},
      resetToFetcher,
    } as unknown as ChartController);
    expect(workbench.hasSelection.value).toBe(true);
    workbench.retryChart();
    expect(resetToFetcher).toHaveBeenCalledWith(symbols.peek()[0]);
    data.set([{}]);
    data.set([{}, {}]);
    expect(
      mocks.track.mock.calls.filter(([event]) => event.action === "chart_loaded"),
    ).toHaveLength(1);
    workbench.openHelp("feedback");
    expect(workbench.help.value).toBe("feedback");
    expect(mocks.track).toHaveBeenCalledWith({ action: "feedback_opened" });
    app.unmount();
    expect(data.listeners.size).toBe(0);
    expect(symbols.listeners.size).toBe(0);
    expect(mocks.unsubscribeAgent).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
