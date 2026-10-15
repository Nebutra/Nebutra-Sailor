"use client";

/**
 * ⌘K search over the static Orama index of the current language (/docs/search.json,
 * /zh/docs/search.json). The client rebuilds the zh database with the same tokenizer the index
 * was built with; Orama has no built-in Chinese tokenizer. Based on fumadocs-ui's default dialog.
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
import { useMemo } from "react";
import { createCjkTokenizer } from "@/lib/cjk-tokenizer";
import { docsPath, isLang } from "@/lib/i18n";

export function DocsSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const lang = isLang(locale) ? locale : "en";
  const client = useMemo(
    () =>
      oramaStaticClient({
        from: `${docsPath(lang)}/search.json`,
        locale: lang,
        initOrama: (dbLocale) =>
          create({
            schema: { _: "string" },
            ...(dbLocale === "zh"
              ? { components: { tokenizer: createCjkTokenizer() } }
              : { language: "english" }),
          }),
      }),
    [lang],
  );
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
