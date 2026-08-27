import { source } from "@/lib/source";

// cached forever
export const revalidate = false;

export function GET() {
  const content = source
    .getPages()
    .map(
      (page) =>
        `- [${page.data.title}](${page.url}) - ${page.data.description ?? "Documentation page"}`,
    )
    .join("\n");

  return new Response(`# Documentation\n\n${content}`);
}
