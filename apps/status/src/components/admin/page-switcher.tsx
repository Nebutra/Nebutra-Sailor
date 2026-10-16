import { cn } from "@nebutra/ui/utils";
import type { AdminPage } from "@/lib/admin";

/** When a workspace publishes several pages, choose which one to work on. */
export function PageSwitcher({
  pages,
  current,
  basePath,
}: {
  pages: AdminPage[];
  current: string;
  basePath: string;
}) {
  if (pages.length < 2) return null;
  return (
    <nav className="mb-6 flex flex-wrap gap-1">
      {pages.map((p) => (
        <a
          key={p.slug}
          href={`${basePath}?page=${p.slug}`}
          aria-current={p.slug === current ? "page" : undefined}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs",
            p.slug === current
              ? "border-foreground/30 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {p.title}
        </a>
      ))}
    </nav>
  );
}
