import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { ContactForm } from "./ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "legalPages" });
  return buildPageMetadata({
    title: t("contact.title"),
    description: t("contact.description"),
    path: "/contact",
    locale: lang as Locale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  const contacts = [
    {
      title: t("contact.contacts.general.title"),
      email: "contact@nebutra.com",
      description: t("contact.contacts.general.description"),
    },
    {
      title: t("contact.contacts.founder.title"),
      email: "founders@nebutra.com",
      description: t("contact.contacts.founder.description"),
    },
    {
      title: t("contact.contacts.sales.title"),
      email: "sales@nebutra.com",
      description: t("contact.contacts.sales.description"),
    },
    {
      title: t("contact.contacts.support.title"),
      email: "support@nebutra.com",
      description: t("contact.contacts.support.description"),
    },
    {
      title: t("contact.contacts.legal.title"),
      email: "legal@nebutra.com",
      description: t("contact.contacts.legal.description"),
    },
    {
      title: t("contact.contacts.privacy.title"),
      email: "privacy@nebutra.com",
      description: t("contact.contacts.privacy.description"),
    },
    {
      title: t("contact.contacts.security.title"),
      email: "security@nebutra.com",
      description: t("contact.contacts.security.description"),
    },
  ];

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {t("contact.heading")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("contact.subheading")}</p>
      </section>

      {/* Contact Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact) => (
          <div
            key={contact.email}
            className="rounded-[var(--radius-lg)] border border-border p-6 transition-colors hover:border-[color:var(--blue-8)] dark:hover:border-[color:var(--blue-7)]"
          >
            <h3 className="font-semibold text-foreground">{contact.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{contact.description}</p>
            <a
              href={`mailto:${contact.email}`}
              className="mt-4 inline-block text-[color:var(--blue-11)] hover:text-[color:var(--blue-12)] dark:text-[color:hsl(var(--primary))] dark:hover:text-[color:var(--blue-10)]"
            >
              {contact.email}
            </a>
          </div>
        ))}
      </section>

      {/* Contact Form */}
      <section className="rounded-[var(--radius-2xl)] border border-border p-5 sm:p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">{t("contact.formTitle")}</h2>
        <ContactForm />
      </section>

      {/* Office Info */}
      <section className="rounded-[var(--radius-2xl)] bg-muted p-5 sm:p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">{t("contact.companyInfoTitle")}</h2>
        <div className="space-y-4 text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">{t("contact.companyNameChinese")}</h3>
            <p className="text-sm text-muted-foreground">{t("contact.companyNameEnglish")}</p>
            <p>{t("contact.companyAddress")}</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t("contact.socialMedia")}</h3>
            <div className="flex gap-4 mt-2">
              <a
                href="https://twitter.com/nebutra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[color:var(--blue-11)] dark:hover:text-[color:hsl(var(--primary))]"
              >
                Twitter
              </a>
              <a
                href="https://linkedin.com/company/nebutra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[color:var(--blue-11)] dark:hover:text-[color:hsl(var(--primary))]"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/nebutra"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[color:var(--blue-11)] dark:hover:text-[color:hsl(var(--primary))]"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
