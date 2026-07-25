import { ArrowRight, ArrowUpRight } from "@nebutra/icons";
import { AnimateInGroup } from "@nebutra/ui/components";
import {
  ArtifactShiftCard,
  ArtifactShiftCardFooter,
  ArtifactShiftCardPreview,
} from "@nebutra/ui/patterns";
import Link from "next/link";
import type { Locale } from "@/i18n/routing";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { CAPABILITY_FOLDERS, type CapabilityFolder } from "./capability-folder-data";
import { getCodeSampleForGroup } from "./feature-group-code-samples";

const SECTION_COPY = {
  docs: { en: "Open docs", zh: "打开文档" },
  detail: { en: "View artifact", zh: "查看能力" },
} as const;

type LocaleKey = "en" | "zh";
const toLocaleKey = (locale: Locale): LocaleKey => (isZhUiLocale(locale) ? "zh" : "en");

function copyFor(label: { en: string; zh: string }, locale: Locale) {
  return isZhUiLocale(locale) ? label.zh : label.en;
}

function previewCode(code: string, maxLines = 14): string {
  const lines = code.split("\n");
  if (lines.length <= maxLines) return code;
  return `${lines.slice(0, maxLines).join("\n")}\n…`;
}

function CapabilityCard({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const localeKey = toLocaleKey(locale);
  const Icon = folder.icon;
  const sample = getCodeSampleForGroup(folder.id);
  const code = previewCode(sample.code, 10);
  const featureHref = `/${locale}/features/${folder.id}`;
  const title = copyFor(folder.title, locale);

  return (
    <article className="group/card relative flex flex-col scroll-mt-28" id={folder.anchorId}>
      <ArtifactShiftCard className="landing-showcase-surface">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label={`${title} feature page`}
              href={featureHref}
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background/60 transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Icon className="size-4" />
            </Link>
            <span className="truncate font-mono text-foreground/80 text-sm" translate="no">
              {folder.sourcePath}
            </span>
          </div>
          <span className="hidden rounded-full border border-border/60 bg-background/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em] sm:inline-flex">
            artifact
          </span>
        </header>

        <div className="flex flex-col gap-3 pt-7 pb-5">
          <h3 className="font-semibold text-2xl text-foreground leading-tight sm:text-3xl">
            {title}
          </h3>
          <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
            {copyFor(folder.summary, locale)}
          </p>
        </div>

        <ArtifactShiftCardPreview
          filename={sample.filename}
          language={sample.language}
          code={code}
          label={`${title} artifact preview`}
        />

        <ArtifactShiftCardFooter>
          <a
            aria-label={`${SECTION_COPY.docs[localeKey]}: ${title}`}
            className="group/docs inline-flex items-center gap-2 font-semibold text-foreground text-sm transition-colors hover:text-muted-foreground"
            href={folder.docsHref}
            rel="noreferrer"
            target="_blank"
          >
            {SECTION_COPY.docs[localeKey]}
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover/docs:translate-x-0.5 group-hover/docs:-translate-y-0.5"
            />
          </a>
          <Link
            className="group/feat inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] transition-colors hover:text-foreground"
            href={featureHref}
          >
            {SECTION_COPY.detail[localeKey]}
            <ArrowRight
              aria-hidden="true"
              className="size-3 transition-transform group-hover/feat:translate-x-0.5"
            />
          </Link>
        </ArtifactShiftCardFooter>
      </ArtifactShiftCard>
    </article>
  );
}

export function CapabilityFolderShowcase({ locale }: { locale: Locale }) {
  return (
    <section
      className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8"
      id="capability-map"
    >
      <AnimateInGroup stagger="fast" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CAPABILITY_FOLDERS.map((folder) => (
          <CapabilityCard key={folder.id} folder={folder} locale={locale} />
        ))}
      </AnimateInGroup>
    </section>
  );
}
