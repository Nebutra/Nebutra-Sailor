import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string }>;
}

// Docs at `/<lang>` would 404 because there is no `content/docs/<lang>/index.mdx`.
// Until someone authors a proper docs landing, send `/<lang>` to the first
// verified-existing page so the host root is never a dead end.
export default async function Page({ params }: PageProps) {
  const { lang } = await params;
  redirect(`/${lang}/getting-started/installation`);
}
