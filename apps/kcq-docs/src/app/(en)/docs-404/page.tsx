import { DocsNotFound, notFoundMetadata } from "@/components/not-found";

export const metadata = notFoundMetadata("en");
export default function NotFound() {
  return <DocsNotFound lang="en" />;
}
