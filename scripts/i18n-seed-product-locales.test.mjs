import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Inline the pure merge used by seed (mirrors scripts/i18n-seed-product-locales.mjs)
function deepMergeMissing(source, target) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return { value: target === undefined || target === null ? source : target, added: 0 };
  }
  const out = target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  let added = 0;
  for (const [k, v] of Object.entries(source)) {
    if (!(k in out) || out[k] === undefined || out[k] === null) {
      out[k] = v;
      added += 1;
    } else if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object" &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      const nested = deepMergeMissing(v, out[k]);
      out[k] = nested.value;
      added += nested.added;
    }
  }
  return { value: out, added };
}

describe("deepMergeMissing (seed key fill)", () => {
  it("adds missing top-level and nested keys from en without clobbering translations", () => {
    const en = {
      nav: { tools: "Tools", wallet: "Wallet" },
      auth: { signIn: "Sign in" },
    };
    const ja = {
      nav: { tools: "ツール" },
    };
    const { value, added } = deepMergeMissing(en, ja);
    expect(value.nav.tools).toBe("ツール");
    expect(value.nav.wallet).toBe("Wallet");
    expect(value.auth.signIn).toBe("Sign in");
    expect(added).toBeGreaterThanOrEqual(2);
  });

  it("is a no-op when target already has every key", () => {
    const en = { a: "1", b: { c: "2" } };
    const tgt = { a: "一", b: { c: "二" } };
    const { value, added } = deepMergeMissing(en, tgt);
    expect(added).toBe(0);
    expect(value).toEqual(tgt);
  });
});

// silence unused
void createRequire;
