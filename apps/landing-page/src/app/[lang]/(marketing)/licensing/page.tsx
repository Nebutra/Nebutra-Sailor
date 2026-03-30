import { CheckCircle, LogoGithub as Github } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Badge, Button, Card } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    title: `Licensing — Nebutra`,
    description: "Dual license model: AGPL-3.0 open source or commercial licenses.",
    alternates: { canonical: `/${lang}/licensing` },
  };
}

export default async function LicensingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background selection:bg-primary/30 relative overflow-hidden"
    >
      <Navbar />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 pt-32 pb-20 text-center sm:px-6 lg:px-8 mt-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <AnimateIn preset="emerge" inView>
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl mb-8 leading-[1.1]">
            Dual{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              License
            </span>{" "}
            Model
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed font-medium">
            Nebutra-Sailor is open source under AGPL-3.0. We also offer commercial licenses for
            teams building closed-source products.
          </p>
        </AnimateIn>
      </section>

      {/* License Comparison Cards */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-8">
        <AnimateInGroup
          stagger="normal"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1200px] mx-auto"
        >
          {/* Card 1: AGPL-3.0 */}
          <AnimateIn preset="fadeUp" inView>
            <Card className="p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl border-border/50 bg-background/50 backdrop-blur-md h-full">
              <Badge
                className="mb-6 w-fit bg-muted text-muted-foreground border-border"
                variant="outline"
              >
                Always Free
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">AGPL-3.0</h3>
                <p className="text-sm font-medium text-muted-foreground">Open Source</p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                Open source projects, academic research, personal learning
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Full source code access</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Must open-source your product</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Must credit Nebutra-Sailor</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Community support only</span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-xl"
                variant="secondary"
                asChild
              >
                <a
                  href="https://github.com/nebutra-sailor"
                  className="flex items-center justify-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
            </Card>
          </AnimateIn>

          {/* Card 2: Free Commercial Exception (Highlighted) */}
          <AnimateIn preset="fadeUp" inView>
            <Card className="p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl border-primary/50 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/10 h-full">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

              <Badge
                className="mb-6 w-fit bg-primary text-primary-foreground border-none"
                variant="default"
              >
                Free Forever
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">Free Commercial</h3>
                <p className="text-sm font-medium text-muted-foreground">Individual & Solo</p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                Solo developers, one-person companies, solopreneurs
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Use in closed-source products</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Team size ≤ 1 FTE</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Credit required</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Free license key via registration</span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                variant="default"
                asChild
              >
                <Link href="/get-license">Get Your Free License</Link>
              </Button>
            </Card>
          </AnimateIn>

          {/* Card 3: Startup / Enterprise */}
          <AnimateIn preset="fadeUp" inView>
            <Card className="p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl border-border/50 bg-background/50 backdrop-blur-md h-full">
              <Badge
                className="mb-6 w-fit bg-muted text-muted-foreground border-border"
                variant="outline"
              >
                From $799/yr
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">Commercial</h3>
                <p className="text-sm font-medium text-muted-foreground">Startup & Enterprise</p>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[50px]">
                Startups, agencies, teams (2+ people), commercial SaaS products
              </p>

              <div className="space-y-3 flex-grow mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Use in closed-source products</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">No copyleft obligations</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">No team size limits</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Commercial support available</span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold rounded-xl"
                variant="secondary"
                asChild
              >
                <Link href="/get-license">Get Commercial License</Link>
              </Button>
            </Card>
          </AnimateIn>
        </AnimateInGroup>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-32 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <h2 className="text-4xl font-black tracking-tight mb-12 text-center">
            Frequently Asked Questions
          </h2>
        </AnimateIn>

        <div className="space-y-8">
          <AnimateInGroup stagger="normal">
            {[
              {
                q: "Why AGPL-3.0?",
                a: "AGPL ensures that improvements to the template stay open source. Commercial license removes this obligation for businesses.",
              },
              {
                q: "Am I really free as a solo developer?",
                a: "Yes, completely. Register at /get-license, get your key, build your product. No strings attached.",
              },
              {
                q: 'What counts as a "one-person company"?',
                a: "One full-time equivalent or less. If you hire your first employee, you'll need a Startup license (we'll remind you).",
              },
              {
                q: "Can I upgrade later?",
                a: "Absolutely. Your community profile carries over. Just purchase the Startup license when you're ready.",
              },
              {
                q: "What about open source contributions?",
                a: "All contributions require a CLA. See CONTRIBUTING.md.",
              },
            ].map((item, idx) => (
              <AnimateIn key={idx} preset="fadeUp" inView>
                <div className="border border-border/50 rounded-2xl p-6 bg-background/50 backdrop-blur-md hover:border-primary/30 transition-colors">
                  <h3 className="text-lg font-bold mb-3">{item.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
