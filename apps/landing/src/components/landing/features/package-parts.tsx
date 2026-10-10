import { Link } from "@/i18n/navigation";
import type { CapabilityFolder } from "./capability-folder-data";
import { getGlyphCopy, getSubpackageGlyph } from "./glyphs";
import {
  getFeatureSummary,
  type PackageCatalogTranslator,
  type PackageFeatureEntry,
  toSerializablePackageFeatureEntry,
} from "./package-feature-data";

/**
 * The pieces /features and /features/[name] share. They follow the site's
 * rules (src/nebutra/DESIGN.md): real things only, numbers in sentences,
 * no label that carries no information.
 *
 * Copy lives in the `packageCatalog` i18n namespace
 * (apps/landing/messages/*.json), looked up here via the `t` function the
 * caller passes in (`getTranslations({ namespace: "packageCatalog" })` on
 * the server) — these helpers never call next-intl themselves.
 */

/** "42 packages, 318 source files and 161 test files in packages/ai." — from the generated, test-checked stats. */
export function sourceSentence(folder: CapabilityFolder, t: PackageCatalogTranslator): string {
  const { unitCount, sourceFiles, testFiles } = folder.sourceStats;
  return t("page.sourceSentence", {
    count: unitCount,
    unit: t(`folders.${folder.id}.sourceStats.unitLabel`),
    sourceFiles,
    testFiles,
    path: folder.sourcePath,
  });
}

/** How a domain fits together: its load-bearing packages, each with what it carries. */
export function TopologyList({
  folderId,
  nodes,
  t,
  compact = false,
}: {
  folderId: string;
  nodes: CapabilityFolder["topology"]["nodes"];
  t: PackageCatalogTranslator;
  /** Stacked name over detail, for a narrow column. */
  compact?: boolean;
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {nodes.map((node, index) => (
        <li
          key={node.label}
          className={
            compact
              ? "grid grid-cols-1 gap-0.5 py-3"
              : "grid grid-cols-1 gap-1 py-4 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
          }
        >
          <span className="font-mono text-sm text-foreground" translate="no">
            {node.label}
          </span>
          <span className="text-sm text-muted-foreground">
            {t(`folders.${folderId}.topology.nodes.${index}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A package as a card: its glyph above, its name and one sentence below. */
export function PackageCard({
  entry,
  href,
  t,
}: {
  entry: PackageFeatureEntry;
  href: string;
  t: PackageCatalogTranslator;
}) {
  const Glyph = getSubpackageGlyph(entry.slug);
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card transition-colors duration-micro hover:border-foreground/25"
    >
      {Glyph ? (
        <div className="border-b border-border bg-background/40 p-4">
          <Glyph
            entry={toSerializablePackageFeatureEntry(entry)}
            copy={getGlyphCopy(entry.slug, t)}
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <span className="font-mono text-sm text-foreground" translate="no">
          {entry.label}
        </span>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {getFeatureSummary(entry, t)}
        </p>
      </div>
    </Link>
  );
}

/** A package as a row: name, one sentence. For lists where a glyph would crowd. */
export function PackageRows({
  entries,
  hrefFor,
  t,
}: {
  entries: PackageFeatureEntry[];
  hrefFor: (entry: PackageFeatureEntry) => string;
  t: PackageCatalogTranslator;
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link
            href={hrefFor(entry)}
            className="group grid grid-cols-1 gap-1 py-4 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
          >
            <span
              className="font-mono text-sm text-foreground transition-colors duration-micro group-hover:text-secondary-foreground"
              translate="no"
            >
              {entry.label}
            </span>
            <span className="line-clamp-2 text-sm text-muted-foreground">
              {getFeatureSummary(entry, t)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * A domain's lead packages as a bento of their hand-made glyphs: the first
 * tile spans the row, the next two share it. The glyphs are the real,
 * per-package drawings, so a domain shows what it does before it says it.
 */
export function GlyphBento({
  entries,
  t,
}: {
  entries: PackageFeatureEntry[];
  t: PackageCatalogTranslator;
}) {
  const tiles = entries.filter((e) => getSubpackageGlyph(e.slug)).slice(0, 3);
  if (tiles.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {tiles.map((entry, index) => {
        const Glyph = getSubpackageGlyph(entry.slug);
        if (!Glyph) return null;
        return (
          <Link
            key={entry.slug}
            href={`/features/${entry.slug}`}
            className={`group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-ambient-sm transition-[box-shadow,border-color] duration-micro hover:border-foreground/20 hover:shadow-ambient-md ${index === 0 ? "sm:col-span-2" : ""}`}
          >
            <div className="flex flex-1 items-center justify-center bg-background/40 p-5">
              <div className="w-full">
                <Glyph
                  entry={toSerializablePackageFeatureEntry(entry)}
                  copy={getGlyphCopy(entry.slug, t)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="font-mono text-xs text-foreground" translate="no">
                {entry.label}
              </span>
              <span
                aria-hidden
                className="text-xs text-muted-foreground transition-transform duration-micro group-hover:translate-x-0.5 group-hover:text-foreground"
              >
                →
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
