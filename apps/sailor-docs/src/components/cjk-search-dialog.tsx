"use client";

/**
 * Replaces fumadocs-ui's `DefaultSearchDialog` (via `RootProvider`'s
 * `search.SearchDialog` override) for one reason: `DefaultSearchDialog`
 * hardcodes `useDocsSearch({ type: "static", from: api, locale, tag })`,
 * which builds its client through `oramaStaticClient`'s DEFAULT
 * `initOrama(locale) => create({ schema: { _: "string" }, language: locale })`
 * — and `@orama/orama`'s built-in tokenizer has no "zh" entry:
 *
 *   > Language "zh" is not supported.
 *
 * `create()` THROWS synchronously for the zh locale, so the search dialog
 * was entirely broken on `/zh/*` pages (verified locally, not just a
 * degraded-quality issue). `src/app/api/search/route.ts` already solved
 * this server-side with a `localeMap: { zh: { tokenizer: createCjkTokenizer() } }`
 * override when it BUILDS the exported index; this component makes the
 * CLIENT reconstruct the same tokenizer when it re-hydrates that index —
 * query-time tokenization must match index-time tokenization, or the
 * client-rebuilt zh database can't even be constructed, let alone searched.
 *
 * `useDocsSearch`'s typed `ClientPreset` union has no `initOrama` passthrough
 * for `type: "static"` (only `api`/`delayMs`/etc — see
 * fumadocs-core/search/client.d.ts), but it does accept a fully custom
 * `{ client: SearchClient }`, which `oramaStaticClient` (also exported from
 * fumadocs-core/search/client) itself IS. This is that: a copy of
 * `DefaultSearchDialog`'s UI, calling `useDocsSearch` with a manually built
 * `oramaStaticClient` instead of the default preset.
 */
import { create } from "@orama/orama";
import { useDocsSearch } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { BASE_PATH } from "@/lib/base-path";
import { createCjkTokenizer } from "@/lib/cjk-tokenizer";

const api = `${BASE_PATH}/api/search`;

export function CjkSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const client = oramaStaticClient({
    from: api,
    locale,
    initOrama: (dbLocale) =>
      create({
        schema: { _: "string" },
        // Mirrors src/app/api/search/route.ts's `localeMap`. Every other
        // locale keeps Orama's built-in per-language splitter.
        ...(dbLocale === "zh"
          ? { components: { tokenizer: createCjkTokenizer() } }
          : { language: dbLocale }),
      }),
  });
  const { search, setSearch, query } = useDocsSearch({ client, delayMs: 100 });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
      <SearchDialogFooter />
    </SearchDialog>
  );
}
