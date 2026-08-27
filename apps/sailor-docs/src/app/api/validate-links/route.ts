import type { InferPageType } from "fumadocs-core/source";
import type { DocData, DocMethods } from "fumadocs-mdx/runtime/types";
import { NextResponse } from "next/server";
import { type FileObject, scanURLs, validateFiles } from "next-validate-link";
import { source } from "@/lib/source";

// fumadocs-core's `InferPageType` returns the bare PageData (frontmatter +
// title/description). The MDX runtime adds `toc` (DocData) and `getText`
// (DocMethods) at access time, but the loader generics in fumadocs-core 16
// don't propagate them. Cast at call sites.
type MdxPageData = InferPageType<typeof source>["data"] & DocData & DocMethods;

export async function GET() {
  const scanned = await scanURLs({
    // pick a preset for your React framework
    preset: "next",
    populate: {
      "docs/[[...slug]]": source.getPages().map((page) => ({
        value: { slug: page.slugs },
        hashes: getHeadings(page),
      })),
    },
  });

  const results = await validateFiles(await getFiles(), {
    scanned,
    // check `href` attributes in different MDX components
    markdown: {
      components: {
        Card: { attributes: ["href"] },
      },
    },
    // check relative paths
    checkRelativePaths: "as-url",
  });

  // Calculate stats
  const totalFiles = results.length;
  const filesWithErrors = results.filter((file) => file.errors.length > 0);
  const totalErrors = filesWithErrors.reduce((sum, file) => sum + file.errors.length, 0);

  return NextResponse.json({
    message:
      totalErrors === 0
        ? "✅ All links are valid!"
        : `❌ Found ${totalErrors} invalid links across ${filesWithErrors.length} files.`,
    stats: {
      totalFilesScanned: totalFiles,
      invalidFiles: filesWithErrors.length,
      invalidLinks: totalErrors,
    },
    errors: filesWithErrors.map((result) => ({
      file: result.file,
      errors: result.errors,
    })),
  });
}

function getHeadings({ data }: InferPageType<typeof source>): string[] {
  return (data as MdxPageData).toc.map((item) => item.url.slice(1));
}

function getFiles() {
  const promises = source.getPages().map(
    async (page): Promise<FileObject> => ({
      path: page.absolutePath ?? page.url,
      content: await (page.data as MdxPageData).getText("raw"),
      url: page.url,
      data: page.data,
    }),
  );
  return Promise.all(promises);
}
