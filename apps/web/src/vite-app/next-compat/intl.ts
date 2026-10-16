/**
 * `next-intl` for the Vite product app (vite.config.ts aliases the bare
 * specifier here).
 *
 * The components this app shares with the Next build call next-intl's full
 * translator surface — `t()`, `t.raw()`, `t.rich()`, `t.markup()`, `t.has()` —
 * and its formatter. This module serves the same surface from use-intl's own
 * core (the library next-intl is built on) over the shared English catalog, so
 * a shared component behaves the same in both builds. A hand-rolled stand-in
 * used to sit here: it returned the key path instead of the message and had no
 * `.raw`, so the scaffold's /billing page crashed with "tp.raw is not a
 * function".
 */
import messages from "@nebutra/i18n/locales/en.json";
import type { ReactNode } from "react";
import { createFormatter, createTranslator } from "use-intl/core";

const LOCALE = "en";

function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const TIME_ZONE = resolveTimeZone();

type Translator = ReturnType<typeof createTranslator>;

const translators = new Map<string, Translator>();

/** One translator per namespace, so the function a component gets is stable across renders. */
function translatorFor(namespace: string | undefined): Translator {
  const cacheKey = namespace ?? "";
  let translator = translators.get(cacheKey);
  if (!translator) {
    translator = createTranslator({
      locale: LOCALE,
      messages,
      timeZone: TIME_ZONE,
      // A missing message renders its key path — visible, never a crash.
      getMessageFallback: ({ namespace: ns, key }: { namespace?: string; key: string }) =>
        ns ? `${ns}.${key}` : key,
      // `namespace` is a dotted runtime string; the typed overloads expect a literal.
      ...(namespace ? { namespace } : {}),
    } as unknown as Parameters<typeof createTranslator>[0]) as Translator;
    translators.set(cacheKey, translator);
  }
  return translator;
}

export function useTranslations(namespace?: string) {
  return translatorFor(namespace);
}

export function useLocale() {
  return LOCALE;
}

const formatter = createFormatter({ locale: LOCALE, timeZone: TIME_ZONE });

export function useFormatter() {
  return formatter;
}

export function useTimeZone() {
  return TIME_ZONE;
}

export function useMessages() {
  return messages;
}

/** The Vite app has one locale and no request scope, so the provider only passes children through. */
export function NextIntlClientProvider({ children }: { children?: ReactNode }) {
  return children ?? null;
}
