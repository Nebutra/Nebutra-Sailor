import { DocsPageView, pageMetadata, pageParams } from "@/components/docs-page";

type Props = { params: Promise<{ slug?: string[] }> };

export const dynamicParams = false;
export const generateStaticParams = () => pageParams("zh");
export async function generateMetadata({ params }: Props) {
  return pageMetadata("zh", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <DocsPageView lang="zh" slug={(await params).slug} />;
}
