import { toMessageLocale } from "./locales";
import { loadMessages } from "./messages";

/**
 * Translations for @nebutra/ui's own strings (close buttons, the colour
 * picker, the data table…) — the `ui` catalog, ui-labels/<locale>.json, filled
 * by the translation workflow like any other. English is the library's
 * DEFAULT_UI_LABELS; ui-labels/en.json mirrors it and the architecture tests
 * keep them equal.
 *
 * Server-side, once per request, into the client provider:
 *
 *   <UiLabelsProvider labels={await loadUiLabels(locale)}>
 *
 * The result is a few KB; it is the whole catalog because any page can mount
 * any primitive.
 */
export async function loadUiLabels(locale: null | string | undefined) {
  return loadMessages(toMessageLocale(locale), (l) => import(`../ui-labels/${l}.json`));
}
