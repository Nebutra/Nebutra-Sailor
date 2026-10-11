import type { ReactNode } from "react";
import "../globals.css";
import { DocsShell } from "@/components/docs-shell";
import { layoutMetadata } from "@/lib/layout-metadata";

export { viewport } from "@/lib/layout-metadata";
export const metadata = layoutMetadata("en");

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <DocsShell lang="en">{children}</DocsShell>;
}
