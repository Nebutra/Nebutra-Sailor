import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import {
  ArrowRight,
  Database,
  FileLock,
  FileText,
  Key,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";
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
    title: "Security — Nebutra",
    description:
      "Tenant isolation, application-layer encryption, RBAC/ABAC, structured audit logging — built into the Sailor skeleton as installable packages.",
    alternates: { canonical: `/${lang}/security` },
  };
}

interface Capability {
  icon: typeof ShieldCheck;
  title: string;
  pkg: string;
  summary: string;
  wip?: boolean;
}

const CAPABILITIES: Capability[] = [
  {
    icon: Users,
    title: "Tenant isolation",
    pkg: "@nebutra/tenant",
    summary:
      "Request-scoped tenant context (AsyncLocalStorage) plus Postgres Row-Level Security policies for hard tenant isolation at the database layer.",
  },
  {
    icon: Lock,
    title: "Application-layer encryption",
    pkg: "@nebutra/vault",
    summary:
      "Envelope encryption with AWS KMS for customer secrets. Plaintext never leaves the application boundary; rotation-aware data encryption keys.",
  },
  {
    icon: ShieldCheck,
    title: "RBAC & ABAC",
    pkg: "@nebutra/permissions",
    summary:
      "CASL for in-process role/attribute checks; OpenFGA adapter for Zanzibar-style relationship graphs at enterprise scale.",
  },
  {
    icon: FileText,
    title: "Structured audit logging",
    pkg: "@nebutra/audit",
    summary:
      "Consistent AuditEvent format with actor / action / resource / outcome attribution. Architecture in place; production integration in progress.",
    wip: true,
  },
  {
    icon: Key,
    title: "Multi-provider auth",
    pkg: "@nebutra/auth",
    summary:
      "Pluggable Clerk / Better Auth / NextAuth backends — pick the right identity layer for your compliance posture without rewriting app code.",
  },
  {
    icon: Database,
    title: "Secrets at the boundary",
    pkg: "env validation + @nebutra/vault",
    summary:
      "Required env vars validated at process start (Zod schema). Application secrets are decrypted on demand, never persisted to logs.",
  },
];

type ComplianceTone = "ready" | "planned";

interface ComplianceRow {
  label: string;
  state: string;
  tone: ComplianceTone;
  detail: string;
}

const COMPLIANCE: ComplianceRow[] = [
  {
    label: "GDPR / UK GDPR data handling",
    state: "Aligned",
    tone: "ready",
    detail: "DPA available on request. Data subject access and deletion workflows in app.",
  },
  {
    label: "SOC 2 Type II",
    state: "On roadmap",
    tone: "planned",
    detail:
      "Not currently certified. Architecture designed to support SOC 2 controls; formal audit planned.",
  },
  {
    label: "ISO 27001",
    state: "On roadmap",
    tone: "planned",
    detail: "Not currently certified. Tracking ISMS scope alongside SOC 2.",
  },
  {
    label: "HIPAA-ready architecture",
    state: "Subject to BAA",
    tone: "ready",
    detail:
      "Audit logging, RBAC, and encryption primitives in place; a Business Associate Agreement is required for covered entities.",
  },
  {
    label: "PIPL (China)",
    state: "Supported",
    tone: "ready",
    detail:
      "China-compatible providers (Bailian, Volcengine, SiliconFlow) supported for in-China data residency.",
  },
];

const TONE_CLASS: Record<ComplianceTone, string> = {
  ready: "bg-primary/10 text-primary",
  planned: "bg-muted text-muted-foreground",
};

export default async function SecurityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <Suspense>
      <main
        id="main-content"
        className="flex flex-col min-h-screen bg-background relative overflow-hidden"
      >
        <Navbar />
        <AuroraBackground variant="subtle" position="top" intensity={0.4} />
        <section className="container mx-auto max-w-[1100px] px-4 py-32 relative">
          {/* Hero */}
          <AnimateIn preset="emerge" className="mb-20 max-w-3xl">
            <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
              Security
            </p>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-semibold mb-6 text-balance"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              Security as code, not as claims.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              The Sailor skeleton ships with audit logging, tenant isolation, encryption, and
              permission primitives as installable packages — not slideware.
            </p>
          </AnimateIn>

          {/* Capabilities */}
          <div className="mb-24">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-2"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              Built-in capabilities
            </h2>
            <p className="text-muted-foreground mb-10 max-w-2xl">
              Each item below is a package in this repository. Audit our source on GitHub.
            </p>
            <AnimateInGroup stagger="fast" className="grid gap-4 md:grid-cols-2">
              {CAPABILITIES.map((cap) => (
                <AnimateIn key={cap.title} preset="fadeUp">
                  <article
                    className="rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-card/30 p-7 h-full hover:border-primary/40 transition-colors"
                    style={{ boxShadow: "var(--ring-hairline)" }}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                        <cap.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-foreground">{cap.title}</h3>
                          {cap.wip && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Integration WIP
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground/80 font-mono">
                          {cap.pkg}
                        </code>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cap.summary}</p>
                  </article>
                </AnimateIn>
              ))}
            </AnimateInGroup>
          </div>

          {/* Compliance */}
          <div className="mb-24">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-2"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              Compliance posture
            </h2>
            <p className="text-muted-foreground mb-10 max-w-2xl">
              We list current state plainly — what is in place today versus what is on the roadmap.
              No badges we have not earned.
            </p>
            <div
              className="rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-card/20 divide-y divide-border overflow-hidden"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              {COMPLIANCE.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr] items-start gap-3 md:gap-6 p-6"
                >
                  <div className="font-bold text-foreground">{row.label}</div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${TONE_CLASS[row.tone]} shrink-0 self-start`}
                  >
                    {row.state}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{row.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <AnimateIn preset="fadeUp">
            <div
              className="rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-muted/30 p-10 text-center"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <FileLock className="h-10 w-10 mx-auto text-primary mb-4" />
              <h3
                className="text-2xl md:text-3xl font-semibold mb-3"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                Need our DPA, a security questionnaire, or a chat?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                We respond to security inquiries within one business day. For DPA requests, attach
                your draft or use ours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Button asChild variant="ink" size="lg">
                  <Link href="/dpa">
                    <FileText className="mr-2 h-4 w-4" /> Read our DPA stance
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-[var(--radius-button)]"
                >
                  <a href="mailto:security@nebutra.com?subject=Security%20Inquiry">
                    <Mail className="mr-2 h-4 w-4" /> security@nebutra.com
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-[var(--radius-button)]"
                >
                  <a href="mailto:legal@nebutra.com?subject=DPA%20Request">
                    Request DPA <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </AnimateIn>
        </section>
        <FooterMinimal />
      </main>
    </Suspense>
  );
}
