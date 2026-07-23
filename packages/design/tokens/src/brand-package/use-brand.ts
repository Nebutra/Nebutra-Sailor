"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  type ApplyBrandOptions,
  applyBrandPackage,
  clearBrand,
  getActiveBrandId,
  restorePersistedBrand,
} from "./apply-brand";
import { emitBrandCss } from "./emit-css";
import type { BrandPackage } from "./types";

export interface UseBrandOptions {
  /** Restore from localStorage on mount */
  autoRestore?: boolean;
  /** Persist apply/clear to localStorage */
  persist?: boolean;
}

export interface UseBrandResult {
  brand: BrandPackage | null;
  brandId: string | null;
  apply: (brand: BrandPackage) => void;
  clear: () => void;
  restore: () => BrandPackage | null;
}

/**
 * Create Center / app-level brand state for the host document.
 */
export function useBrand(options: UseBrandOptions = {}): UseBrandResult {
  const { autoRestore = false, persist = true } = options;
  const [brand, setBrand] = useState<BrandPackage | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (!autoRestore) return;
    const restored = restorePersistedBrand({ persist: false });
    if (restored) {
      setBrand(restored);
      setBrandId(restored.id);
    } else {
      setBrandId(getActiveBrandId());
    }
  }, [autoRestore]);

  const apply = useCallback(
    (next: BrandPackage) => {
      applyBrandPackage(next, { persist });
      setBrand(next);
      setBrandId(next.id);
    },
    [persist],
  );

  const clear = useCallback(() => {
    clearBrand({ persist });
    setBrand(null);
    setBrandId(null);
  }, [persist]);

  const restore = useCallback(() => {
    const restored = restorePersistedBrand({ persist: false });
    if (restored) {
      setBrand(restored);
      setBrandId(restored.id);
    }
    return restored;
  }, []);

  return { brand, brandId, apply, clear, restore };
}

export interface BrandIframePreviewOptions {
  /**
   * Stylesheets the iframe must load before the brand skin
   * (e.g. app CSS URL that already includes tokens + recipe).
   */
  baseStylesheetHrefs?: string[];
  /** Extra head HTML (fonts CDN, etc.) */
  headHtml?: string;
  /** Minimal body wrapper class */
  bodyClassName?: string;
  /** Called after brand CSS is injected into the iframe */
  onApplied?: (brand: BrandPackage | null) => void;
}

export interface UseBrandIframePreviewResult {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  brand: BrandPackage | null;
  /** Write/update brand inside the iframe document */
  apply: (brand: BrandPackage) => void;
  clear: () => void;
  /**
   * Optional: write a self-contained preview document.
   * Use when the iframe has no host app styles yet.
   */
  writePreviewDocument: (brand: BrandPackage, bodyHtml?: string) => void;
}

function ensureIframeDoc(iframe: HTMLIFrameElement | null): Document | null {
  if (!iframe) return null;
  try {
    return iframe.contentDocument;
  } catch {
    return null; // cross-origin
  }
}

function injectBaseStyles(doc: Document, hrefs: string[] | undefined): void {
  if (!hrefs?.length) return;
  for (const href of hrefs) {
    const id = `nebutra-base-${hashHref(href)}`;
    if (doc.getElementById(id)) continue;
    const link = doc.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    doc.head.appendChild(link);
  }
}

function hashHref(href: string): string {
  let h = 0;
  for (let i = 0; i < href.length; i++) h = (h * 31 + href.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * Multi-tenant / Create Center iframe preview.
 * Applies Brand Packages into the iframe's document without touching the host shell.
 */
export function useBrandIframePreview(
  options: BrandIframePreviewOptions = {},
): UseBrandIframePreviewResult {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [brand, setBrand] = useState<BrandPackage | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  const apply = useCallback((next: BrandPackage) => {
    const doc = ensureIframeDoc(iframeRef.current);
    if (!doc?.documentElement) {
      setBrand(next);
      return;
    }
    injectBaseStyles(doc, optsRef.current.baseStylesheetHrefs);
    applyBrandPackage(next, { doc, persist: false });
    setBrand(next);
    optsRef.current.onApplied?.(next);
  }, []);

  const clear = useCallback(() => {
    const doc = ensureIframeDoc(iframeRef.current);
    if (doc) clearBrand({ doc, persist: false });
    setBrand(null);
    optsRef.current.onApplied?.(null);
  }, []);

  const writePreviewDocument = useCallback((next: BrandPackage, bodyHtml = "") => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const css = emitBrandCss(next);
    const links = (optsRef.current.baseStylesheetHrefs ?? [])
      .map((href) => `<link rel="stylesheet" href="${href}" />`)
      .join("\n");
    const html = `<!DOCTYPE html>
<html lang="en" data-brand="${next.id}" class="${next.darkDefault ? "dark" : ""}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${links}
  ${optsRef.current.headHtml ?? ""}
  <style id="nebutra-brand-skin">${css}</style>
  <style>
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: var(--font-sans, system-ui, sans-serif);
      background: hsl(var(--background));
      color: hsl(var(--foreground));
    }
  </style>
</head>
<body class="${optsRef.current.bodyClassName ?? "zone-product"} bg-background text-foreground">
  ${bodyHtml}
</body>
</html>`;
    iframe.srcdoc = html;
    setBrand(next);
    optsRef.current.onApplied?.(next);
  }, []);

  return { iframeRef, brand, apply, clear, writePreviewDocument };
}

/** Imperative helper for non-hook call sites */
export function applyBrandToIframe(
  iframe: HTMLIFrameElement,
  brand: BrandPackage,
  options: ApplyBrandOptions & { baseStylesheetHrefs?: string[] } = {},
): void {
  const doc = iframe.contentDocument;
  if (!doc) return;
  injectBaseStyles(doc, options.baseStylesheetHrefs);
  applyBrandPackage(brand, { ...options, doc, persist: false });
}
