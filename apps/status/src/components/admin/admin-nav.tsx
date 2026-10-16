"use client";

import { cn } from "@nebutra/ui/utils";
import { usePathname } from "next/navigation";

export function AdminNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

/** Language switch: the instance-wide /lang route, back to this same console page. */
export function AdminLanguage({ locale, label }: { locale: "zh-CN" | "en"; label: string }) {
  const pathname = usePathname();
  const other = locale === "zh-CN" ? "en" : "zh-CN";
  return (
    <a
      href={`/lang/${other}?next=${encodeURIComponent(pathname)}`}
      aria-label={label}
      lang={other}
      className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
    >
      {other === "en" ? "English" : "中文"}
    </a>
  );
}
