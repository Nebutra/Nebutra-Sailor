import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { MDXComponents } from "mdx/types";
import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback/client";
import { FigmaLink } from "@/components/figma-link";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { DeprecatedBanner, StatusBadge } from "@/components/status-badge";
import { BASE_PATH } from "@/lib/base-path";
import { fallbackPageFor } from "@/lib/docs-fallback";
import { onPageFeedbackAction } from "@/lib/feedback-client";
import { i18n } from "@/lib/i18n";
import { getPageImage, source } from "@/lib/source";
import { useMDXComponents } from "../../../../mdx-components";

interface PageProps {
  params: Promise<{ slug?: string[]; lang: string }>;
}

/**
 * The page to render: the requested one, or the fallback served in its place.
 *
 * Three miss shapes, two of them recoverable — `fallbackPageFor` owns which.
 * The recoverable ones are SERVED here, not redirected to: this app is reached
 * through landing's `/docs` rewrite, so a redirect's Location would be in this
 * app's own path space (`/en/...`) and the browser would resolve it against the
 * visitor's host, landing them outside the documentation. Serving content at the
 * requested URL is the only answer a rewrite passes through intact.
 */
function resolvePage(slug: string[] | undefined, lang: string) {
  const requested = source.getPage(slug, lang);
  if (requested) return requested;
  const fallback = fallbackPageFor(source, slug, lang);
  return fallback ? source.getPage(fallback.slugs, fallback.language) : undefined;
}

export default async function Page({ params }: PageProps) {
  const { slug, lang } = await params;
  const page = resolvePage(slug, lang);
  if (!page) {
    notFound();
  }

  const MDX = (page.data as { body: React.ComponentType<{ components: MDXComponents }> }).body;
  const components = useMDXComponents({});

  return (
    <DocsPage
      toc={(page.data as { toc: React.ComponentProps<typeof DocsPage>["toc"] }).toc}
      lastUpdate={(page.data as { lastModified?: Date }).lastModified}
      editOnGithub={{
        repo: "Nebutra-Sailor",
        owner: "TsekaLuk",
        sha: "main",
        path: `apps/sailor-docs/content/docs/${page.path}`,
      }}
      breadcrumb={{
        enabled: true,
      }}
      tableOfContent={{
        style: "clerk",
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {(page.data as { status?: string }).status && (
        <div className="mt-2 mb-4 gap-2 flex items-center">
          <StatusBadge
            status={
              (
                page.data as {
                  status: "stable" | "beta" | "deprecated" | "experimental";
                }
              ).status ?? "stable"
            }
          />
        </div>
      )}
      {(page.data as { status?: string }).status === "deprecated" && <DeprecatedBanner />}
      <div className="gap-2 pt-2 pb-6 flex flex-row items-center border-b">
        <LLMCopyButton markdownUrl={`${BASE_PATH}/llms.mdx/docs/${page.path}`} />
        <ViewOptions
          markdownUrl={`${BASE_PATH}/llms.mdx/docs/${page.path}`}
          githubUrl={`https://github.com/Nebutra/Nebutra-Sailor/blob/main/apps/sailor-docs/content/docs/${page.path}`}
        />
        {(page.data as { figma?: string }).figma && (
          <FigmaLink href={(page.data as { figma: string }).figma} />
        )}
      </div>
      <DocsBody>
        <MDX components={components} />
      </DocsBody>
      <Feedback onSendAction={onPageFeedbackAction} />
    </DocsPage>
  );
}

/**
 * `source.generateParams()` alone never includes the empty-slug case — the
 * docs tree has no `index.mdx` for any language, by design (see
 * docs-fallback.ts). In server mode that was fine: a request for the zone
 * root or `/zh` fell through to `resolvePage`'s fallback logic at request
 * time. A static export has no request time — every path that should exist
 * must be enumerated here so `next build` actually writes a file for it.
 * Appending one empty-slug entry per configured language makes `/en`
 * (→ the zone root, after scripts/postbuild-static-export.mjs drops the
 * `/en` prefix) and `/zh` real prerendered pages instead of a 404-by-omission.
 */
export async function generateStaticParams() {
  const pages = source.generateParams();
  const roots = i18n.languages.map((lang) => ({ lang, slug: [] as string[] }));
  return [...pages, ...roots];
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, lang } = await params;
  // Resolve exactly as the component does. This used to return `{}` for a
  // recoverable miss because the component was about to redirect and a
  // bare notFound() here would have 404'd the request first. The component now
  // serves the fallback's content, so yielding empty metadata would ship a
  // rendered page with no title, description or social image.
  const page = resolvePage(slug, lang);
  if (!page) {
    notFound();
  }
  const image = getPageImage(page);
  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: image.url,
    },
    twitter: {
      images: image.url,
    },
  };
}
