"use client";

import { Cross, MagnifyingGlass } from "@nebutra/icons";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * Shared shell for the language/market pickers.
 *
 * Deliberately not the DS Popover. That primitive's surface is
 * `bg-popover/95 + backdrop-blur-md`, which reads fine over body copy and
 * bleeds badly over a large high-contrast headline — and a language list is a
 * reading surface, not a glass overlay.
 *
 * It DOES portal to <body>, as fixed. It used to stay in the header's own
 * context, and any ancestor that makes a stacking context — backdrop-blur,
 * transform, filter, opacity, isolation — trapped it there: on the router
 * market the top bar's backdrop-blur-sm put the whole panel under the search
 * bar and category cards, and made the mobile sheet's `position: fixed`
 * resolve against the 36px bar instead of the viewport. Portalled, the
 * popover tier is the popover tier wherever the switcher is mounted.
 *
 * Mobile (<640px): fixed full-bleed sheet with body scroll lock so long locale
 * lists are not clipped under the viewport (flex min-height:auto trap).
 */

export interface LocalePanelCopy {
  triggerAria: string;
  menuAria: string;
  searchPlaceholder: string;
  noResults: string;
  closeAria: string;
  /** Optional heading + subheading above the search field. */
  title?: string;
  description?: string;
}

export interface LocalePanelProps {
  copy: LocalePanelCopy;
  /** Trigger inner content — caller owns the label composition. */
  trigger: ReactNode;
  /**
   * Rendered with the lowercased current query and a `close` callback. The
   * caller filters, lays out its own rows, and owns its empty state — only it
   * knows what "no match" means for its data shape — and closes the panel from
   * its own row handler, so the panel never has to guess which clicks were
   * selections.
   */
  children: (query: string, close: () => void) => ReactNode;
  /** Show the search field. Callers with a short list pass false. */
  showSearch?: boolean;
  /** Panel width; defaults to a single-column language list. */
  width?: string;
  disabled?: boolean;
  // `| undefined` explicitly: consuming apps compile with
  // exactOptionalPropertyTypes, where an optional prop still rejects an
  // explicitly-passed undefined.
  className?: string | undefined;
  /** Fired when the panel opens — path-mode callers use it to prefetch. */
  onOpen?: () => void;
}

