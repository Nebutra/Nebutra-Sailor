import { buildToolPageModel } from "@nebutra/forge-runtime";
import { Card, PageHeader } from "@nebutra/ui/layout";
import { Badge } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Base64Runner } from "@/components/base64-runner";
import { HashRunner } from "@/components/hash-runner";
import { ImageToolRunner } from "@/components/image-tool-runner";
import { JsonFormatRunner } from "@/components/json-format-runner";
import { JwtRunner } from "@/components/jwt-runner";
import { MdToPdfRunner } from "@/components/md-to-pdf-runner";
import { NumberBaseRunner } from "@/components/number-base-runner";
import { PasswordRunner } from "@/components/password-runner";
import { TextDiffRunner } from "@/components/text-diff-runner";
import { TimestampRunner } from "@/components/timestamp-runner";
import { TokenCountRunner } from "@/components/token-count-runner";
import { ToolRunner } from "@/components/tool-runner";
import { UuidRunner } from "@/components/uuid-runner";
import { WordCountRunner } from "@/components/word-count-runner";
import { categoryMeta } from "@/lib/category-meta";
import { getForgeRegistry } from "@/lib/registry";

type Props = { params: Promise<{ slug: string }> };

function defaultInputForSlug(slug: string): string {
  switch (slug) {
    case "json-format":
      return '{\n  "hello": "world"\n}';
    case "uuid":
      return '{\n  "count": 3\n}';
    case "unix-timestamp":
      return '{\n  "mode": "now"\n}';
    case "base64":
    case "url-encode":
    case "html-entities":
      return '{\n  "text": "Hello Nebutra",\n  "mode": "encode"\n}';
    case "number-base":
      return '{\n  "value": "255",\n  "fromBase": 10,\n  "toBase": 16\n}';
    case "password-generate":
      return '{\n  "length": 16,\n  "symbols": true\n}';
    case "md-to-pdf":
      return '{\n  "title": "Demo",\n  "markdown": "# Hello\\n\\n**Nebutra** Forge md→pdf\\n"\n}';
    case "text-diff":
      return '{\n  "left": "a\\nb\\nc",\n  "right": "a\\nx\\nc"\n}';
    case "jwt-decode":
      return '{\n  "token": "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ."\n}';
    case "token-count":
      return '{\n  "text": "Hello Nebutra, count my tokens.",\n  "encoding": "cl100k_base"\n}';
    default:
      return "Hello Nebutra 你好世界";
  }
}

export async function generateStaticParams() {
  return getForgeRegistry()
    .list()
    .map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const registry = getForgeRegistry();
  if (!registry.has(slug)) {
    return { title: "Tool not found" };
  }
  const page = buildToolPageModel(registry, slug);
  return {
    title: page.seo.title.zh,
    description: page.description.zh,
    keywords: page.seo.keywords.zh.split(","),
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const registry = getForgeRegistry();
  if (!registry.has(slug)) {
    notFound();
  }
  const page = buildToolPageModel(registry, slug);
  const cat = categoryMeta(page.category);

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/"
            className="rounded-md px-1.5 py-0.5 transition hover:bg-accent hover:text-foreground"
          >
            工具
          </Link>
          <span className="text-border">/</span>
          <Link
            href={`/#${page.category}`}
            className="rounded-md px-1.5 py-0.5 transition hover:bg-accent hover:text-foreground"
          >
            {cat.label}
          </Link>
        </p>
        <PageHeader title={page.title.zh} description={page.description.zh} />
        <div className="flex flex-wrap gap-2">
          <Badge variant="gray-subtle" className="font-mono text-[10px]">
            {page.engine.name}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            v{page.engine.version}
          </Badge>
          <Badge variant="outline" className="max-w-[min(100%,28rem)] truncate text-[10px]">
            {page.engine.upstream}
          </Badge>
        </div>
      </div>

      <Card className="border-border/80 p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-sm font-semibold">工作台</p>
            <p className="text-xs text-muted-foreground">人机同路径 · 本地或服务端 invoke</p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {page.id}
          </Badge>
        </div>
        {page.slug === "word-count" ? (
          <WordCountRunner toolId={page.id} />
        ) : page.slug === "json-format" ? (
          <JsonFormatRunner toolId={page.id} />
        ) : page.slug === "text-diff" ? (
          <TextDiffRunner toolId={page.id} />
        ) : page.slug === "base64" ||
          page.slug === "url-encode" ||
          page.slug === "html-entities" ? (
          <Base64Runner toolId={page.id} />
        ) : page.slug === "unix-timestamp" ? (
          <TimestampRunner toolId={page.id} />
        ) : page.slug === "uuid" ? (
          <UuidRunner toolId={page.id} />
        ) : page.slug === "md-to-pdf" ? (
          <MdToPdfRunner toolId={page.id} />
        ) : page.slug === "md5" ? (
          <HashRunner toolId={page.id} algorithm="md5" />
        ) : page.slug === "sha1" ? (
          <HashRunner toolId={page.id} algorithm="sha1" />
        ) : page.slug === "sha256" ? (
          <HashRunner toolId={page.id} algorithm="sha256" />
        ) : page.slug === "password-generate" ? (
          <PasswordRunner toolId={page.id} />
        ) : page.slug === "number-base" ? (
          <NumberBaseRunner toolId={page.id} />
        ) : page.slug === "jwt-decode" ? (
          <JwtRunner toolId={page.id} />
        ) : page.slug === "token-count" ? (
          <TokenCountRunner toolId={page.id} />
        ) : page.category === "image" ? (
          <ImageToolRunner toolId={page.id} />
        ) : (
          <ToolRunner
            toolId={page.id}
            slug={page.slug}
            defaultJson={defaultInputForSlug(page.slug)}
          />
        )}
      </Card>

      <Card className="border-border/80 bg-muted/30 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Agent / API</h2>
          <Badge variant="outline" className="font-mono text-[10px]">
            {page.meterId}
          </Badge>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          同一能力可被 Agent 调用。生产环境请走认证 Key。
        </p>
        <pre className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-background p-4 font-mono text-[11px] leading-relaxed">
          {page.api.exampleCurl}
        </pre>
      </Card>

      {page.related.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">相关工具</h2>
          <ul className="flex flex-wrap gap-2">
            {page.related.map((t) => (
              <li key={t.id}>
                <Link href={t.path}>
                  <Badge variant="outline" className="cursor-pointer px-3 py-1 hover:bg-accent">
                    {t.title.zh}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
