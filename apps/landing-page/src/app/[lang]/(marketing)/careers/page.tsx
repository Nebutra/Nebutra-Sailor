import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
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
    title: "Careers — Nebutra",
    description: "Engineering signal over credentials. Submit your GitHub profile to join Nebutra.",
    alternates: { canonical: `/${lang}/careers` },
  };
}

interface Role {
  title: string;
  type: string;
  summary: string;
  stack: string[];
  mailto: string;
}

const ROLES: Role[] = [
  {
    title: "Founding Engineer",
    type: "Full-time · Remote / Singapore · Founding",
    summary:
      "Own a vertical of the Sailor SaaS skeleton end-to-end — from Prisma schema through Hono APIs to RSC UI. Deep TypeScript, Postgres, and AI SDK expertise expected.",
    stack: ["TypeScript", "Next.js 16", "Prisma", "AI SDK", "Hono", "Tailwind v4"],
    mailto: "mailto:jobs@nebutra.com?subject=Founding%20Engineer%20%E2%80%94%20GitHub%20Profile",
  },
  {
    title: "Design Engineer",
    type: "Full-time · Remote · Founding",
    summary:
      "Own the design system, brand, and component library. We ship Lobe UI + custom primitives + Geist icons + Framer Motion at scale across 7 locales.",
    stack: ["React", "Tailwind v4", "Storybook", "Figma / Penpot", "Framer Motion"],
    mailto: "mailto:jobs@nebutra.com?subject=Design%20Engineer%20%E2%80%94%20GitHub%20Profile",
  },
];

export default async function CareersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <Suspense>
      <main id="main-content" className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <section className="container mx-auto max-w-4xl px-4 py-32">
          <AnimateIn preset="emerge">
            <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
              Careers
            </p>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground mb-6"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              Signal over credentials.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-16 max-w-3xl">
              We hire on engineering signal — public code, shipping history, taste. No GPA filters.
              No prestige bias. Send us the link to what you have built.
            </p>
          </AnimateIn>

          <AnimateInGroup stagger="normal" className="grid gap-4">
            {ROLES.map((role) => (
              <AnimateIn key={role.title} preset="fadeUp">
                <article className="rounded-[var(--radius-card)] border border-border bg-card/30 p-8 hover:border-primary/40 hover:bg-card/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {role.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">{role.type}</p>
                    </div>
                    <Button asChild size="sm" className="rounded-full shrink-0">
                      <a href={role.mailto}>
                        Submit GitHub <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">{role.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.stack.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </article>
              </AnimateIn>
            ))}
          </AnimateInGroup>

          <AnimateIn preset="fadeUp" className="mt-12">
            <div className="rounded-[var(--radius-card)] border border-border bg-muted/30 p-10 text-center">
              <Sparkles className="h-8 w-8 mx-auto text-primary mb-4" />
              <h3 className="text-2xl font-bold tracking-tight mb-3">Don&apos;t see your role?</h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                We are growing across engineering, design, and developer relations. If your GitHub
                speaks for itself, we want to hear from you.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <a href="mailto:jobs@nebutra.com?subject=GitHub%20Profile%20Submission">
                  Submit your GitHub profile <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </AnimateIn>
        </section>
        <FooterMinimal />
      </main>
    </Suspense>
  );
}
