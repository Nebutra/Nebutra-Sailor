/**
 * The page locale is the route (`/home` vs `/zh/home`): the URL is the state. Prerender renders each
 * locale separately, so nothing here may live in a module singleton.
 */
import { computed } from "vue";
import { useRoute } from "vue-router";
import { DEFAULT_PUBLIC_LOCALE, type PublicLocale } from "../routes";

const INTL: Record<PublicLocale, string> = { en: "en-US", zh: "zh-CN" };

export function usePublicLocale() {
  const route = useRoute();
  const locale = computed<PublicLocale>(() => route.meta.locale ?? DEFAULT_PUBLIC_LOCALE);
  /** BCP 47 tag for `Intl` formatting (numbers and dates). */
  const intl = computed(() => INTL[locale.value]);
  return { locale, intl };
}
