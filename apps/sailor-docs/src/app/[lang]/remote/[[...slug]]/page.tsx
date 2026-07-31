import { notFound } from "next/navigation";

/**
 * Hybrid remote-MDX demo route.
 *
 * Disabled for all production targets that ship via OpenNext → Cloudflare
 * Workers: `@fumadocs/mdx-remote` pulls rehype-code + full Shiki into the
 * Worker bundle (~8 MiB of grammars) and exceeds size limits. Local docs
 * content under `content/docs` is unaffected.
 */
export default async function RemoteMDXPage() {
  notFound();
}
