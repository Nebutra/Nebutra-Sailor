import { Check, Globe } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type LocaleRow = {
  code: string;
  text: string;
};

const ROWS: ReadonlyArray<LocaleRow> = [
  { code: "en", text: "Welcome back, {name}!" },
  { code: "zh", text: "欢迎回来，{name}！" },
  { code: "ja", text: "{name}さん、おかえり!" },
  { code: "es", text: "¡Bienvenido, {name}!" },
];

export function I18nGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 overflow-hidden rounded-md bg-[var(--neutral-1)] p-3"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
          <span className="font-mono text-[10px] text-[var(--neutral-12)]">i18n</span>
          <span className="font-mono text-[10px] text-[var(--neutral-10)]">·</span>
          <Badge
            variant="outline"
            className="h-4 rounded-sm border-[var(--neutral-6)] px-1 font-mono text-[9px] text-[var(--neutral-11)]"
          >
            7 locales
          </Badge>
          <Badge
            variant="outline"
            className="h-4 rounded-sm border-[var(--neutral-6)] px-1 font-mono text-[9px] text-[var(--neutral-11)]"
          >
            2,401 keys
          </Badge>
        </div>
        <span className="font-mono text-[9px] text-[var(--neutral-10)]">auth.welcome</span>
      </div>

      {/* Locale grid */}
      <div className="flex flex-col gap-1">
        {ROWS.map((row) => (
          <div
            key={row.code}
            className="flex items-center gap-1.5 rounded-sm border border-[var(--neutral-5)] bg-[var(--neutral-2)] px-1.5 py-1"
          >
            <span className="w-5 shrink-0 font-mono text-[9px] uppercase text-[var(--brand-primary)]">
              {row.code}
            </span>
            <span className="font-mono text-[9px] text-[var(--neutral-10)]">·</span>
            <span className="flex-1 truncate font-mono text-[10px] text-[var(--neutral-12)]">
              {row.text}
            </span>
            <Check className="h-2.5 w-2.5 shrink-0 text-[var(--status-success)]" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between font-mono text-[9px] text-[var(--neutral-10)]">
        <span>next-intl · ICU MessageFormat</span>
        <span className="text-[var(--status-success)]">99.2% coverage</span>
      </div>
    </div>
  );
}
