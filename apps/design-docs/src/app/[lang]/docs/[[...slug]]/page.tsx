import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { MDXComponents } from "mdx/types";
import { notFound } from "next/navigation";
import { DeprecatedBanner } from "@/components/deprecated-banner";
import { Feedback } from "@/components/feedback/client";
import { FigmaLink } from "@/components/figma-link";
import { MaturityBadge } from "@/components/maturity-badge";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { StatusBadge } from "@/components/status-badge";
import { onPageFeedbackAction } from "@/lib/github";
import { getRegistryDocsMetadata, type RegistryDocsMetadata } from "@/lib/registry";
import { getPageImage, source } from "@/lib/source";
import { getMDXComponents } from "../../../../../mdx-components";

interface PageProps {
  params: Promise<{ slug?: string[]; lang: string }>;
}

const mdxComponents = getMDXComponents();

export default async function Page({ params }: PageProps) {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MdxContent = (page.data as { body: React.ComponentType<{ components: MDXComponents }> })
    .body;
  const docsMetadata = resolveDocsMetadata(slug, page.data);

  return (
    <DocsPage
      toc={(page.data as { toc: React.ComponentProps<typeof DocsPage>["toc"] }).toc}
      lastUpdate={(page.data as { lastModified?: Date }).lastModified}
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
      {(docsMetadata?.status || docsMetadata?.maturity) && (
        <div className="mt-2 mb-4 flex items-center gap-2">
          {docsMetadata.status && <StatusBadge status={docsMetadata.status} />}
          {docsMetadata.maturity && <MaturityBadge maturity={docsMetadata.maturity} />}
        </div>
      )}
      {docsMetadata?.status === "deprecated" && <DeprecatedBanner />}
      <div className="gap-2 pt-2 pb-6 flex flex-row items-center border-b">
        <LLMCopyButton markdownUrl={`/llms.mdx/docs/${page.path}`} />
        <ViewOptions
          markdownUrl={`/llms.mdx/docs/${page.path}`}
          githubUrl={`https://github.com/Nebutra/Nebutra-Sailor/blob/main/apps/design-docs/content/docs/${page.path}`}
        />
        {(page.data as { figma?: string }).figma && (
          <FigmaLink href={(page.data as { figma: string }).figma} />
        )}
      </div>
      <DocsBody>
        <MdxContent components={mdxComponents} />
      </DocsBody>
      <Feedback onSendAction={onPageFeedbackAction} />
    </DocsPage>
  );
}

function resolveDocsMetadata(
  slug: string[] | undefined,
  data: unknown,
): Partial<Pick<RegistryDocsMetadata, "maturity" | "status">> | undefined {
  const registryName = slug?.at(-1);
  if (registryName) {
    const registryMetadata = getRegistryDocsMetadata(registryName);
    if (registryMetadata) {
      return { maturity: registryMetadata.maturity, status: registryMetadata.status };
    }
  }

  const status = (data as { status?: RegistryDocsMetadata["status"] }).status;
  const maturity = (data as { maturity?: RegistryDocsMetadata["maturity"] }).maturity;
  return status || maturity ? { maturity, status } : undefined;
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
