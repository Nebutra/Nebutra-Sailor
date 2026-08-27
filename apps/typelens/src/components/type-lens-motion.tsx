"use client";

/**
 * Product motion for TypeLens.
 * Patterns from greensock/gsap-skills (useGSAP + timeline + ScrollTrigger.batch).
 * Performance: transform + autoAlpha only (gsap-performance).
 */
import { usePathname } from "next/navigation";
import { type ReactNode, useRef } from "react";
import {
  gsap,
  prefersReducedTypeLensMotion,
  refreshTypeLensScroll,
  ScrollTrigger,
  TL_MOTION,
  TL_SELECTORS,
} from "@/lib/motion/runtime";
import { useTypeLensGsap } from "@/lib/motion/use-typelens-gsap";

function qAll(root: Element, selector: string): HTMLElement[] {
  return gsap.utils.toArray<HTMLElement>(root.querySelectorAll(selector));
}

function qOne(root: Element, selector: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(selector);
}

export function TypeLensMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useTypeLensGsap(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const reduced = prefersReducedTypeLensMotion();

      const mark = qOne(root, TL_SELECTORS.mark);
      const kicker = qOne(root, TL_SELECTORS.kicker);
      const tagline = qOne(root, TL_SELECTORS.tagline);
      const navLinks = qAll(root, TL_SELECTORS.nav);
      const search = qOne(root, TL_SELECTORS.search);
      const filter = qOne(root, TL_SELECTORS.filter);
      const footer = qOne(root, TL_SELECTORS.footer);
      const cards = qAll(root, TL_SELECTORS.card);
      const sections = qAll(root, TL_SELECTORS.section);

      const chrome = [mark, kicker, tagline, search, filter, footer, ...navLinks].filter(
        (el): el is HTMLElement => el != null,
      );

      const revealAll = () => {
        if (chrome.length > 0) {
          gsap.set(chrome, { autoAlpha: 1, y: 0, clearProps: "transform" });
        }
        if (cards.length > 0) {
          gsap.set(cards, { autoAlpha: 1, y: 0, clearProps: "transform" });
        }
        if (sections.length > 0) {
          gsap.set(sections, { autoAlpha: 1, y: 0, clearProps: "transform" });
        }
      };

      if (reduced) {
        revealAll();
        root.setAttribute("data-tl-motion-ready", "");
        return;
      }

      // Masthead only starts hidden. Gallery content stays painted so a
      // ScrollTrigger miss can never blank the collection.
      if (mark) gsap.set(mark, { autoAlpha: 0, y: 28 });
      if (kicker) gsap.set(kicker, { autoAlpha: 0, y: 16 });
      if (tagline) gsap.set(tagline, { autoAlpha: 0, y: 16 });
      if (navLinks.length > 0) gsap.set(navLinks, { autoAlpha: 0, y: 12 });
      if (search) gsap.set(search, { autoAlpha: 0, y: 10 });
      if (filter) gsap.set(filter, { autoAlpha: 0, y: 8 });
      if (footer) gsap.set(footer, { autoAlpha: 0, y: 20 });
      // Soft rise only — never start cards/sections at autoAlpha 0.
      if (cards.length > 0) gsap.set(cards, { y: 28 });
      if (sections.length > 0) gsap.set(sections, { y: 16 });
      root.setAttribute("data-tl-motion-ready", "");

      // Failsafe: if ST never fires, content is already visible; clear residual y.
      const failsafe = window.setTimeout(() => {
        if (cards.length > 0) gsap.set(cards, { y: 0, clearProps: "transform" });
        if (sections.length > 0) gsap.set(sections, { y: 0, clearProps: "transform" });
        if (chrome.length > 0) gsap.set(chrome, { autoAlpha: 1, y: 0, clearProps: "transform" });
      }, 1800);

      // --- Masthead timeline (gsap-timeline: defaults + position param)
      const intro = gsap.timeline({
        defaults: {
          duration: TL_MOTION.duration.standard,
          ease: TL_MOTION.ease.entrance,
        },
      });

      if (mark) {
        intro.to(mark, { autoAlpha: 1, y: 0 }, 0);
      }
      if (kicker) {
        intro.to(kicker, { autoAlpha: 1, y: 0, duration: TL_MOTION.duration.quick }, 0.12);
      }
      if (tagline) {
        intro.to(tagline, { autoAlpha: 1, y: 0, duration: TL_MOTION.duration.quick }, 0.18);
      }
      if (search) {
        intro.to(search, { autoAlpha: 1, y: 0, duration: TL_MOTION.duration.quick }, 0.2);
      }
      if (navLinks.length > 0) {
        intro.to(
          navLinks,
          {
            autoAlpha: 1,
            y: 0,
            stagger: TL_MOTION.stagger.tight,
            duration: TL_MOTION.duration.quick,
          },
          0.28,
        );
      }
      if (filter) {
        intro.to(filter, { autoAlpha: 1, y: 0, duration: TL_MOTION.duration.quick }, 0.38);
      }

      // --- Gallery cards: rise into place (content already opaque)
      if (cards.length > 0) {
        ScrollTrigger.batch(cards, {
          start: TL_MOTION.scroll.reveal,
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              y: 0,
              duration: TL_MOTION.duration.standard,
              ease: TL_MOTION.ease.entrance,
              stagger: {
                each: TL_MOTION.stagger.gallery,
                from: "start",
              },
              overwrite: true,
            });
          },
        });
      }

      // --- Page sections
      for (const el of sections) {
        gsap.to(el, {
          y: 0,
          duration: TL_MOTION.duration.standard,
          ease: TL_MOTION.ease.entrance,
          scrollTrigger: {
            trigger: el,
            start: TL_MOTION.scroll.reveal,
            once: true,
          },
        });
      }

      if (footer) {
        gsap.to(footer, {
          autoAlpha: 1,
          y: 0,
          duration: TL_MOTION.duration.quick,
          ease: TL_MOTION.ease.soft,
          scrollTrigger: {
            trigger: footer,
            start: "top 92%",
            once: true,
          },
        });
      }

      requestAnimationFrame(() => refreshTypeLensScroll());

      return () => {
        window.clearTimeout(failsafe);
      };
    },
    {
      scope: rootRef,
      // Re-run on route change so new page cards get ScrollTriggers
      dependencies: [pathname],
      revertOnUpdate: true,
    },
  );

  return (
    <div ref={rootRef} data-tl-motion-root className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
