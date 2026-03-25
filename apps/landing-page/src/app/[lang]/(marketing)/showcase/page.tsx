import { getImageUrl } from "@nebutra/sanity/image";
import { getShowcaseProjects } from "@nebutra/sanity/queries";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  return {
    title: "Showcase — Nebutra Sailor",
    description: "Discover what developers and teams are building with Nebutra Sailor.",
    alternates: { canonical: `/${lang}/showcase` },
  };
}

interface ShowcaseProject {
  _id: string;
  name: string;
  slug: { current: string };
  url: string;
  description?: string;
  logo?: { asset: { _ref: string } };
  screenshot?: { asset: { _ref: string } };
  category?: string;
  featured?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  saas: "SaaS",
  ecommerce: "E-Commerce",
  ai: "AI / ML",
  devtools: "Developer Tools",
  marketing: "Marketing",
  other: "Other",
};

export default async function ShowcasePage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("hours");

  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return null;
  setRequestLocale(lang as Locale);

  const projects: ShowcaseProject[] = await getShowcaseProjects();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6">
        <AnimateIn preset="fadeUp">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-12 sm:text-5xl dark:text-white">
              Showcase
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-11 dark:text-white/70">
              See what developers and teams are building with Nebutra Sailor.
            </p>
          </div>
        </AnimateIn>

        {projects.length === 0 ? (
          <AnimateIn preset="fadeUp">
            <div className="mt-16 rounded-xl border border-neutral-7 bg-neutral-2 p-12 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-lg font-medium text-neutral-12 dark:text-white">Coming soon</p>
              <p className="mt-2 text-sm text-neutral-11 dark:text-white/70">
                Projects built with Nebutra Sailor will be featured here.
              </p>
            </div>
          </AnimateIn>
        ) : (
          <AnimateInGroup
            stagger="normal"
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {projects.map((project) => (
              <AnimateIn key={project._id} preset="fadeUp">
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-xl border border-neutral-7 bg-neutral-1 transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                >
                  {project.screenshot?.asset ? (
                    <div className="relative aspect-video overflow-hidden bg-neutral-3 dark:bg-white/10">
                      <Image
                        src={getImageUrl(project.screenshot, { width: 600, height: 340 })}
                        alt={project.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-neutral-3 dark:bg-white/10">
                      {project.logo?.asset ? (
                        <Image
                          src={getImageUrl(project.logo, { width: 120, height: 120 })}
                          alt={project.name}
                          width={60}
                          height={60}
                          className="opacity-60"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-neutral-7 dark:text-white/20">
                          {project.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
                        {project.name}
                      </h2>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-10 transition-colors group-hover:text-blue-10 dark:text-white/50 dark:group-hover:text-cyan-9" />
                    </div>
                    {project.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-neutral-11 dark:text-white/70">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {project.category && (
                        <span className="rounded-full bg-neutral-3 px-2 py-0.5 text-xs font-medium text-neutral-11 dark:bg-white/10 dark:text-white/70">
                          {CATEGORY_LABELS[project.category] ?? project.category}
                        </span>
                      )}
                      {project.featured && (
                        <span className="rounded-full bg-blue-3 px-2 py-0.5 text-xs font-medium text-blue-11 dark:bg-blue-9/20 dark:text-blue-9">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        )}
      </main>
      <FooterMinimal />
    </>
  );
}
