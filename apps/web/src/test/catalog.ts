import { createTranslator } from "use-intl";
import messages from "../../../../packages/platform/i18n/locales/en.json";

/**
 * A translator over the real English catalog, for test files that mock
 * next-intl themselves: route the namespaces they don't stub through this so
 * the component's copy renders as users read it.
 */
export function catalogT(namespace?: string) {
  return createTranslator({
    locale: "en",
    messages,
    ...(namespace ? { namespace: namespace as never } : {}),
    onError: () => {},
    getMessageFallback: ({ namespace: ns, key }) => (ns ? `${ns}.${key}` : key),
  }) as unknown as (key: string, values?: Record<string, unknown>) => string;
}
