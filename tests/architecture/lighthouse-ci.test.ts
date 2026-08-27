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

  it("keeps dashboard Lighthouse as a manual comparative diagnostic", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/lighthouse-dashboard.yml"),
      "utf8",
    );
    const beforeRefInput = "$" + "{{ inputs.before_ref }}";
    const afterRefInput = "$" + "{{ inputs.after_ref }}";
    const targetPathInput = "$" + "{{ inputs.target_path }}";

    expect(workflow).toContain("  workflow_dispatch:");
    expect(workflow).not.toContain("  pull_request:");
    expect(workflow).toContain('default: "/tenants"');
    expect(workflow).toContain(`BEFORE_REF="${beforeRefInput}"`);
    expect(workflow).toContain(`AFTER_REF="${afterRefInput}"`);
    expect(workflow).toContain(`TARGET_PATH="${targetPathInput}"`);
    expect(workflow).not.toContain("github.event.pull_request");
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
      join(process.cwd(), "apps/landing/src/app/[lang]/(marketing)/blog/[slug]/page.tsx"),
      "utf8",
    );
    const blogPageCache = await readFile(
      join(process.cwd(), "apps/landing/src/lib/blog-page-cache.ts"),
      "utf8",
    );
    // Clock and Sanity live in the cache module. The page must short-circuit
    // the sentinel before either loadCachedBlogArticle or buildBlogMetadata,
    // and must emit buildPageMetadata so Next does not inherit the homepage
    // canonical from [lang]/layout.tsx.
    const metadataFn = blogPageCache.indexOf("export async function buildBlogMetadata");
    const loadFn = blogPageCache.indexOf("export async function loadCachedBlogArticle");
    const metadataGuard = blogPageCache.indexOf("slug === EMPTY_BLOG_PLACEHOLDER_SLUG", metadataFn);
    const metadataFetch = blogPageCache.indexOf("getCachedBlogPost", metadataFn);
    const loadGuard = blogPageCache.indexOf("slug === EMPTY_BLOG_PLACEHOLDER_SLUG", loadFn);
    const loadFetch = blogPageCache.indexOf("getCachedBlogPost", loadFn);
    const pageGuard = blogPostPage.indexOf("if (slug === EMPTY_BLOG_PLACEHOLDER_SLUG)");
    const cachedLoad = blogPostPage.indexOf("await loadCachedBlogArticle");
    const cachedMetadata = blogPostPage.indexOf("return buildBlogMetadata");

    expect(blogPageCache).toContain(
      'export const EMPTY_BLOG_PLACEHOLDER_SLUG = "empty-placeholder-do-not-fetch";',
    );
    expect(blogPageCache).toContain('cacheLife("hours");');
    expect(blogPageCache).toContain("return getPostBySlug(");
    expect(metadataGuard).toBeGreaterThan(metadataFn);
    expect(metadataFetch).toBeGreaterThan(metadataGuard);
    expect(loadGuard).toBeGreaterThan(loadFn);
    expect(loadFetch).toBeGreaterThan(loadGuard);

    expect(blogPostPage).toContain("buildPageMetadata");
    expect(blogPostPage).not.toContain("cacheLife");
    expect(blogPostPage).not.toContain("getPostBySlug");
    expect(pageGuard).toBeGreaterThan(-1);
    expect(cachedLoad).toBeGreaterThan(-1);
    expect(cachedMetadata).toBeGreaterThan(-1);
    expect(pageGuard).toBeLessThan(cachedLoad);
    expect(pageGuard).toBeLessThan(cachedMetadata);
  });

  it("keeps Next prerender feed fetch cancellations out of CI error logs", async () => {
    const feedRoutes = [
      "apps/landing/src/app/api/changelog/rss/route.ts",
      "apps/landing/src/app/api/changelog/atom/route.ts",
    ];

    for (const route of feedRoutes) {
      const source = await readFile(join(process.cwd(), route), "utf8");

      expect(source).toContain("HANGING_PROMISE_REJECTION");
      expect(source).toContain("isNextPrerenderFetchCancellation");
      expect(source).toContain("logFeedError(");
    }
  });
});
