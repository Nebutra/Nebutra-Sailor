import type { ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";

export function QuietPage({
  active,
  title,
  line,
  query,
  children,
}: {
  active: "/" | "/create" | "/wardrobe" | "/moments" | "/me";
  title: string;
  line: string;
  query?: string;
  children?: ReactNode;
}) {
  return (
    <div className="shell">
      <SiteNav active={active} query={query} />
      <main className="page-main">
        <h1>{title}</h1>
        <p className="lede">{line}</p>
        {children}
      </main>
    </div>
  );
}
