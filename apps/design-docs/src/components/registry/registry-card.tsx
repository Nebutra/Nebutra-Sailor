import Link from "next/link";
import { CopyCommand } from "./copy-command";

const REGISTRY_HOST = process.env.NEXT_PUBLIC_REGISTRY_HOST ?? "https://ui.nebutra.com";

export interface RegistryCardItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  layer?: string;
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
    <article className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-5 transition-colors hover:border-[var(--blue-9)]">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href={`/${lang}/registry/${item.name}`}
            className="text-base font-semibold text-[var(--neutral-12)] hover:text-[var(--blue-9)]"
          >
            {item.title ?? item.name}
          </Link>
          {item.description && (
            <p className="text-sm text-[var(--neutral-11)]">{item.description}</p>
          )}
        </div>
        {item.layer && (
          <span className="shrink-0 rounded-full bg-[var(--blue-3)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--blue-9)]">
            {item.layer}
          </span>
        )}
      </header>

      <CopyCommand command={installCommand} />

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--neutral-11)]">
        {item.dependencies && item.dependencies.length > 0 && (
          <span>
            <span className="font-medium text-[var(--neutral-12)]">deps:</span>{" "}
            {item.dependencies.join(", ")}
          </span>
        )}
        {item.registryDependencies && item.registryDependencies.length > 0 && (
          <span>
            <span className="font-medium text-[var(--neutral-12)]">registry:</span>{" "}
            {item.registryDependencies.join(", ")}
          </span>
        )}
        {typeof item.cssVarsCount === "number" && item.cssVarsCount > 0 && (
          <span>
            <span className="font-medium text-[var(--neutral-12)]">tokens:</span>{" "}
            {item.cssVarsCount}
          </span>
        )}
      </footer>
    </article>
  );
}
