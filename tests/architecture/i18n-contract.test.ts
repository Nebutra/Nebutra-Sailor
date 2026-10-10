/**
 * The i18n contract, proven against known-bad input.
 *
 * `pnpm i18n:check` is green on main, which says nothing about whether it can
 * be anything else — the gate it replaced passed 58 000 English copies. Each
 * rule below is exercised on a fixture catalog that breaks it, next to a clean
 * fixture that must pass, so a rule that stops firing fails here first.
 *
 * Also pinned: one language list (PRODUCT_LANGUAGES) behind every script, one
 * message loader behind every next-intl app, and a translator that can only
 * reach our own Router.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jwtVerify } from "jose";
import { afterAll, describe, expect, it } from "vitest";
import { DEFAULT_UI_LABELS } from "../../packages/design/ui/src/primitives/ui-labels";
import { PRODUCT_LANGUAGES } from "../../packages/platform/i18n/src/languages";
import { CATALOGS } from "../../scripts/i18n-catalogs.mjs";
import { advanceSources, syncLocale } from "../../scripts/i18n-sync.mjs";
import {
  collectWork,
  isCredentialRefusal,
  mintServiceToken,
  routerEndpoint,
} from "../../scripts/i18n-translate.mjs";
import { validateTranslation } from "../../scripts/i18n-translate-helpers.mjs";
import { flatten, icuMismatch, icuShape } from "../../scripts/lib/i18n-catalog.mjs";
import { TARGET_LOCALES } from "../../scripts/lib/i18n-registry.mjs";
import { checkCatalog } from "../../scripts/verify-i18n-keys.mjs";

const ROOT = join(__dirname, "../..");
const tmp = mkdtempSync(join(tmpdir(), "i18n-contract-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const EN = {
  nav: { home: "Home", pricing: "Pricing for teams" },
  greeting: "Hello {name}, you have {count, plural, one {# message} other {# messages}}",
  docs: "Read the <link>docs</link>",
};

/** A catalog with every target file present; `edit` breaks one locale. */
function fixture(name: string, edit?: (files: Record<string, object>) => void) {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  const files: Record<string, object> = { en: EN };
  for (const locale of TARGET_LOCALES) files[locale] = {};
  files.ja = {
    nav: { home: "ホーム" },
    greeting: "{name} さん、メッセージが {count, plural, other {# 件}} あります",
  };
  edit?.(files);
  for (const [locale, data] of Object.entries(files)) {
    writeFileSync(join(dir, `${locale}.json`), JSON.stringify(data));
  }
  return checkCatalog(
    { id: `fixture-${name}`, messagesDir: dir },
    { confirmed: {}, lock: { sources: {}, stale: {} }, strict: false },
  );
}

function kinds(report: { failures: Array<{ locale: string; kind: string }> }) {
  return report.failures.map((f) => `${f.locale}: ${f.kind}`);
}

