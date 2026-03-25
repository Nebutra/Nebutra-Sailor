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
    title: t("refund.title"),
    description: t("refund.description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

/** Indices for iterating next-intl indexed objects */
const MONTHLY_ITEMS = [0, 1, 2, 3] as const;
const ANNUAL_ITEMS = [0, 1, 2, 3] as const;
const SERVICE_ISSUE_ITEMS = [0, 1, 2] as const;
const BILLING_ERROR_ITEMS = [0, 1, 2] as const;
const EXCEPTIONAL_ITEMS = [0, 1, 2] as const;
const NON_REFUNDABLE_ITEMS = [0, 1, 2, 3, 4] as const;
const STEP1_ITEMS = [0, 1, 2, 3] as const;
const STEP2_ITEMS = [0, 1, 2] as const;
const STEP3_ITEMS = [0, 1, 2] as const;
const UPGRADE_ITEMS = [0, 1, 2] as const;
const DOWNGRADE_ITEMS = [0, 1, 2] as const;
const FREE_TRIAL_ITEMS = [0, 1, 2] as const;
const DISPUTE_STEPS = [0, 1, 2] as const;

export default async function RefundPolicyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages.refund" });

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>{t("heading")}</h1>

      <p className="lead">
        <strong>{t("effectiveDate")}:</strong> {t("dates.effective")}
        <br />
        <strong>{t("lastUpdated")}:</strong> {t("dates.updated")}
      </p>

      <p>{t("intro")}</p>

      {/* Subscription Plans */}
      <h2>{t("subscriptionPlans.title")}</h2>

      <h3>{t("subscriptionPlans.monthly.title")}</h3>
      <ul>
        {MONTHLY_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`subscriptionPlans.monthly.items.${i}.label`)}:</strong>{" "}
            {t(`subscriptionPlans.monthly.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      <h3>{t("subscriptionPlans.annual.title")}</h3>
      <ul>
        {ANNUAL_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`subscriptionPlans.annual.items.${i}.label`)}:</strong>{" "}
            {t(`subscriptionPlans.annual.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* Eligible Refund Scenarios */}
      <h2>{t("eligibleScenarios.title")}</h2>
      <p>{t("eligibleScenarios.intro")}</p>

      <h3>{t("eligibleScenarios.serviceIssues.title")}</h3>
      <ul>
        {SERVICE_ISSUE_ITEMS.map((i) => (
          <li key={i}>{t(`eligibleScenarios.serviceIssues.items.${i}`)}</li>
        ))}
      </ul>

      <h3>{t("eligibleScenarios.billingErrors.title")}</h3>
      <ul>
        {BILLING_ERROR_ITEMS.map((i) => (
          <li key={i}>{t(`eligibleScenarios.billingErrors.items.${i}`)}</li>
        ))}
      </ul>

      <h3>{t("eligibleScenarios.exceptionalCircumstances.title")}</h3>
      <ul>
        {EXCEPTIONAL_ITEMS.map((i) => (
          <li key={i}>{t(`eligibleScenarios.exceptionalCircumstances.items.${i}`)}</li>
        ))}
      </ul>

      {/* Non-Refundable Items */}
      <h2>{t("nonRefundable.title")}</h2>
      <p>{t("nonRefundable.intro")}</p>
      <ul>
        {NON_REFUNDABLE_ITEMS.map((i) => (
          <li key={i}>
            <strong>{t(`nonRefundable.items.${i}.label`)}:</strong>{" "}
            {t(`nonRefundable.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* How to Request a Refund */}
      <h2>{t("howToRequest.title")}</h2>

      <h3>{t("howToRequest.step1.title")}</h3>
      <p>{t("howToRequest.step1.intro")}</p>
      <ul>
        {STEP1_ITEMS.map((i) => (
          <li key={i}>{t(`howToRequest.step1.items.${i}`)}</li>
        ))}
      </ul>

      <h3>{t("howToRequest.step2.title")}</h3>
      <ul>
        {STEP2_ITEMS.map((i) => (
          <li key={i}>{t(`howToRequest.step2.items.${i}`)}</li>
        ))}
      </ul>

      <h3>{t("howToRequest.step3.title")}</h3>
      <p>{t("howToRequest.step3.intro")}</p>
      <ul>
        {STEP3_ITEMS.map((i) => (
          <li key={i}>{t(`howToRequest.step3.items.${i}`)}</li>
        ))}
      </ul>

      {/* Plan Changes */}
      <h2>{t("planChanges.title")}</h2>

      <h3>{t("planChanges.upgrades.title")}</h3>
      <ul>
        {UPGRADE_ITEMS.map((i) => (
          <li key={i}>{t(`planChanges.upgrades.items.${i}`)}</li>
        ))}
      </ul>

      <h3>{t("planChanges.downgrades.title")}</h3>
      <ul>
        {DOWNGRADE_ITEMS.map((i) => (
          <li key={i}>{t(`planChanges.downgrades.items.${i}`)}</li>
        ))}
      </ul>

      {/* Free Trial */}
      <h2>{t("freeTrial.title")}</h2>
      <ul>
        {FREE_TRIAL_ITEMS.map((i) => (
          <li key={i}>{t(`freeTrial.items.${i}`)}</li>
        ))}
      </ul>

      {/* Dispute Resolution */}
      <h2>{t("disputeResolution.title")}</h2>
      <p>{t("disputeResolution.intro")}</p>
      <ol>
        {DISPUTE_STEPS.map((i) => (
          <li key={i}>{t(`disputeResolution.steps.${i}`)}</li>
        ))}
      </ol>

      {/* Contact Us */}
      <h2>{t("contactUs.title")}</h2>
      <p>{t("contactUs.intro")}</p>
      <p>
        <strong>{t("contactUs.company")}</strong>
        <br />
        {t("contactUs.billingLabel")}: <a href="mailto:billing@nebutra.com">billing@nebutra.com</a>
        <br />
        {t("contactUs.supportLabel")}: <a href="mailto:support@nebutra.com">support@nebutra.com</a>
        <br />
        {t("contactUs.legalLabel")}: <a href="mailto:legal@nebutra.com">legal@nebutra.com</a>
      </p>
      <p>{t("contactUs.responseNote")}</p>

      <hr />

      <p>
        {t("contactUs.termsNote")} <Link href="/terms">{t("contactUs.termsLink")}</Link>.{" "}
        {t("contactUs.termsAgreement")}
      </p>
    </article>
  );
}
