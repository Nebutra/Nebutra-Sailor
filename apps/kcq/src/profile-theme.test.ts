// @vitest-environment jsdom
/** Account pages await the active layout's settings before applying chart tokens. */
import { readActiveLayoutSettings } from "@363045841yyt/klinechart-core/config";
import { afterEach, expect, it, vi } from "vitest";
import { initializeProfileTheme } from "./profile-theme";

vi.mock("@363045841yyt/klinechart-core/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@363045841yyt/klinechart-core/config")>()),
  readActiveLayoutSettings: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  document.documentElement.classList.remove("dark");
});

it("waits for layout settings and leaves browser storage unchanged", async () => {
  let finishRead: ((settings: { theme: "dark" }) => void) | undefined;
  vi.mocked(readActiveLayoutSettings).mockImplementation(
    () =>
      new Promise((resolve) => {
        finishRead = resolve;
      }),
  );
  const write = vi.spyOn(Storage.prototype, "setItem");
  const pending = initializeProfileTheme();
  expect(document.documentElement.classList.contains("dark")).toBe(false);
  expect(finishRead).toBeDefined();
  finishRead?.({ theme: "dark" });
  await pending;
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(document.documentElement.style.colorScheme).toBe("dark");
  expect(document.body.style.getPropertyValue("--klc-color-ui-background")).not.toBe("");
  expect(write).not.toHaveBeenCalled();
});

it.each([true, false])("resolves system appearance when dark preference is %s", async (matches) => {
  vi.mocked(readActiveLayoutSettings).mockResolvedValue({ theme: "auto" });
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches }));
  await initializeProfileTheme();
  expect(document.documentElement.style.colorScheme).toBe(matches ? "dark" : "light");
  expect(document.documentElement.classList.contains("dark")).toBe(matches);
});
