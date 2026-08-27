// @microcopy-exempt: test-only translation fixture mirrors catalog copy for Vitest assertions.
import type { ReactNode } from "react";
import { vi } from "vitest";

type TranslationValues = Record<string, string | number | Date | null | undefined>;

const TRANSLATIONS: Record<string, string> = {
  "startupOs.emptyState.apiKeys": "No keys yet.",
  "startupOs.emptyState.apiKeysCta": "Create your first key",
  "startupOs.emptyState.webhookEndpoints": "Add an endpoint above to start receiving events.",
  "startupOs.errors.loadWebhookDeliveries": "Deliveries could not be loaded.",
  "startupOs.errors.loadWebhookEndpoints": "Endpoints could not be loaded.",
  "startupOs.errors.replayWebhookDelivery": "Replay did not go through.",
  "startupOs.fileTree.empty": "This project has no files yet.",
};

function formatKey(namespace: string | undefined, key: string, values?: TranslationValues) {
  const label = namespace ? `${namespace}.${key}` : key;
  const translated = TRANSLATIONS[label] ?? label;
  if (!values) {
    return translated;
  }

  return Object.entries(values).reduce(
    (current, [name, value]) => current.replaceAll(`{${name}}`, String(value ?? "")),
    translated,
  );
}

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
  useFormatter: () => ({
    dateTime: (value: Date | number | string) => new Date(value).toLocaleString(),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat("en", options).format(value),
    relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit = "second") =>
      new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit),
  }),
  useLocale: () => "en",
  useTranslations: (namespace?: string) => (key: string, values?: TranslationValues) =>
    formatKey(namespace, key, values),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
  usePathname: () => globalThis.location?.pathname ?? "/",
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(globalThis.location?.search ?? ""),
}));