describe("i18n:check rules fire on known-bad catalogs", () => {
  it("passes a clean catalog with untranslated keys simply absent", () => {
    const report = fixture("clean");
    expect(kinds(report)).toEqual([]);
    const ja = report.locales.find((l: { locale: string }) => l.locale === "ja");
    expect(ja.missing).toBe(2); // pricing + docs, absent and honest
  });

  it("rejects an English copy", () => {
    const report = fixture("copy", (f) => {
      f.de = { nav: { pricing: "Pricing for teams" } };
    });
    expect(kinds(report)).toEqual(["de: English copy (delete it)"]);
  });

  it("accepts a universal value that reads the same everywhere", () => {
    const report = fixture("universal", (f) => {
      f.en = { ...EN, brand: "GitHub" };
      f.de = { brand: "GitHub" };
    });
    expect(kinds(report)).toEqual([]);
  });

  it("rejects a translation that drops a placeholder, a tag, or is not ICU", () => {
    for (const [name, value] of [
      ["dropped-arg", "Hallo, du hast {count, plural, other {# Nachrichten}}"],
      ["invented-arg", "Hallo {name}{nameX}, {count, plural, other {#}}"],
      ["broken-icu", "Hallo {name:s, {count}"],
      ["no-other", "Hallo {name}, {count, plural, one {# Nachricht}}"],
    ] as const) {
      const report = fixture(name, (f) => {
        f.de = { greeting: value };
      });
      expect(kinds(report), name).toEqual(["de: breaks at render time"]);
    }
    const tag = fixture("dropped-tag", (f) => {
      f.de = { docs: "Lies die Doku" };
    });
    expect(kinds(tag)).toEqual(["de: breaks at render time"]);
  });

  it("rejects invalid ICU in the English source itself", () => {
    const report = fixture("bad-source", (f) => {
      f.en = { ...EN, generic: "behind one Repository<T>" };
    });
    expect(kinds(report)).toEqual(["en: invalid ICU in the source"]);
  });

  it("rejects a key English does not have", () => {
    const report = fixture("extra", (f) => {
      f.fr = { gone: "Supprimé" };
    });
    expect(kinds(report)).toEqual(["fr: key not in en.json"]);
  });

  it("rejects a locale file that is not a product language", () => {
    const report = fixture("stray", (f) => {
      f.zh = {};
    });
    expect(kinds(report)).toEqual(["*: not a product language (delete the file)"]);
  });

  it("blocks untranslated keys only under --strict", () => {
    const dir = join(tmp, "clean");
    const strict = checkCatalog(
      { id: "fixture-strict", messagesDir: dir },
      { confirmed: {}, lock: { sources: {}, stale: {} }, strict: true },
    );
    expect(strict.failures.length).toBeGreaterThan(0);
  });
});

describe("i18n:sync", () => {
  it("removes copies, broken translations, stale literals and dead keys — and nothing else", () => {
    const source = flatten({ ...EN, count: "111" });
    const target = flatten({
      nav: { home: "Startseite", pricing: "Pricing for teams" },
      greeting: "Hallo {name:s",
      count: "104",
      gone: "x",
    });
    const { kept, removed } = syncLocale(source, target, new Map());
    expect([...kept.keys()]).toEqual(["nav.home"]);
    expect(removed.copy).toEqual(["nav.pricing"]);
    expect(removed.extra).toEqual(["gone"]);
    expect(removed.broken).toHaveLength(2);
  });

  it("marks translations stale when their English changes", () => {
    const first = advanceSources({}, flatten(EN));
    expect(first.changed).toEqual([]);
    const second = advanceSources(
      first.next,
      flatten({ ...EN, nav: { ...EN.nav, home: "Start" } }),
    );
    expect(second.changed).toEqual(["nav.home"]);
  });
});

