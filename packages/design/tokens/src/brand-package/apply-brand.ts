import { emitBrandCss } from "./emit-css";
import type { BrandPackage } from "./types";

export const BRAND_STYLE_ELEMENT_ID = "nebutra-brand-skin";
export const BRAND_STORAGE_KEY = "nebutra-brand-package";

export interface ApplyBrandOptions {
  /** Persist package JSON to localStorage for Create Center preview reload */
  persist?: boolean;
  /** Target document (iframe preview support) */
  doc?: Document;
}

function targetDoc(doc?: Document): Document | null {
  if (doc) return doc;
  if (typeof document === "undefined") return null;
  return document;
}

/**
 * Inject brand skin CSS at runtime (Create Center preview / tenant switch).
 * Does not require rebuilding app CSS — overrides semantic + recipe vars.
 */
export function applyBrandCss(
  css: string,
  brandId?: string,
  options: ApplyBrandOptions = {},
): void {
  const d = targetDoc(options.doc);
  if (!d) return;

  let el = d.getElementById(BRAND_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = d.createElement("style");
    el.id = BRAND_STYLE_ELEMENT_ID;
    el.setAttribute("data-nebutra-brand", brandId ?? "custom");
    d.head.appendChild(el);
  }
  el.textContent = css;
  if (brandId) {
    d.documentElement.dataset.brand = brandId;
  }
}

/** Apply a full Brand Package (emit CSS + optional persist). */
export function applyBrandPackage(brand: BrandPackage, options: ApplyBrandOptions = {}): void {
  const css = emitBrandCss(brand);
  applyBrandCss(css, brand.id, options);

  if (options.persist && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
    } catch {
      // quota / private mode — ignore
    }
  }
}

/** Remove runtime brand skin and restore default Nebutra tokens. */
export function clearBrand(options: ApplyBrandOptions = {}): void {
  const d = targetDoc(options.doc);
  if (!d) return;
  d.getElementById(BRAND_STYLE_ELEMENT_ID)?.remove();
  delete d.documentElement.dataset.brand;
  if (options.persist && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(BRAND_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Restore brand package previously persisted by applyBrandPackage({ persist: true }). */
export function restorePersistedBrand(options: ApplyBrandOptions = {}): BrandPackage | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY);
    if (!raw) return null;
    const brand = JSON.parse(raw) as BrandPackage;
    if (!brand?.id || !brand?.semantic || !brand?.recipe) return null;
    applyBrandPackage(brand, { ...options, persist: false });
    return brand;
  } catch {
    return null;
  }
}

export function getActiveBrandId(doc?: Document): string | null {
  const d = targetDoc(doc);
  return d?.documentElement.dataset.brand ?? null;
}
