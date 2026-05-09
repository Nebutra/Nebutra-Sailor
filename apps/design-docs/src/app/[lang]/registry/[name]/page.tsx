import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyCommand } from "@/components/registry/copy-command";
import { loadRegistryIndex, loadRegistryItem } from "@/lib/registry";

const REGISTRY_HOST = process.env.NEXT_PUBLIC_REGISTRY_HOST ?? "https://ui.nebutra.com";

interface PageProps {
  params: Promise<{ lang: string; name: string }>;
}

export async function generateStaticParams(): Promise<{ lang: string; name: string }[]> {
  const index = loadRegistryIndex();
  return ["en", "zh"].flatMap((lang) => index.items.map((item) => ({ lang, name: item.name })));
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

  const installCommand = `npx shadcn@latest add ${REGISTRY_HOST}/r/${item.name}.json`;
  const tokens = item.meta?.nebutraTokens ?? [];
  const file = item.files[0];

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-12 md:px-6">
      <nav aria-label="breadcrumb" className="text-xs text-[var(--neutral-11)]">
        <Link href={`/${lang}/registry`} className="hover:text-[var(--blue-9)]">
          ← {lang === "zh" ? "全部组件" : "All components"}
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
          {lang === "zh" ? "安装" : "Install"}
        </h2>
        <CopyCommand command={installCommand} />
        <p className="text-xs text-[var(--neutral-11)]">
          {lang === "zh"
            ? "确保你的 Next.js 项目已经运行过 shadcn init 并配置了 components.json。"
            : "Make sure your Next.js project has been initialised with shadcn init and has a components.json."}
        </p>
      </section>

      {item.dependencies?.length || item.registryDependencies?.length ? (
        <section className="grid gap-6 md:grid-cols-2">
          {item.dependencies && item.dependencies.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
                {lang === "zh" ? "npm 依赖" : "npm dependencies"}
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
                {lang === "zh" ? "Registry 依赖" : "Registry dependencies"}
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
            {lang === "zh" ? "CSS 变量" : "CSS variables"}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {tokens.map((t) => (
              <li
                key={t}
                className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-2 py-1 font-mono text-xs text-[var(--neutral-12)]"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {file && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--neutral-12)]">
            {lang === "zh" ? "源码预览" : "Source"}{" "}
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
          {lang === "zh" ? "查看原始 JSON" : "View raw JSON"}
        </a>
      </footer>
    </main>
  );
}
