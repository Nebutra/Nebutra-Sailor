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
    title: t("cookies.title"),
    description: t("cookies.description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

/** Indices for iterating next-intl indexed objects */
const USE_ITEMS = [
  { id: "authentication", index: 0 },
  { id: "preferences", index: 1 },
  { id: "analytics", index: 2 },
  { id: "security", index: 3 },
  { id: "marketing", index: 4 },
] as const;
const COOKIE_CATEGORIES = ["necessary", "functional", "analyticsType", "marketingType"] as const;
const CONSENT_ITEMS = [
  { id: "accept-all", index: 0 },
  { id: "reject-all", index: 1 },
  { id: "customize", index: 2 },
] as const;
const BROWSERS = [
  { id: "chrome", index: 0 },
  { id: "firefox", index: 1 },
  { id: "safari", index: 2 },
  { id: "edge", index: 3 },
] as const;
const TECH_ITEMS = [
  { id: "local-storage", index: 0 },
  { id: "pixels", index: 1 },
  { id: "logs", index: 2 },
] as const;
const COOKIE_INDEX_BY_CATEGORY: Record<(typeof COOKIE_CATEGORIES)[number], readonly number[]> = {
  necessary: [0, 1, 2],
  functional: [0, 1],
  analyticsType: [0, 1],
  marketingType: [0, 1],
};

export default async function CookiePolicyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages.cookies" });
  type CookieTranslationKey = Parameters<typeof t>[0];

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>{t("heading")}</h1>

      <p className="lead">
        <strong>{t("effectiveDate")}:</strong> {t("dates.effective")}
        <br />
        <strong>{t("lastUpdated")}:</strong> {t("dates.updated")}
      </p>

      <p>{t("intro")}</p>

      {/* What Are Cookies */}
      <h2>{t("whatAreCookies.title")}</h2>
      <p>{t("whatAreCookies.content")}</p>

      {/* How We Use Cookies */}
      <h2>{t("howWeUse.title")}</h2>
      <p>{t("howWeUse.intro")}</p>
      <ul>
        {USE_ITEMS.map(({ id, index: i }) => (
          <li key={id}>
            <strong>{t(`howWeUse.items.${i}.label`)}:</strong> {t(`howWeUse.items.${i}.desc`)}
          </li>
        ))}
      </ul>

      {/* Types of Cookies */}
      <h2>{t("typesTitle")}</h2>

      {COOKIE_CATEGORIES.map((category) => {
        const indices = COOKIE_INDEX_BY_CATEGORY[category];

        return (
          <div key={category}>
            <h3>{t(`${category}.title` as CookieTranslationKey)}</h3>
            <p>{t(`${category}.description` as CookieTranslationKey)}</p>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>{t("tableHeaders.cookie")}</th>
                    <th>{t("tableHeaders.provider")}</th>
                    <th>{t("tableHeaders.purpose")}</th>
                    <th>{t("tableHeaders.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  {indices.map((cookieIndex) => (
                    <tr key={`${category}-${cookieIndex}`}>
                      <td>
                        <code>
                          {t(`${category}.cookies.${cookieIndex}.name` as CookieTranslationKey)}
                        </code>
                      </td>
                      <td>
                        {t(`${category}.cookies.${cookieIndex}.provider` as CookieTranslationKey)}
                      </td>
                      <td>
                        {t(`${category}.cookies.${cookieIndex}.purpose` as CookieTranslationKey)}
                      </td>
                      <td>
                        {t(`${category}.cookies.${cookieIndex}.duration` as CookieTranslationKey)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Managing Preferences */}
      <h2>{t("managingTitle")}</h2>

      <h3>{t("consentBanner.title")}</h3>
      <p>{t("consentBanner.intro")}</p>
      <ul>
        {CONSENT_ITEMS.map(({ id, index: i }) => (
          <li key={id}>
            <strong>{t(`consentBanner.items.${i}.label`)}:</strong>{" "}
            {t(`consentBanner.items.${i}.desc`)}
          </li>
        ))}
      </ul>
      <p>{t("consentBanner.changeNote")}</p>

      <h3>{t("browserSettings.title")}</h3>
      <p>{t("browserSettings.intro")}</p>
      <ul>
        {BROWSERS.map(({ id, index: i }) => (
          <li key={id}>
            <strong>{t(`browserSettings.browsers.${i}.name`)}:</strong>{" "}
            {t(`browserSettings.browsers.${i}.path`)}
          </li>
        ))}
      </ul>
      <p>
        <em>{t("browserSettings.note")}</em>
      </p>

      {/* Similar Technologies */}
      <h2>{t("similarTech.title")}</h2>
      <p>{t("similarTech.intro")}</p>
      <ul>
        {TECH_ITEMS.map(({ id, index: i }) => (
          <li key={id}>
            <strong>{t(`similarTech.items.${i}.label`)}:</strong> {t(`similarTech.items.${i}.desc`)}
          </li>
        ))}
      </ul>
      <p>
        <strong>{t("similarTech.noFingerprinting")}</strong>
      </p>

      {/* Updates */}
      <h2>{t("updates.title")}</h2>
      <p>{t("updates.content")}</p>

      {/* Contact */}
      <h2>{t("contactUs.title")}</h2>
      <p>{t("contactUs.intro")}</p>
      <p>
        <strong>{t("contactUs.company")}</strong>
        <br />
        Email: <a href="mailto:privacy@nebutra.com">privacy@nebutra.com</a>
        <br />
        Legal: <a href="mailto:legal@nebutra.com">legal@nebutra.com</a>
      </p>

      <hr />

      <p>
        {t("contactUs.privacyNote")} <Link href="/privacy">{t("contactUs.privacyLink")}</Link>
      </p>
    </article>
  );
}
