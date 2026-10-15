"use client";

import { useEffect } from "react";

/**
 * MiSans for a page whose own language is not CJK, declared once the page has
 * loaded rather than in the first paint.
 *
 * A page in another language can still carry a few CJK characters (a Chinese
 * sub-line under a heading, a language name), and with MiSans declared up
 * front the browser fetched the whole ~536 KB subset at the highest priority
 * for them, alongside the page's own CSS, scripts and LCP font — one file
 * larger than all of the page's JavaScript. Declared after `load`, those few lines paint in the
 * system CJK face first and switch to MiSans when it arrives — the same swap
 * `font-display: swap` already allows on any slow connection — and the page's
 * own resources get the bandwidth. Every glyph is a full em wide in both faces,
 * so the swap moves nothing (no layout shift).
 *
 * CJK-language pages keep <CjkFontFace /> in the head: there it is the text.
 */
export function DeferredCjkFontFace({ css }: { css: string }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.font = "misans";
    style.textContent = css;
    const add = () => document.head.appendChild(style);
    if (document.readyState === "complete") add();
    else window.addEventListener("load", add, { once: true });
    return () => {
      window.removeEventListener("load", add);
      style.remove();
    };
  }, [css]);
  return null;
}
