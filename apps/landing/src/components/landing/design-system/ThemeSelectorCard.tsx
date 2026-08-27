"use client";

import { Droplet } from "@nebutra/icons";
import { DesignLanguageSwitcher } from "@nebutra/theme/language-switcher";
import { useTranslations } from "next-intl";

/**
 * The design-language switch, live, on the page it is a claim about.
 *
 * What stood here was a drawing of one: four swatches carrying `cursor-pointer`
 * and no handler, a code sample declaring a `themes` object this product does
 * not have, and a dashboard painted green by hand. A section whose headline is
 * about a design system, illustrated with a picture of a design system.
 *
 * The mechanism was real the whole time — `html[data-brand]` plus skins.css,
 * seven Brand Packages, already shipping. So the card runs it. Pressing Linear
 * here does not restyle this card; it restyles the entire page, because that is
 * what a Brand Package does, and a visitor watching the hero, the pricing table
 * and the footer change under one press has been told something no mockup can
 * tell them.
 *
 * The specimen below the buttons is deliberately made of the same tokens the
 * rest of the site is made of, with nothing hand-coloured: if a surface here
 * fails to move, that is a real gap in the language and should be visible.
 */
export function ThemeSelectorCard() {
  const t = useTranslations("designSystem");

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-6 md:p-8">
      <div className="relative z-10 mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
          <Droplet className="h-4 w-4" />
        </div>
        <h3 className="line-clamp-1 font-bold text-foreground text-lg tracking-tight">
          {t("card2Title")}
        </h3>
      </div>

      {/* No caption: the switcher's own is English prose, and this site is
          localised. The language names are proper nouns and need no translation.
          No legend either — the card heading above already names this. */}
      <DesignLanguageSwitcher className="relative z-10" showLegend={false} variant="compact" />

      <div className="relative z-10 mt-auto flex flex-col gap-3 rounded-[var(--radius-xl)] bg-muted/30 p-4">
        {/* Every one of these reads a token the language rewrites. The button is
            the action fill, the two discs are the identity mark and the accent
            the aliases now carry per language, the rule is the border role, and
            the radii come from the language's own control and surface slots. */}
        <div className="flex items-center gap-3">
          <span className="rounded-[var(--radius-button,var(--radius-md))] bg-primary px-3 py-1.5 font-medium text-[12px] text-primary-foreground shadow-ambient-sm">
            Deploy
          </span>
          <span className="rounded-[var(--radius-badge,999px)] bg-muted px-2.5 py-1 font-medium text-[11px] text-muted-foreground">
            Preview
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-4 rounded-full"
              // @allow-brand-hex: this dot IS the identity, shown as a swatch so a visitor can see the language they picked. The rule stops the identity becoming a control fill; a swatch is the one surface it belongs on.
              style={{ background: "var(--brand-primary)" }}
            />
            <span
              aria-hidden
              className="size-4 rounded-full"
              style={{ background: "var(--brand-accent)" }}
            />
          </span>
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex flex-col gap-1.5">
          <span className="h-2 w-2/3 rounded-full bg-foreground/25" />
          <span className="h-2 w-1/3 rounded-full bg-foreground/15" />
        </div>
      </div>
    </div>
  );
}