const MOBILE_MQ = "(max-width: 639px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_MQ);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function LocalePanel({
  copy,
  trigger,
  children,
  showSearch = true,
  width = "min(20rem, calc(100vw - 1.5rem))",
  disabled,
  className,
  onOpen,
}: LocalePanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const [desktopMaxHeight, setDesktopMaxHeight] = useState<string>("min(70vh, 560px)");
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * Horizontal offset from the trigger, in px, once the panel has been measured.
   * `null` means "not measured yet" and falls back to right-alignment.
   */
  const [desktopLeft, setDesktopLeft] = useState<number | null>(null);
  const [desktopTop, setDesktopTop] = useState<number | null>(null);
  const [desktopRight, setDesktopRight] = useState<number>(12);

  useEffect(() => {
    if (!open || !showSearch) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, showSearch]);

  // Lock document scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  // Desktop: keep the panel inside the remaining viewport below the trigger.
  useLayoutEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;
    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const cap = Math.max(200, Math.min(560, spaceBelow, window.innerHeight * 0.7));
      setDesktopMaxHeight(`${Math.floor(cap)}px`);

      // Which side the panel opens toward is a property of where the trigger
      // sits, not something a caller should have to know. Anchoring it to the
      // trigger's right edge is right for a switcher in the top-right and wrong
      // for one in the top-left, where the panel ran off the left of the
      // viewport and clipped every language name — leaving only the narrow code
      // rail visible, which read as a list of raw locale codes.
      // Top depends only on the trigger, so it is always known.
      setDesktopTop(Math.round(rect.bottom + 8));
      const panelWidth = panelRef.current?.offsetWidth ?? 0;
      if (panelWidth === 0) {
        // Width not laid out yet: align the panel's right edge to the trigger's
        // rather than hiding it — a hidden fallback would stay hidden if the
        // width never measured.
        setDesktopLeft(null);
        setDesktopRight(Math.max(12, Math.round(window.innerWidth - rect.right)));
        return;
      }
      const margin = 12;
      // Prefer opening leftward from the trigger's right edge, as before.
      let viewportLeft = rect.right - panelWidth;
      // If that would cross the left edge, open rightward from the trigger.
      if (viewportLeft < margin) viewportLeft = rect.left;
      // Then clamp, so neither choice can leave the viewport on a narrow window.
      viewportLeft = Math.min(viewportLeft, window.innerWidth - margin - panelWidth);
      viewportLeft = Math.max(margin, viewportLeft);
      // Fixed positioning: viewport coordinates are the offsets.
      setDesktopLeft(Math.round(viewportLeft));
    };
    measure();
    window.addEventListener("resize", measure);
    // Fixed to the viewport now, so it follows the trigger on scroll itself.
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [open, isMobile]);

  // Forget the measurement on close: the trigger may have moved by next open.
  useLayoutEffect(() => {
    if (!open) {
      setDesktopLeft(null);
      setDesktopTop(null);
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const panelStyle: CSSProperties = isMobile
    ? {
        position: "fixed",
        left: "max(0.75rem, env(safe-area-inset-left))",
        right: "max(0.75rem, env(safe-area-inset-right))",
        top: "max(0.75rem, env(safe-area-inset-top))",
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        marginTop: 0,
        zIndex: "var(--layer-panel)",
        width: "auto",
        maxHeight: "none",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "hsl(var(--background, 0 0% 100%))",
        background: "hsl(var(--background, 0 0% 100%))",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        isolation: "isolate",
        boxShadow: "0 1px 2px rgb(0 0 0 / 0.06), 0 24px 48px -24px rgb(0 0 0 / 0.28)",
      }
    : {
        position: "fixed",
        // Measured in useLayoutEffect before paint. Left when the width is
        // known, else right-aligned to the trigger; hidden only for the frame
        // before the trigger itself is measured.
        ...(desktopLeft === null ? { right: desktopRight } : { left: desktopLeft }),
        top: desktopTop ?? 0,
        visibility: desktopTop === null ? "hidden" : "visible",
        // A dropdown: the popover tier, so it clears form chrome and page layers.
        zIndex: "var(--layer-popover)",
        width,
        maxHeight: desktopMaxHeight,
        display: "flex",
        flexDirection: "column",
        // Inline solid fill — never rely only on Tailwind utility generation.
        // Auth/forge shells use hsl(var(--background)); keep a white/black fallback
        // so missing CSS variables cannot leave the panel translucent over the form.
        backgroundColor: "hsl(var(--background, 0 0% 100%))",
        background: "hsl(var(--background, 0 0% 100%))",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        isolation: "isolate",
        // Contact + ambient, no hairline ring. The ring was doing the separating
        // work a shadow should do, which is why the panel read as a pasted-on box:
        // a 1px line at 4% alpha is too faint to be a deliberate edge and too
        // present to disappear. The two-layer form gives 2px of contact and 24px of
        // visible ambient spread (48px blur against -24px spread) so the surface
        // lifts off the page instead of being outlined against it.
        boxShadow: "0 1px 2px rgb(0 0 0 / 0.06), 0 24px 48px -24px rgb(0 0 0 / 0.28)",
      };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", display: "inline-block" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      onBlur={(e) => {
        // The panel is portalled out of the container's DOM subtree (React
        // still bubbles its events here), so check both.
        const next = e.relatedTarget as Node | null;
        if (!containerRef.current?.contains(next) && !panelRef.current?.contains(next)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={copy.triggerAria}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setOpen((v) => {
            if (!v) onOpen?.();
            return !v;
          });
          setQuery("");
        }}
        // min-h-11 = 44px, the WCAG touch-target floor.
        className="inline-flex min-h-11 max-w-[min(280px,70vw)] items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {trigger}
      </button>

      {open && isMobile
        ? createPortal(
            <button
              type="button"
              aria-label={copy.closeAria}
              className="fixed inset-0 z-[calc(var(--layer-panel)-10)] bg-black/40"
              onClick={close}
            />,
            document.body,
          )
        : null}

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={copy.menuAria}
              aria-modal={isMobile ? "true" : "false"}
              style={panelStyle}
              className="overflow-hidden rounded-[var(--radius-lg)] bg-background"
            >
              {copy.title || showSearch ? (
                // The header is a tonal block, not a bordered strip: the step from
                // --muted to the --background body is the separator, so the list
                // starts without a line drawn across it.
                //
                // --muted and not neutral-2, even though both are "one step up". The
                // panel body is --background, and in dark mode the two ramps do not
                // agree: --background is 222° at 14% saturation while neutral-2 is
                // the same hue at 47%. Mixing them put a navy block on a near-black
                // surface, so the header read as a different material rather than a
                // lighter part of the same one. Everything on this surface now comes
                // from the semantic ramp.
                <div className="shrink-0 bg-muted px-4 py-3">
                  {copy.title ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{copy.title}</p>
                        {copy.description ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{copy.description}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label={copy.closeAria}
                        onClick={close}
                        className="-mr-1 -mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Cross className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                  {showSearch ? (
                    <label
                      // A well sunk into the tonal header rather than a bordered
                      // field: --background is lighter than the --muted header in
                      // light mode and darker in dark mode, so it reads as inset in
                      // both without a stroke. The ring appears on focus only —
                      // that is feedback, not decoration.
                      className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-background px-2.5 py-2 transition-shadow focus-within:outline focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-[hsl(var(--ring)/0.5)] ${
                        copy.title ? "mt-3" : ""
                      }`}
                    >
                      <MagnifyingGlass
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <input
                        ref={searchRef}
                        data-allow-native
                        type="text"
                        inputMode="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={copy.searchPlaceholder}
                        className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {/* min-h-0 is required so flex-1 + overflow-y-auto can shrink and
              scroll. Without it, long locale lists are clipped and cannot
              scroll (mobile / short viewports). overscroll-contain stops the
              wheel chaining to the document once the list hits its end. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {children(query.trim().toLowerCase(), close)}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
