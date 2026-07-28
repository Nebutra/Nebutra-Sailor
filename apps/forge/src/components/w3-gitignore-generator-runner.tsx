"use client";

/**
 * .gitignore generator — configure-then-generate (brief §8, docs/plans/tools/gitignore-generator.md).
 *
 * The options *are* the product: the file regenerates the moment the selected
 * stack set changes, so gitignore.io's separate "Create" click disappears. The
 * shell owns layout, idle/error states, the invoke and the exits; this file
 * owns the stack picker and the result projection only.
 */

import { CrossSmall, Plus } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  ConfigureGenerateShell,
  invokeForgeTool,
  ShellBadge,
  ShellCode,
  ShellNote,
} from "./journey-shells";

/** Corpus index tool — same registry, so autocomplete never forks the corpus. */
const STACKS_TOOL_ID = "template/gitignore-stacks";
const GENERATOR_TOOL_ID = "template/gitignore-generator";
const MAX_SUGGESTIONS = 8;

interface StackEntry {
  id: string;
  name: string;
  scope: "project" | "global";
  kind: string;
  aliases: string[];
}

interface GitignoreSection {
  id: string;
  name: string;
  scope: "project" | "global";
  kind: string;
  patterns: number;
}

interface GitignoreOutput {
  content: string;
  stacksResolved: string[];
  notFound: string[];
  sections: GitignoreSection[];
  globalScoped: string[];
  duplicatesRemoved: number;
  lines: number;
  bytes: number;
}

function normalize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

export function W3GitignoreGeneratorRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  // Both tools in this file's pair (generator + corpus index) can be routed
  // here by the workspace map; the merge call must always go to the generator,
  // never to the index tool, whose schema takes no `stacks`.
  const generateId = toolId.endsWith("gitignore-generator") ? toolId : GENERATOR_TOOL_ID;
  const [catalog, setCatalog] = useState<readonly StackEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<readonly string[]>([]);

  // One catalog fetch per mount; filtering afterwards is local, so typing never
  // hits the network. A failed load is not fatal — free text still resolves
  // server-side against the same corpus (aliases included).
  useEffect(() => {
    let live = true;
    void invokeForgeTool(STACKS_TOOL_ID, { limit: 500 }).then((result) => {
      if (!live || !result.ok) return;
      const stacks = result.output.stacks;
      if (Array.isArray(stacks)) setCatalog(stacks as StackEntry[]);
    });
    return () => {
      live = false;
    };
  }, []);

  const byId = useMemo(() => new Map(catalog.map((s) => [s.id, s])), [catalog]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    return catalog
      .filter((stack) => !selected.includes(stack.id))
      .filter(
        (stack) =>
          !q || [stack.id, stack.name, ...stack.aliases].some((key) => normalize(key).includes(q)),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [catalog, query, selected]);

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setSelected((current) => (current.includes(value) ? current : [...current, value]));
    setQuery("");
  };

  const remove = (id: string) => setSelected((current) => current.filter((s) => s !== id));

  const input = useMemo(() => (selected.length > 0 ? { stacks: [...selected] } : null), [selected]);

  return (
    <ConfigureGenerateShell<GitignoreOutput>
      engine={{ toolId: generateId }}
      input={input}
      emptyHint={t("gitignore.emptyHint")}
      regenerateLabel={t("gitignore.regenerate")}
      note={t("gitignore.untrackedNote")}
      exit={(output) => ({
        text: output.content,
        json: output,
        filename: ".gitignore",
        mimeType: "text/plain;charset=utf-8",
      })}
      renderResult={(output) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <ShellBadge tone="info">
              {t("gitignore.sections", { n: output.sections.length })}
            </ShellBadge>
            <ShellBadge>{t("gitignore.lines", { n: output.lines })}</ShellBadge>
            {output.duplicatesRemoved > 0 ? (
              <ShellBadge tone="success">
                {t("gitignore.deduped", { n: output.duplicatesRemoved })}
              </ShellBadge>
            ) : null}
            {output.notFound.length > 0 ? (
              <ShellBadge tone="warning">
                {t("gitignore.notFound", { stacks: output.notFound.join(", ") })}
              </ShellBadge>
            ) : null}
          </div>
          <ShellCode label={t("gitignore.fileLabel")}>{output.content}</ShellCode>
          {output.globalScoped.length > 0 ? (
            <ShellNote>
              {t("gitignore.globalScope", { stacks: output.globalScoped.join(", ") })}
            </ShellNote>
          ) : null}
        </div>
      )}
    >
      <div className="space-y-3">
        <Input
          id="gitignore-stack-search"
          label={t("gitignore.searchLabel")}
          value={query}
          placeholder={t("gitignore.searchPlaceholder")}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add(suggestions[0]?.id ?? query);
          }}
          spellCheck={false}
          autoComplete="off"
        />

        {selected.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={t("gitignore.selected")}>
            {selected.map((id) => {
              const entry = byId.get(id);
              return (
                <li key={id}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("gitignore.remove", { stack: entry?.name ?? id })}
                    onClick={() => remove(id)}
                  >
                    {entry?.name ?? id}
                    <CrossSmall className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {suggestions.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={t("gitignore.suggestions")}>
            {suggestions.map((stack) => (
              <li key={stack.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("gitignore.add", { stack: stack.name })}
                  onClick={() => add(stack.id)}
                >
                  <Plus className="h-4 w-4" />
                  {stack.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {catalog.length === 0 ? (
          <ShellNote>{t("gitignore.catalogFallback")}</ShellNote>
        ) : suggestions.length === 0 && query ? (
          <ShellNote>{t("gitignore.noMatches", { query })}</ShellNote>
        ) : null}
      </div>
    </ConfigureGenerateShell>
  );
}
