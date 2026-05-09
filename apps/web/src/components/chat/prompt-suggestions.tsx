"use client";

import { Activity, Bug, Mail, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";

type SuggestionKey = "activity" | "debug" | "email" | "features";

interface SuggestionDefinition {
  key: SuggestionKey;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const SUGGESTIONS: readonly SuggestionDefinition[] = [
  { key: "activity", Icon: Activity },
  { key: "debug", Icon: Bug },
  { key: "email", Icon: Mail },
  { key: "features", Icon: Sparkles },
] as const;

export interface PromptSuggestionsProps {
  /** Called with the prompt text when a suggestion card is selected. */
  onSelect: (prompt: string) => void;
  /** Disables interaction (e.g. while the chat is streaming). */
  disabled?: boolean;
}

/**
 * Cold-start UX: a 2x2 grid of clickable suggestion cards rendered when the
 * conversation is empty. Each card translates a `chat.suggestions.<key>.*`
 * label/prompt pair and invokes `onSelect(prompt)` on click.
 */
export function PromptSuggestions({ onSelect, disabled = false }: PromptSuggestionsProps) {
  const t = useTranslations("chat.suggestions");

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-center text-sm text-neutral-11 dark:text-white/70">{t("title")}</p>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ key, Icon }) => {
          const title = t(`${key}.title`);
          const prompt = t(`${key}.prompt`);
          return (
            <button
              key={key}
              type="button"
              aria-label={title}
              disabled={disabled}
              onClick={() => onSelect(prompt)}
              className="flex flex-col items-start gap-2 rounded-xl border border-neutral-7 bg-neutral-1 p-4 text-left transition-colors hover:bg-neutral-2 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 disabled:opacity-50 dark:border-white/15 dark:bg-black/30 dark:hover:bg-white/5"
            >
              <Icon className="h-4 w-4 text-blue-10 dark:text-cyan-9" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-12 dark:text-white">{title}</span>
              <span className="line-clamp-2 text-xs text-neutral-11 dark:text-white/60">
                {prompt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
