import Link from "next/link";
import { CopyCommand } from "./copy-command";

const REGISTRY_HOST = process.env.NEXT_PUBLIC_REGISTRY_HOST ?? "https://ui.nebutra.com";

const MATURITY_LABELS = {
  canonical: "canonical",
  stable: "stable",
  beta: "beta",
  experimental: "experimental",
} as const;

export interface RegistryCardItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  layer?: string;
  maturity?: keyof typeof MATURITY_LABELS;
  dependencies?: string[];
  registryDependencies?: string[];
  cssVarsCount?: number;
}

interface RegistryCardProps {
  lang: string;
  item: RegistryCardItem;
}

/**
 * Display tile for one registry component on the index page.
 *
 * Shows: title + layer chip, description, the copy-paste install command,
 * dependency lists, and a link to the detail page.
 */
export function RegistryCard({ lang, item }: RegistryCardProps) {
  const installCommand = `npx shadcn@latest add ${REGISTRY_HOST}/r/${item.name}.json`;

  return (
    <article className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 transition-colors hover:border-primary/60">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/${lang}/registry/${item.name}`}
            className="break-words text-base font-semibold text-foreground hover:text-primary"
          >
            {item.title ?? item.name}
          </Link>
          {item.description && (
            <p className="break-words text-muted-foreground text-sm">{item.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col sm:items-end">
          {item.layer && (
            <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {item.layer}
            </span>
          )}
          {item.maturity && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {MATURITY_LABELS[item.maturity]}
            </span>
          )}
        </div>
      </header>

      <CopyCommand command={installCommand} />

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
        {item.dependencies && item.dependencies.length > 0 && (
          <span>
            <span className="font-medium text-foreground">deps:</span>{" "}
            {item.dependencies.join(", ")}
          </span>
        )}
        {item.registryDependencies && item.registryDependencies.length > 0 && (
          <span>
            <span className="font-medium text-foreground">registry:</span>{" "}
            {item.registryDependencies.join(", ")}
          </span>
        )}
        {typeof item.cssVarsCount === "number" && item.cssVarsCount > 0 && (
          <span>
            <span className="font-medium text-foreground">tokens:</span> {item.cssVarsCount}
          </span>
        )}
      </footer>
    </article>
  );
}
