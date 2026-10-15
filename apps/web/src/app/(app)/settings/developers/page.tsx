import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ArrowRight } from "@nebutra/icons";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireOrg } from "@/lib/auth";
import { DEVELOPER_CONSOLE_LINKS } from "@/lib/developer-console";

export const metadata = { title: "Open Platform — Settings" };

export default async function DeveloperConsolePage() {
  const tc = await getTranslations("copy.developersPage");
  await requireOrg();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-foreground">{tc("openPlatform")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tc.rich("intro", {
            name: brand.name,
            domain: brand.domains.open,
            link: (chunks) => (
              <a
                href={getBrandOrigin("open")}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </header>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {DEVELOPER_CONSOLE_LINKS.map((link) => (
          <li key={link.id}>
            <Link
              href={link.href}
              className="group flex items-start justify-between gap-4 p-5 transition-colors hover:bg-accent"
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {tc(`links.${link.id}.title`)}
                </span>
                <span className="mt-1 block text-sm text-neutral-11">
                  {tc(`links.${link.id}.description`)}
                </span>
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-11 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:group-hover:translate-x-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