describe("i18n:translate", () => {
  // New-API answers 403 when an upstream token's quota runs out. Reading that
  // as "credential refused" aborted a run and discarded every finished locale.
  it("aborts only on our own credential failure, not on an upstream 403", () => {
    expect(isCredentialRefusal(401, "")).toBe(true);
    expect(
      isCredentialRefusal(
        403,
        '{"error":{"code":"unauthenticated","message":"Missing or invalid service token."}}',
      ),
    ).toBe(true);
    expect(
      isCredentialRefusal(403, '{"error":{"message":"该令牌额度已用尽","type":"new_api_error"}}'),
    ).toBe(false);
    expect(isCredentialRefusal(403, "")).toBe(false);
    expect(isCredentialRefusal(429, "")).toBe(false);
  });

  it("queues absent and stale keys, never universal values", () => {
    const source = flatten({ a: "Absent string", b: "Translated", c: "GitHub", d: "Edited" });
    const target = flatten({ b: "Übersetzt", d: "Bearbeitet (alt)" });
    const work = collectWork(source, target, new Set(["d"]));
    expect(work.map(([k]: [string]) => k)).toEqual(["a", "d"]);
  });

  it("rejects machine output that would break at render time", () => {
    expect(validateTranslation(EN.greeting, "Hallo {name}", { locale: "de" }).ok).toBe(false);
    expect(validateTranslation(EN.docs, "Lies die <a>Doku</a>", { locale: "de" }).ok).toBe(false);
    expect(
      validateTranslation(
        EN.greeting,
        "Hallo {name}, du hast {count, plural, one {# Nachricht} other {# Nachrichten}}",
        { locale: "de" },
      ).ok,
    ).toBe(true);
  });

  it("only ever talks to Router, with a token Router's verifier accepts", async () => {
    expect(routerEndpoint({ serviceSecret: "", apiKey: "", origin: "https://r" })).toBeNull();
    const internal = routerEndpoint({ serviceSecret: "s3cret", apiKey: "", origin: "https://r" });
    expect(internal.url).toBe("https://r/api/internal/v1/chat/completions");
    const keyed = routerEndpoint({ serviceSecret: "", apiKey: "k", origin: "https://r" });
    expect(keyed.url).toBe("https://r/v1/chat/completions");

    // Same verification apps/router runs (readServiceTokenContext → jwtVerify HS256).
    const token = mintServiceToken("s3cret");
    const { payload } = await jwtVerify(token, new TextEncoder().encode("s3cret"), {
      algorithms: ["HS256"],
    });
    expect(payload.exp).toBeGreaterThan(payload.iat as number);
    expect(payload.organizationId).toBeUndefined();
    await expect(
      jwtVerify(token, new TextEncoder().encode("wrong"), { algorithms: ["HS256"] }),
    ).rejects.toThrow();
  });
});

describe("one registry, one loader", () => {
  it("every catalog targets exactly PRODUCT_LANGUAGES minus English", () => {
    const wheel = PRODUCT_LANGUAGES.filter((l) => l !== "en").sort();
    for (const catalog of CATALOGS) {
      expect([...catalog.targets].sort(), catalog.id).toEqual(wheel);
    }
  });

  it("ICU shape compares arguments and tags, not formatting", () => {
    expect(icuShape("共 {count} 个用户").ok).toBe(true);
    expect(
      icuMismatch("{count, plural, one {# user} other {# users}}", "共 {count} 个用户"),
    ).toBeNull();
    expect(icuShape("{n, plural, one {#}}").ok).toBe(false);
  });

  it("the ui catalog's English is @nebutra/ui's DEFAULT_UI_LABELS, key for key", () => {
    const en = JSON.parse(
      readFileSync(join(ROOT, "packages/platform/i18n/ui-labels/en.json"), "utf8"),
    );
    expect(en).toEqual(JSON.parse(JSON.stringify(DEFAULT_UI_LABELS)));
  });

  it("every next-intl app mounts the ui labels provider", () => {
    for (const layout of [
      "apps/landing/src/app/[lang]/layout.tsx",
      "apps/web/src/app/layout.tsx",
      "apps/auth/src/app/layout.tsx",
      "apps/forge/src/app/layout.tsx",
      "apps/router/src/app/layout.tsx",
    ]) {
      const source = readFileSync(join(ROOT, layout), "utf8");
      expect(source, layout).toMatch(/<UiLabelsProvider labels=\{await loadUiLabels\(/);
    }
  });

  it("every next-intl request config goes through @nebutra/i18n", () => {
    const configs = [
      "apps/landing/src/i18n/request.ts",
      "apps/forge/src/i18n/request.ts",
      "apps/router/src/i18n/request.ts",
      "packages/platform/i18n/src/request.ts",
    ];
    for (const file of configs) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(
        /loadMessages|createCookieRequestConfig/.test(source),
        `${file} must load messages through @nebutra/i18n (English-backed), not its own import`,
      ).toBe(true);
      expect(source, file).not.toMatch(/cookies\(\)\.get|store\.get\("NEXT_LOCALE"\)/);
    }
  });
});
