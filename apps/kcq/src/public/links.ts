/**
 * Outbound links the public pages share (nav, footer, community, developers). The repository URL
 * comes from the pinned chart source (virtual:kcq-facts), never typed here.
 */
import facts from "virtual:kcq-facts";
import { DOCS_PATHS, type PublicLocale } from "./routes";

export const LINKS = {
  github: facts.upstream,
  readme: `${facts.upstream}#readme`,
  architecture: `${facts.upstream}/blob/main/docs/architecture/architecture.md`,
  releases: `${facts.upstream}/releases`,
  license: `${facts.upstream}/blob/main/LICENSE`,
  commit: `${facts.repository}/commit/${facts.commit}`,
  npm: "https://www.npmjs.com/package/@363045841yyt/klinechart",
  telegram: "https://t.me/+1o-6B-wVRTU2MjQ9",
  qq: "https://qm.qq.com/q/672011965",
  connector: "https://github.com/TsekaLuk/GoTDX-Connector",
  /** The agent-readable view of this site (prerendered by scripts/prerender.mjs). */
  llms: "/llms.txt",
} as const;

export const INSTALL_COMMAND = "pnpm add @363045841yyt/klinechart";

/**
 * The documentation (apps/kcq-docs, served by the same nginx): English at /docs, Chinese at /zh/docs.
 * Plain links, not router links: the docs are a separate static app.
 */
export function docsPath(locale: PublicLocale, page = ""): string {
  return page ? `${DOCS_PATHS[locale]}/${page}` : DOCS_PATHS[locale];
}
