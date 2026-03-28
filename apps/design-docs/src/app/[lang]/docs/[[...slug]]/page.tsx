import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { MDXComponents } from "mdx/types";
import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback/client";
import { FigmaLink } from "@/components/figma-link";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { DeprecatedBanner, StatusBadge } from "@/components/status-badge";
import { onPageFeedbackAction } from "@/lib/github";
import { getPageImage, source } from "@/lib/source";
import { useMDXComponents } from "../../../../../mdx-components";

interface PageProps {
  params: Promise<{ slug?: string[]; lang: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = (page.data as { body: React.ComponentType<{ components: MDXComponents }> }).body;
  const components = useMDXComponents({});

  return (
    <DocsPage
      toc={(page.data as { toc: React.ComponentProps<typeof DocsPage>["toc"] }).toc}
      lastUpdate={(page.data as { _exports?: { lastModified?: Date } })._exports?.lastModified}
      editOnGithub={{
        repo: "Nebutra-Sailor",
        owner: "TsekaLuk",
        sha: "main",
        path: `apps/design-docs/content/docs/${page.path}`,
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
        <LLMCopyButton markdownUrl={`/llms.mdx/docs/${page.path}`} />
        <ViewOptions
          markdownUrl={`/llms.mdx/docs/${page.path}`}
          githubUrl={`https://github.com/TsekaLuk/Nebutra-Sailor/blob/main/apps/design-docs/content/docs/${page.path}`}
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

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
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
