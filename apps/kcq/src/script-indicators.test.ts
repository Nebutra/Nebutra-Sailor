// @vitest-environment jsdom
/** Script registration must finish before chart mount and release its worker on unmount. */
import { SCRIPT_SOURCE_STORE_KEY } from "@363045841yyt/klinechart";
import {
  createBuiltinScriptService,
  type ScriptService,
} from "@363045841yyt/klinechart-script-chart";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, inject } from "vue";
import { initializeScriptIndicators } from "./script-indicators";

vi.mock("@363045841yyt/klinechart", () => ({
  SCRIPT_SOURCE_STORE_KEY: Symbol("ScriptSourceStore"),
}));
vi.mock("@363045841yyt/klinechart-script-chart", () => ({
  createBuiltinScriptService: vi.fn(),
}));

afterEach(() => vi.resetAllMocks());

it("awaits registration, provides the same source store and disposes on unmount", async () => {
  const scripts: ScriptService = {
    output: { subscribe: vi.fn(() => () => {}), clear: vi.fn() },
    create: vi.fn(),
    read: vi.fn(),
    list: vi.fn(() => []),
    update: vi.fn(),
    remove: vi.fn(),
    dispose: vi.fn(),
  };
  let finish: ((service: ScriptService) => void) | undefined;
  vi.mocked(createBuiltinScriptService).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  let provided: unknown;
  const app = createApp({
    setup() {
      provided = inject(SCRIPT_SOURCE_STORE_KEY);
      return () => null;
    },
  });
  let ready = false;
  const pending = initializeScriptIndicators(app).then(() => {
    ready = true;
  });
  await Promise.resolve();
  expect(ready).toBe(false);
  finish?.(scripts);
  await pending;
  app.mount(document.createElement("div"));
  expect(provided).toBe(scripts);
  expect(scripts.dispose).not.toHaveBeenCalled();
  app.unmount();
  expect(scripts.dispose).toHaveBeenCalledOnce();
});

it("propagates initialization failure before mounting a chart", async () => {
  const error = new Error("script archive unavailable");
  vi.mocked(createBuiltinScriptService).mockRejectedValue(error);
  await expect(initializeScriptIndicators(createApp({ render: () => null }))).rejects.toBe(error);
});
