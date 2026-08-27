import { ArrowUpRight } from "@nebutra/icons";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import {
  EDITORIAL_BODY,
  EDITORIAL_EYEBROW,
  editorialBlock,
  editorialFrame,
} from "./editorial-surface";

export type EditorialAuthorLink = {
  href: string;
  key?: string;
  label: string;
};

export type EditorialAuthorBioProps = {
  /** Avatar slot. Apps pass their own image component so this stays framework-free. */
  avatar?: ReactNode;
  bio?: string | null;
  className?: string;
  label?: string;
  links?: EditorialAuthorLink[];
  name: string;
  role?: string | null;
};

/** Byline card closing an article. */
export function EditorialAuthorBio({
  avatar,
  bio,
  className,
  label = "Written by",
  links = [],
  name,
  role,
}: EditorialAuthorBioProps) {
  if (!name.trim()) return null;

  const visibleLinks = links.filter((link) => link.href && link.label);

  return (
    <aside
      className={cn(
        editorialBlock({ spacing: "loose", width: "breakout" }),
        editorialFrame({ elevation: "resting", radius: "panel" }),
        "flex flex-col gap-4 px-6 py-6 sm:flex-row sm:gap-5",
        className,
      )}
    >
      {avatar && (
        <span className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">{avatar}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className={EDITORIAL_EYEBROW}>{label}</div>
        <p className="mt-2 text-base font-semibold leading-6 text-foreground">{name}</p>
        {role && <p className="mt-0.5 text-sm text-muted-foreground">{role}</p>}
        {bio && <p className={cn("mt-3", EDITORIAL_BODY)}>{bio}</p>}
        {visibleLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleLinks.map((link) => (
              <a
                key={link.key ?? link.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
                <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
