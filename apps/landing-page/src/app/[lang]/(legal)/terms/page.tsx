import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "legalPages" });
  return {
    title: t("terms.title"),
    description: t("terms.description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

/** Indices for iterating next-intl indexed objects */
const ELIGIBILITY_ITEMS = [0, 1, 2] as const;
const SERVICES_ITEMS = [0, 1, 2, 3, 4, 5] as const;
const ACCOUNT_ITEMS = [0, 1, 2, 3] as const;
const PROHIBITED_ITEMS = [0, 1, 2, 3, 4, 5, 6] as const;
const TERMINATION_ITEMS = [0, 1, 2, 3] as const;

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages.terms" });

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>{t("heading")}</h1>

      <p className="lead">
        <strong>{t("effectiveDate")}:</strong> {t("dates.effective")}
        <br />
        <strong>{t("lastUpdated")}:</strong> {t("dates.updated")}
      </p>

      <p>{t("intro1")}</p>

      <p>
        {t("intro2")} <Link href="/privacy">{t("intro2PrivacyLink")}</Link>
        {t("intro2End")}
      </p>

      {/* 1. Acceptance of Terms */}
      <h2>{t("acceptance.title")}</h2>

      <h3>{t("acceptance.eligibility.title")}</h3>
      <p>{t("acceptance.eligibility.intro")}</p>
      <ul>
        {ELIGIBILITY_ITEMS.map((i) => (
          <li key={i}>{t(`acceptance.eligibility.items.${i}`)}</li>
        ))}
      </ul>

      <h3>{t("acceptance.orgAccounts.title")}</h3>
      <p>{t("acceptance.orgAccounts.content")}</p>

      {/* 2. Description of Services */}
      <h2>{t("services.title")}</h2>
      <p>{t("services.intro")}</p>
      <ul>
        {SERVICES_ITEMS.map((i) => (
          <li key={i}>{t(`services.items.${i}`)}</li>
        ))}
      </ul>

      {/* 3. Account Registration */}
      <h2>{t("account.title")}</h2>

      <h3>{t("account.creation.title")}</h3>
      <p>{t("account.creation.intro")}</p>
      <ul>
        {ACCOUNT_ITEMS.map((i) => (
          <li key={i}>{t(`account.creation.items.${i}`)}</li>
        ))}
      </ul>

      {/* 4. Subscription and Billing */}
      <h2>{t("billing.title")}</h2>

      <h3>{t("billing.pricing.title")}</h3>
      <p>{t("billing.pricing.content")}</p>

      <h3>{t("billing.payment.title")}</h3>
      <ul>
        <li>{t("billing.payment.items.0")}</li>
        <li>
          {t("billing.payment.items.1")}{" "}
          <Link href="/refund">{t("billing.payment.items.1RefundLink")}</Link>
        </li>
        <li>{t("billing.payment.items.2")}</li>
        <li>{t("billing.payment.items.3")}</li>
      </ul>

      {/* 5. Acceptable Use */}
      <h2>{t("acceptableUse.title")}</h2>

      <h3>{t("acceptableUse.prohibited.title")}</h3>
      <p>{t("acceptableUse.prohibited.intro")}</p>
      <ul>
        {PROHIBITED_ITEMS.map((i) => (
          <li key={i}>{t(`acceptableUse.prohibited.items.${i}`)}</li>
        ))}
      </ul>

      {/* 6. Intellectual Property */}
      <h2>{t("ip.title")}</h2>

      <h3>{t("ip.ours.title")}</h3>
      <p>{t("ip.ours.content")}</p>

      <h3>{t("ip.yours.title")}</h3>
      <p>{t("ip.yours.content")}</p>

      {/* 7. Disclaimer of Warranties */}
      <h2>{t("warranties.title")}</h2>
      <p>
        <strong>{t("warranties.content")}</strong>
      </p>

      {/* 8. Limitation of Liability */}
      <h2>{t("liability.title")}</h2>
      <p>
        <strong>{t("liability.para1")}</strong>
      </p>
      <p>
        <strong>{t("liability.para2")}</strong>
      </p>

      {/* 9. Termination */}
      <h2>{t("termination.title")}</h2>

      <h3>{t("termination.byYou.title")}</h3>
      <p>{t("termination.byYou.content")}</p>

      <h3>{t("termination.byUs.title")}</h3>
      <p>{t("termination.byUs.intro")}</p>
      <ul>
        {TERMINATION_ITEMS.map((i) => (
          <li key={i}>{t(`termination.byUs.items.${i}`)}</li>
        ))}
      </ul>

      {/* 10. Dispute Resolution */}
      <h2>{t("disputes.title")}</h2>

      <h3>{t("disputes.informal.title")}</h3>
      <p>{t("disputes.informal.content")}</p>

      <h3>{t("disputes.governingLaw.title")}</h3>
      <p>{t("disputes.governingLaw.content")}</p>

      {/* 11. Contact Us */}
      <h2>{t("contactUs.title")}</h2>
      <p>{t("contactUs.intro")}</p>
      <p>
        <strong>{t("contactUs.company")}</strong>
        <br />
        {t("contactUs.emailLabel")}: <a href="mailto:legal@nebutra.com">legal@nebutra.com</a>
        <br />
        {t("contactUs.supportLabel")}: <a href="mailto:support@nebutra.com">support@nebutra.com</a>
      </p>

      <hr />

      <p>{t("acknowledgement")}</p>
    </article>
  );
}
