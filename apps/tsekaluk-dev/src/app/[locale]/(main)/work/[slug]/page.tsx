import { ArrowLeft, ArrowUpRight, LogoGithub } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { TechBadge } from "@/components/tech-badge";
import { Link as LocaleLink } from "@/i18n/navigation";
import { projectJsonLd } from "@/lib/json-ld";
import { getLocalizedProjects, projects } from "@/lib/projects";
import { BASE_URL, seoFor } from "@/lib/seo/alternates";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const localizedProjects = await getLocalizedProjects(locale);
  const project = localizedProjects.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: `${project.name} — Tseka Luk`,
    description: project.tagline,
    ...seoFor(`/work/${slug}`, locale, "ui"),
    openGraph: {
      title: `${project.name} — Tseka Luk`,
      description: project.tagline,
      images: [
        {
          url: `${BASE_URL}/og?title=${encodeURIComponent(project.name)}&subtitle=${encodeURIComponent(project.tagline)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pages.work" });
  const localizedProjects = await getLocalizedProjects(locale);
  const project = localizedProjects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(projectJsonLd(project)),
        }}
      />
      {/* Back link */}
      <AnimateIn preset="fade">
        <LocaleLink
          href="/work"
          className="mb-12 inline-flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </LocaleLink>
      </AnimateIn>

      {/* Header + Highlights */}
      <AnimateIn preset="fadeUp" delay={0.1}>
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 font-serif italic text-xl text-gray-500 dark:text-gray-400">
          {project.tagline}
        </p>
      </AnimateIn>

      {project.metric && (
        <AnimateIn preset="fadeUp" delay={0.15}>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-dark)]" />
            <span className="text-sm font-semibold text-[var(--color-accent-dark)]">
              {project.metric}
            </span>
          </div>
        </AnimateIn>
      )}

      {project.highlights && project.highlights.length > 0 && (
        <AnimateIn preset="fadeUp" delay={0.2}>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {project.highlights.map((h) => (
              <div
                key={h.label}
                className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center"
              >
                <p className="text-3xl font-bold tracking-tight text-foreground">{h.value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{h.label}</p>
              </div>
            ))}
          </div>
        </AnimateIn>
      )}

      {/* Architecture + Story */}
      <div className="mt-16 space-y-8">
        {project.architecture && (
          <AnimateIn preset="fadeUp" inView>
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-6">
              <MermaidDiagram chart={project.architecture} />
            </div>
          </AnimateIn>
        )}

        {project.story && (
          <AnimateIn preset="fadeUp" inView>
            <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {project.story.split("\n\n").map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </AnimateIn>
        )}

        {!project.story && (
          <AnimateIn preset="fadeUp" inView>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {project.description}
            </p>
          </AnimateIn>
        )}
      </div>

      {/* Tech Stack + Tags + Images + Links */}
      <div className="mt-16 space-y-8 border-t border-gray-100 dark:border-gray-800 pt-8">
        {project.techStack && project.techStack.length > 0 && (
          <AnimateIn preset="fadeUp" inView>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {project.techStack.map((tech) => (
                <TechBadge key={tech} tech={tech} variant="card" colorful />
              ))}
            </div>
          </AnimateIn>
        )}
        <AnimateIn preset="fadeUp" inView>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <TechBadge key={tag} tech={tag} variant="tag" colorful />
            ))}
          </div>
        </AnimateIn>

        {project.images && project.images.length > 0 && (
          <AnimateIn preset="fadeUp" inView>
            <div className="grid gap-4 sm:grid-cols-2">
              {project.images.map((src) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800"
                >
                  <Image
                    src={src}
                    alt={project.name}
                    width={600}
                    height={400}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </AnimateIn>
        )}

        {(project.github || project.url) && (
          <AnimateIn preset="fadeUp" inView>
            <div className="flex items-center gap-4">
              {project.github && (
                <Link
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <LogoGithub className="h-4 w-4" />
                  {t("source_code")}
                </Link>
              )}
              {project.url && (
                <Link
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  {t("live_demo")}
                </Link>
              )}
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
