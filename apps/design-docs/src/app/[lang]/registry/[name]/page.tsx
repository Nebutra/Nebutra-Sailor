import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MaturityBadge } from "@/components/maturity-badge";
import { CopyCommand } from "@/components/registry/copy-command";
import { StatusBadge } from "@/components/status-badge";
import { loadRegistryItem } from "@/lib/registry";
import { getRegistryStrings } from "@/lib/registry-strings";

const REGISTRY_HOST = process.env.NEXT_PUBLIC_REGISTRY_HOST ?? "https://ui.nebutra.com";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ lang: string; name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const item = loadRegistryItem(name);
  if (!item) return { title: "Not found" };
  return {
    title: `${item.title} — Nebutra UI Registry`,
    description: item.description,
  };
}

export default async function RegistryDetailPage({ params }: PageProps) {
  const { lang, name } = await params;
  const item = loadRegistryItem(name);
  if (!item) notFound();

  const t = getRegistryStrings(lang);
  const installCommand = `npx shadcn@latest add ${REGISTRY_HOST}/r/${item.name}.json`;
  const tokens = item.meta?.nebutraTokens ?? [];
  const docs = item.meta?.docs;
  const file = item.files[0];

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-12 md:px-6">
      <nav aria-label="breadcrumb" className="text-muted-foreground text-xs">
        <Link href={`/${lang}/registry`} className="hover:text-primary">
          ← {t.allComponents}
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{item.title}</h1>
          {item.meta?.nebutraLayer && (
            <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {item.meta.nebutraLayer}
            </span>
          )}
          {docs?.status && <StatusBadge status={docs.status} />}
          {docs?.maturity && <MaturityBadge maturity={docs.maturity} />}
        </div>
        <p className="text-base text-muted-foreground">{item.description}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {t.install}
        </h2>
        <CopyCommand command={installCommand} />
        <p className="text-muted-foreground text-xs">{t.installHelper}</p>
      </section>

      {item.dependencies?.length || item.registryDependencies?.length ? (
        <section className="grid gap-6 md:grid-cols-2">
          {item.dependencies && item.dependencies.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                {t.npmDependencies}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {item.dependencies.map((d) => (
                  <li
                    key={d}
                    className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-foreground text-xs"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.registryDependencies && item.registryDependencies.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                {t.registryDependencies}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {item.registryDependencies.map((d) => (
                  <li
                    key={d}
                    className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-primary text-xs"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {tokens.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
            {t.cssVariables}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {tokens.map((token) => (
              <li
                key={token}
                className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-foreground text-xs"
              >
                {token}
              </li>
            ))}
          </ul>
        </section>
      )}

      {file && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
            {t.source} <span className="font-mono text-muted-foreground text-xs">{file.path}</span>
          </h3>
          <pre className="max-h-[480px] overflow-auto rounded-[var(--radius-lg)] border border-border bg-muted p-4 font-mono text-foreground text-xs leading-relaxed">
            <code>{file.content}</code>
          </pre>
        </section>
      )}

      <footer className="flex gap-4 text-sm">
        <a
          href={`/r/${item.name}.json`}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t.viewRawJson}
        </a>
      </footer>
    </main>
  );
}
