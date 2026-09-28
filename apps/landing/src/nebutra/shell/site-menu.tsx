"use client";

import { ArrowLeft, ArrowRight, ChevronRight, Cross, LogoGithub } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { REPO_URL } from "@/nebutra/data/repo";
import { SECTION_PATH } from "@/nebutra/routes";
import { pageAt, SECTIONS, SERVED_PAGES, type SectionId } from "@/site-map";

/**
 * The site's index, drawn the way an editorial site draws it (a16z's menu is
 * the reference): sections set large and light, one per line, no icons; a
 * section with pages opens a second panel beside it — its line from the site
 * map, then its pages — instead of an accordion in place. The section you are
 * in reads at full ink, the rest a step back; the page you are on carries a
 * dot. Everything comes from site-map.ts, so the menu cannot drift from it.
 */

const within = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const NAV_SECTIONS = SECTIONS.filter((s) => s.nav);
const pagesOf = (id: SectionId) => SERVED_PAGES.filter((p) => p.section === id && p.rail);

/** Items rise in one after another when the menu opens (globals.css `site-menu-in`). */
const rise = (i: number): CSSProperties => ({ animationDelay: `${60 + i * 35}ms` });

export function SiteMenu({
  open,
  pathname,
  mailto,
  onNavigate,
  onClose,
}: {
  open: boolean;
  pathname: string;
  mailto: string;
  onNavigate: () => void;
  onClose: () => void;
}) {
  const here = pageAt(pathname)?.section;
  const [panel, setPanel] = useState<SectionId | null>(null);

  // Each opening starts on the first level.
  useEffect(() => {
    if (!open) setPanel(null);
  }, [open]);

  const shown = panel ? NAV_SECTIONS.find((s) => s.id === panel) : undefined;
  const shownPages = shown ? pagesOf(shown.id) : [];

  return (
    <div className="flex h-dvh">
      {/* Level one — hidden on a phone while a section is open. */}
      <div
        className={cn(
          "flex w-screen shrink-0 flex-col px-8 pt-6 pb-8 sm:w-[400px] sm:px-10",
          shown && "max-sm:hidden",
        )}
      >
        <div className="flex h-10 items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="md"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <Cross />
          </Button>
        </div>

        <ul className="mt-10 flex flex-col gap-2">
          {NAV_SECTIONS.map((s, i) => {
            const hasPages = pagesOf(s.id).length > 0;
            const lit = panel ? panel === s.id : here === s.id;
            const row = cn(
              "group flex w-full items-baseline justify-between gap-4 py-2.5 text-left font-heading text-3xl tracking-tight transition-colors duration-micro",
              lit ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              open && "site-menu-in",
            );
            const label = (
              <span className="flex items-baseline gap-3">
                <span>{s.title.en}</span>
                <span className="font-sans text-sm text-muted-foreground">{s.title.zh}</span>
              </span>
            );
            return (
              <li key={s.id}>
                {hasPages ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      row,
                      "h-auto rounded-none px-0 hover:bg-transparent active:translate-y-0",
                    )}
                    style={rise(i)}
                    aria-expanded={panel === s.id}
                    // Opening only: a pointer that rested on the row has already opened it,
                    // and a toggle would close it again on the click that follows.
                    onClick={() => setPanel(s.id)}
                    onMouseEnter={(e) => {
                      // Pointer devices preview a section by resting on it.
                      if (window.matchMedia("(hover: hover)").matches && e.buttons === 0)
                        setPanel(s.id);
                    }}
                  >
                    {label}
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 self-center transition-transform duration-flow ease-brand",
                        panel === s.id && "translate-x-1",
                      )}
                    />
                  </Button>
                ) : (
                  <Link
                    href={SECTION_PATH[s.id]}
                    className={row}
                    style={rise(i)}
                    onClick={onNavigate}
                  >
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div
          className={cn(
            "mt-auto flex flex-col gap-3 text-sm text-muted-foreground",
            open && "site-menu-in",
          )}
          style={rise(NAV_SECTIONS.length)}
        >
          <a href={mailto} className="transition-colors hover:text-foreground">
            Write to the founder
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <LogoGithub className="size-4" />
            Sailor on GitHub
          </a>
        </div>
      </div>

      {/* Level two — beside level one, or in its place on a phone. */}
      {shown ? (
        <div
          key={shown.id}
          className="site-menu-panel flex w-screen shrink-0 flex-col border-border bg-muted/40 px-8 pt-6 pb-8 sm:w-[400px] sm:border-l sm:px-10"
        >
          <div className="flex h-10 items-center sm:invisible">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPanel(null)}>
              <ArrowLeft />
              Back
            </Button>
          </div>

          <div className="mt-10 flex flex-col gap-3">
            <Link
              href={SECTION_PATH[shown.id]}
              onClick={onNavigate}
              className="group inline-flex items-center gap-2 font-heading text-xl tracking-tight text-foreground"
            >
              {shown.title.en}
              <ArrowRight className="size-4 transition-transform duration-flow ease-brand group-hover:translate-x-1" />
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">{shown.is}</p>
          </div>

          <ul className="mt-8 flex flex-col gap-1">
            {shownPages.map((p, i) => {
              const current = within(pathname, p.path);
              return (
                <li key={p.path}>
                  <Link
                    href={p.path}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "site-menu-in flex items-center gap-2.5 py-1.5 text-base transition-colors duration-micro",
                      current ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    style={rise(i)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full bg-foreground transition-opacity",
                        current ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {p.title.en}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
