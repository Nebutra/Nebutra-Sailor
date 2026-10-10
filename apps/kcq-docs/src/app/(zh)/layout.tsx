import type { ReactNode } from "react";
import "../globals.css";
import { DocsShell } from "@/components/docs-shell";
import { layoutMetadata } from "@/lib/layout-metadata";

export { viewport } from "@/lib/layout-metadata";
export const metadata = layoutMetadata("zh");

export default function ChineseLayout({ children }: { children: ReactNode }) {
  return <DocsShell lang="zh">{children}</DocsShell>;
}
