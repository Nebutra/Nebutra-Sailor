import { markdownParams, markdownResponse } from "@/lib/markdown-route";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => markdownParams("zh");
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  return markdownResponse("zh", (await params).slug);
}
