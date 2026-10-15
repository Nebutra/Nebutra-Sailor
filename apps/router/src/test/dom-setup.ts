/**
 * Setup for the `dom` vitest project only (see `vitest.config.ts`).
 *
 * `jest-dom` supplies `toBeInTheDocument` / `toBeDisabled`; the cleanup keeps
 * one test's tree from being queried by the next one, which is how a component
 * test starts passing for the wrong reason.
 *
 * next-intl is bound to the real catalogs (Simplified Chinese over the English
 * source, the way the app resolves a zh-Hans viewer), so component tests read
 * the same sentences a user sees without each one mounting a provider.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import en from "../../messages/en.json";
import zhHans from "../../messages/zh-Hans.json";

type Tree = { [key: string]: string | Tree };

function merge(base: Tree, override: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      typeof value === "object" && typeof current === "object" ? merge(current, value) : value;
  }
  return out;
}

const messages = merge(en as Tree, zhHans as Tree);

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return {
    ...actual,
    useTranslations: (namespace?: string) =>
      actual.createTranslator({ locale: "zh-Hans", messages, namespace } as never),
  };
});

vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  return {
    getTranslations: async (options?: string | { namespace?: string }) =>
      actual.createTranslator({
        locale: "zh-Hans",
        messages,
        namespace: typeof options === "string" ? options : options?.namespace,
      } as never),
  };
});

afterEach(() => {
  cleanup();
});
