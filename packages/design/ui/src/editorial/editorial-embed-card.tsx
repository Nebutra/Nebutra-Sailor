import { SiGithub, SiX, SiYoutube } from "@icons-pack/react-simple-icons";
import { ArrowUpRight, Globe } from "@nebutra/icons";
import type { ComponentType } from "react";
import { cn } from "../utils/cn";
import { EDITORIAL_CAPTION, editorialBlock, editorialFrame } from "./editorial-surface";

export const EDITORIAL_EMBED_PROVIDERS = ["youtube", "x", "github", "website"] as const;

export type EditorialEmbedProvider = (typeof EDITORIAL_EMBED_PROVIDERS)[number];

const PROVIDER_ICON: Record<EditorialEmbedProvider, ComponentType<{ className?: string }>> = {
  github: SiGithub,
  website: Globe,
  x: SiX,
  youtube: SiYoutube,
};

const PROVIDER_NAME: Record<EditorialEmbedProvider, string> = {
  github: "GitHub",
  website: "Website",
  x: "X",
  youtube: "YouTube",
};

export type EditorialEmbedCardProps = {
  caption?: string | null;
  className?: string;
  provider?: EditorialEmbedProvider;
  title: string;
  url: string;
};

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isEditorialEmbedProvider(value: unknown): value is EditorialEmbedProvider {
  return (
    typeof value === "string" && (EDITORIAL_EMBED_PROVIDERS as readonly string[]).includes(value)
  );
}

/**
 * Link-out card for third-party media.
 *
 * Deliberately not an iframe: an embedded player ships the provider's scripts
 * and cookies into the article and moves the layout around while it loads. The
 * card states the provider, keeps the destination visible, and leaves the
 * decision to the reader.
 */
export function EditorialEmbedCard({
  caption,
  className,
  provider = "website",
  title,
  url,
}: EditorialEmbedCardProps) {
  if (!title.trim() || !url.trim()) return null;

  const Icon = PROVIDER_ICON[provider];
  const host = hostname(url);

  return (
    <figure className={cn(editorialBlock({ spacing: "normal" }), className)}>
      <a
        className={cn(
          editorialFrame({ elevation: "resting" }),
          "group flex items-center gap-4 p-4 transition-shadow hover:shadow-ambient-md",
        )}
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted text-foreground"
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold leading-6 text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {[PROVIDER_NAME[provider], host].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[hsl(var(--primary))]"
        />
      </a>
      {caption && <figcaption className={cn("mt-2.5", EDITORIAL_CAPTION)}>{caption}</figcaption>}
    </figure>
  );
}
