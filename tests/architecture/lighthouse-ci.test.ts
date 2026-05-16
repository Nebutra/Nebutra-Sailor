import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("lighthouse dashboard ci harness", () => {
  it("builds the web dependency closure before running Next.js", async () => {
    const script = await readFile(
      join(process.cwd(), "scripts/lighthouse/ci-dashboard-compare.sh"),
      "utf8",
    );

    expect(script).toContain("export NEBUTRA_SKIP_GIT_HOOKS=1");
    expect(script).toContain("pnpm turbo run build --filter=@nebutra/web^...");
    expect(script).toContain("pnpm exec next build");
    expect(script).toContain("curl -fsS -o /dev/null");
    expect(script).not.toContain("pnpm --filter @nebutra/brand build");
    expect(script).not.toContain("--experimental-build-mode=compile");
  });

  it("uses a public route for pull-request Lighthouse checks", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/lighthouse-dashboard.yml"),
      "utf8",
    );

    expect(workflow).toContain('TARGET_PATH="/demo/embed"');
  });

  it("keeps landing page Lighthouse assertions explicit and category-scoped", async () => {
    const config = JSON.parse(await readFile(join(process.cwd(), "lighthouserc.json"), "utf8")) as {
      ci?: {
        assert?: {
          assertions?: Record<string, [string, { minScore: number }]>;
          preset?: string;
        };
      };
    };

    expect(config.ci?.assert?.preset).toBeUndefined();
    expect(config.ci?.assert?.assertions?.["categories:accessibility"]).toEqual([
      "error",
      { minScore: 0.95 },
    ]);
    expect(config.ci?.assert?.assertions?.["categories:performance"]?.[0]).toBe("warn");
    expect(config.ci?.assert?.assertions?.["categories:best-practices"]?.[0]).toBe("warn");
    expect(config.ci?.assert?.assertions?.["categories:seo"]?.[0]).toBe("warn");
  });

  it("keeps the empty blog placeholder out of Sanity metadata fetches", async () => {
    const blogPostPage = await readFile(
      join(process.cwd(), "apps/landing-page/src/app/[lang]/(marketing)/blog/[slug]/page.tsx"),
      "utf8",
    );
    // The architectural invariant: the placeholder slug is declared, cached,
    // guarded, and the guard appears before any Sanity fetch. Layout-agnostic
    // so that extracting helpers (e.g. buildBlogMetadata) doesn't break the
    // contract — only ordering relative to the Sanity call matters.
    const placeholderGuard = blogPostPage.indexOf("if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG)");
    const sanityFetch = blogPostPage.indexOf("getPostBySlug(slug");

    expect(blogPostPage).toContain(
      'const EMPTY_BLOG_PLACEHOLDER_SLUG = "empty-placeholder-do-not-fetch";',
    );
    expect(blogPostPage).toContain('cacheLife("hours");');
    expect(placeholderGuard).toBeGreaterThan(-1);
    expect(sanityFetch).toBeGreaterThan(-1);
    expect(placeholderGuard).toBeLessThan(sanityFetch);
  });

  it("keeps Next prerender feed fetch cancellations out of CI error logs", async () => {
    const feedRoutes = [
      "apps/landing-page/src/app/api/changelog/rss/route.ts",
      "apps/landing-page/src/app/api/changelog/atom/route.ts",
    ];

    for (const route of feedRoutes) {
      const source = await readFile(join(process.cwd(), route), "utf8");

      expect(source).toContain("HANGING_PROMISE_REJECTION");
      expect(source).toContain("isNextPrerenderFetchCancellation");
      expect(source).toContain("logFeedError(");
    }
  });
});
