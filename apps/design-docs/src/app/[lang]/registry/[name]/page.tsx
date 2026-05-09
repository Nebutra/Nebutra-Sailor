import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyCommand } from "@/components/registry/copy-command";
import { loadRegistryIndex, loadRegistryItem } from "@/lib/registry";
import { getRegistryStrings, REGISTRY_LANGS } from "@/lib/registry-strings";

const REGISTRY_HOST = process.env.NEXT_PUBLIC_REGISTRY_HOST ?? "https://ui.nebutra.com";

interface PageProps {
  params: Promise<{ lang: string; name: string }>;
}

export async function generateStaticParams(): Promise<{ lang: string; name: string }[]> {
  const index = loadRegistryIndex();
  return REGISTRY_LANGS.flatMap((lang) => index.items.map((item) => ({ lang, name: item.name })));
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
  const file = item.files[0];

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-12 md:px-6">
      <nav aria-label="breadcrumb" className="text-xs text-[var(--neutral-11)]">
        <Link href={`/${lang}/registry`} className="hover:text-[var(--blue-9)]">
          ← {t.allComponents}
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--neutral-12)]">
            {item.title}
          </h1>
          {item.meta?.nebutraLayer && (
            <span className="rounded-full bg-[var(--blue-3)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--blue-9)]">
              {item.meta.nebutraLayer}
            </span>
          )}
        </div>
        <p className="text-base text-[var(--neutral-11)]">{item.description}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
          {t.install}
        </h2>
        <CopyCommand command={installCommand} />
        <p className="text-xs text-[var(--neutral-11)]">{t.installHelper}</p>
      </section>

      {item.dependencies?.length || item.registryDependencies?.length ? (
        <section className="grid gap-6 md:grid-cols-2">
          {item.dependencies && item.dependencies.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
                {t.npmDependencies}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {item.dependencies.map((d) => (
                  <li
                    key={d}
                    className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-2 py-1 font-mono text-xs text-[var(--neutral-12)]"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.registryDependencies && item.registryDependencies.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
                {t.registryDependencies}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {item.registryDependencies.map((d) => (
                  <li
                    key={d}
                    className="rounded-md border border-[var(--blue-9)] bg-[var(--blue-3)] px-2 py-1 font-mono text-xs text-[var(--blue-9)]"
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
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
            {t.cssVariables}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {tokens.map((token) => (
              <li
                key={token}
                className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-2 py-1 font-mono text-xs text-[var(--neutral-12)]"
              >
                {token}
              </li>
            ))}
          </ul>
        </section>
      )}

      {file && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
            {t.source}{" "}
            <span className="font-mono text-xs text-[var(--neutral-11)]">{file.path}</span>
          </h3>
          <pre className="max-h-[480px] overflow-auto rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4 font-mono text-xs leading-relaxed text-[var(--neutral-12)]">
            <code>{file.content}</code>
          </pre>
        </section>
      )}

      <footer className="flex gap-4 text-sm">
        <a
          href={`/r/${item.name}.json`}
          className="text-[var(--blue-9)] underline-offset-4 hover:underline"
        >
          {t.viewRawJson}
        </a>
      </footer>
    </main>
  );
}
