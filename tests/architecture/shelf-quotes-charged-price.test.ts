import { readFileSync } from "node:fs";
import { join } from "node:path";
import { glob } from "tinyglobby";
import { describe, expect, it } from "vitest";

/**
 * Every surface that quotes a price to a customer must quote the charged one.
 *
 * `getListingCatalog()` prices from the public model index — upstream's own
 * list price, before our markup, coverage factors and overrides. It is the
 * right input for deciding what to publish and the wrong number to show a
 * customer. `getPricedListingCatalog()` is the same shelf at what the edge
 * will actually charge.
 *
 * This was got wrong three times in one day: the catalogue JSON, the shelf
 * page, and then the detail page, which was still advertising gpt-5.6-sol at
 * $4 while the edge billed $5.20 — a storefront undercutting its own till.
 * Each was fixed on its own, which is why a fourth surface could have repeated
 * it. So the rule is checked rather than remembered: a page or a public route
 * reaches for the priced accessor, and only the price publisher may read the
 * raw index.
 */
const ROOT = join(import.meta.dirname, "..", "..");

/** The one place allowed to read index prices: it is what writes the real ones. */
const PUBLISHER = "apps/router/src/lib/supply/pricing.ts";

describe("customer-facing surfaces quote the charged price", () => {
  it("only the price publisher reads the raw index catalogue", async () => {
    const files = await glob(
      ["apps/router/src/app/**/page.tsx", "apps/router/src/app/api/**/route.ts"],
      { cwd: ROOT, ignore: ["**/node_modules/**"] },
    );

    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      // The admin contract's own supply routes are operator surfaces, not
      // storefronts — they report what the shelf could sell, not its price.
      if (file.includes("/api/admin/")) continue;
      if (/\bgetListingCatalog\b/.test(source)) {
        offenders.push(`${file} — use getPricedListingCatalog()`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the raw accessor is still reachable where publishing needs it", () => {
    const publisher = readFileSync(join(ROOT, PUBLISHER), "utf8");
    expect(publisher).toContain("getListingCatalog");
    // Publishing from already-marked-up prices would compound the markup.
    expect(publisher).not.toContain("getPricedListingCatalog");
  });

  it("the detail page reads the priced lookups", () => {
    const page = readFileSync(
      join(ROOT, "apps/router/src/app/product/detail/[slug]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("getPricedModelBySlug");
    expect(page).toContain("getPricedRelatedListings");
    expect(page).not.toContain("getListedModelBySlug(");
  });

  /**
   * The priced accessors read the price table through Prisma, so they cannot
   * live in `listing-catalog` — client components import that module for its
   * labels and formatters, and a Prisma import there pulled `dns`, `fs` and
   * `net` into the browser bundle and failed the build.
   */
  it("keeps the client-safe catalogue free of the database", () => {
    const catalog = readFileSync(join(ROOT, "apps/router/src/lib/listing-catalog.ts"), "utf8");
    expect(catalog).not.toContain("shelf-prices");
    expect(catalog).not.toContain("@nebutra/db");
    expect(catalog).not.toContain("@nebutra/repositories");
  });
});
