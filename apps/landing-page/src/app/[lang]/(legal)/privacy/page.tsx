import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    title: t("privacy.title"),
    description: t("privacy.description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

/** Indices for iterating next-intl indexed objects */
const YOU_PROVIDE_ITEMS = [0, 1, 2, 3, 4] as const;
const AUTO_ITEMS = [0, 1, 2, 3] as const;
const HOW_WE_USE_ITEMS = [0, 1, 2, 3, 4, 5] as const;
const SERVICE_PROVIDER_ITEMS = [0, 1, 2, 3] as const;
const DATA_SECURITY_ITEMS = [0, 1, 2, 3] as const;
const CCPA_ITEMS = [0, 1, 2, 3] as const;
const GDPR_ITEMS = [0, 1, 2] as const;

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages.privacy" });

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>{t("heading")}</h1>

      <p className="lead">
        <strong>{t("effectiveDate")}:</strong> {t("dates.effective")}
        <br />
        <strong>{t("lastUpdated")}:</strong> {t("dates.updated")}
      </p>

      <p>{t("intro")}</p>

      {/* Section 1: Information We Collect */}
      <h2>{t("infoWeCollect.title")}</h2>

      <h3>{t("infoWeCollect.youProvide.title")}</h3>
      <p>{t("infoWeCollect.youProvide.intro")}</p>
      <ul>
        {YOU_PROVIDE_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`infoWeCollect.youProvide.items.${i}.label`)}:</strong>{" "}
            {t(`infoWeCollect.youProvide.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      <h3>{t("infoWeCollect.automatic.title")}</h3>
      <p>{t("infoWeCollect.automatic.intro")}</p>
      <ul>
        {AUTO_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`infoWeCollect.automatic.items.${i}.label`)}:</strong>{" "}
            {t(`infoWeCollect.automatic.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* Section 2: How We Use Your Information */}
      <h2>{t("howWeUse.title")}</h2>
      <p>{t("howWeUse.intro")}</p>
      <ul>
        {HOW_WE_USE_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`howWeUse.items.${i}.label`)}:</strong> {t(`howWeUse.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* Section 3: How We Share Your Information */}
      <h2>{t("howWeShare.title")}</h2>
      <p>{t("howWeShare.intro")}</p>

      <h3>{t("howWeShare.serviceProviders.title")}</h3>
      <p>{t("howWeShare.serviceProviders.intro")}</p>
      <ul>
        {SERVICE_PROVIDER_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`howWeShare.serviceProviders.items.${i}.label`)}:</strong>{" "}
            {t(`howWeShare.serviceProviders.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      <h3>{t("howWeShare.businessTransfers.title")}</h3>
      <p>{t("howWeShare.businessTransfers.content")}</p>

      <h3>{t("howWeShare.legalRequirements.title")}</h3>
      <p>{t("howWeShare.legalRequirements.content")}</p>

      {/* Section 4: Your Rights and Choices */}
      <h2>{t("yourRights.title")}</h2>

      <h3>{t("yourRights.accessPortability.title")}</h3>
      <p>{t("yourRights.accessPortability.content")}</p>

      <h3>{t("yourRights.correction.title")}</h3>
      <p>{t("yourRights.correction.content")}</p>

      <h3>{t("yourRights.deletion.title")}</h3>
      <p>{t("yourRights.deletion.content")}</p>

      <h3>{t("yourRights.marketing.title")}</h3>
      <p>{t("yourRights.marketing.content")}</p>

      {/* Section 5: Data Security */}
      <h2>{t("dataSecurity.title")}</h2>
      <p>{t("dataSecurity.intro")}</p>
      <ul>
        {DATA_SECURITY_ITEMS.map((i) => (
          <li key={i}>{t(`dataSecurity.items.${i}`)}</li>
        ))}
      </ul>

      {/* Section 6: California Privacy Rights (CCPA) */}
      <h2>{t("ccpa.title")}</h2>
      <p>{t("ccpa.intro")}</p>
      <ul>
        {CCPA_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`ccpa.items.${i}.label`)}:</strong> {t(`ccpa.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* Section 7: European Privacy Rights (GDPR) */}
      <h2>{t("gdpr.title")}</h2>
      <p>{t("gdpr.intro")}</p>
      <ul>
        {GDPR_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`gdpr.items.${i}.label`)}:</strong> {t(`gdpr.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* Section 8: Contact Us */}
      <h2>{t("contactUs.title")}</h2>
      <p>{t("contactUs.intro")}</p>
      <p>
        <strong>{t("contactUs.company")}</strong>
        <br />
        Email: <a href="mailto:privacy@nebutra.com">privacy@nebutra.com</a>
        <br />
        Legal: <a href="mailto:legal@nebutra.com">legal@nebutra.com</a>
        <br />
        DPO: <a href="mailto:dpo@nebutra.com">dpo@nebutra.com</a>
      </p>
    </article>
  );
}
