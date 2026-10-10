import { DocsNotFound, notFoundMetadata } from "@/components/not-found";

export const metadata = notFoundMetadata("zh");
export default function NotFound() {
  return <DocsNotFound lang="zh" />;
}
