import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/lib/mdx-components";
import { compiler } from "@/lib/mdx-remote-compiler";

// ----------------------------------------------------------------------
// HYBRID ARCHITECTURE EXAMPLE:
// Using @fumadocs/mdx-remote
// ----------------------------------------------------------------------
// In a real SaaS, this function would fetch Markdown from your Database,
// CMS (Strapi/Contentful), or remote GitHub repository.
async function getRemotePageData(slug: string[] = []) {
  const path = slug.join("/");

  if (path === "example") {
    return {
      title: "Remote CMS Page Example",
      description: "This page is rendered directly from a string in the database.",
      content: `
# Welcome to MDX Remote!

This content is **not** hosted in a local \`.mdx\` file. It is a raw string passed to the MDX Compiler at runtime!

<Callout type="info">
Did you know? Even though this is rendered remotely, it still has full access to your custom React components!
</Callout>

### Seamless Component Usage

Here's an interactive button injected from your local codebase, rendered remotely:

<Button variant="default">Click Me</Button>

<Tabs items={['React', 'Vue', 'Svelte']}>
  <Tab value="React">React is awesome</Tab>
  <Tab value="Vue">Vue is progressive</Tab>
  <Tab value="Svelte">Svelte is radical</Tab>
</Tabs>
      `,
    };
  }

  return null;
}

export default async function RemoteMDXPage({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { slug } = await params;

  // 1. Fetch remote content
  const page = await getRemotePageData(slug);
  if (!page) notFound();

  // 2. Compile at runtime
  const compiled = await compiler.compile({
    source: page.content,
  });

  // 3. Extract the body
  const MdxContent = compiled.body;

  // 4. Render
  return (
    <DocsPage toc={compiled.toc} full={false}>
      <DocsBody>
        <h1>{page.title}</h1>
        {page.description && (
          <p className="text-muted-foreground text-lg mb-8">{page.description}</p>
        )}

        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
