import { brand } from "@nebutra/brand/metadata";
import { getBrandEmail, getBrandOrigin, getDocsUrl } from "@nebutra/brand/metadata-helpers";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandLogo, webBrandLabels } from "@/components/brand/brand-assets";
import styles from "./public-page-chrome.module.css";

const MARKETING_ORIGIN = getBrandOrigin("landing");

const publicLinks = [
  { href: `${MARKETING_ORIGIN}/features`, label: "Product" },
  { href: `${MARKETING_ORIGIN}/pricing`, label: "Pricing" },
  { href: getDocsUrl(), label: "Docs" },
  { href: `${brand.social.github}/${brand.name}-Sailor`, label: "GitHub" },
];

export function PublicPageAnnouncement() {
  const tc = useTranslations("copy.navigationPublicPageChrome");
  return (
    <div className={styles.announcement}>
      <span className={styles.status} aria-hidden="true" />
      {`${brand.name} Console recovery surface`}
      <a href={getBrandOrigin("status")}>{tc("systemStatus")}</a>
    </div>
  );
}

export function PublicPageHeader() {
  const tc = useTranslations("copy.navigationPublicPageChrome");
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label={webBrandLabels.homeLink}>
        <BrandLogo />
      </Link>
      <nav className={styles.nav} aria-label={webBrandLabels.primaryNavigation}>
        {publicLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <Link className={styles.ghostButton} href="/sign-in">
          {tc("logIn")}
        </Link>
        <Link className={styles.solidButton} href="/sign-up">
          {tc("signUp")}
        </Link>
      </div>
    </header>
  );
}

export function PublicPageFooter() {
  const tc = useTranslations("copy.navigationPublicPageChrome");
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.footerBrand} href="/" aria-label={webBrandLabels.homeLink}>
          <BrandLogo />
        </Link>
        <p className={styles.footerNote}>{tc("governedAIInfrastructureWith")}</p>
        <p className={styles.statusDot}>{tc("recoverySurfaceOnline")}</p>
      </div>
      <div className={styles.footerGrid}>
        <div>
          <h2>{tc("product")}</h2>
          <a href={`${MARKETING_ORIGIN}/features`}>{tc("features")}</a>
          <a href={`${MARKETING_ORIGIN}/pricing`}>{tc("pricing")}</a>
          <a href={`${MARKETING_ORIGIN}/about`}>{tc("about")}</a>
        </div>
        <div>
          <h2>{tc("resources")}</h2>
          <a href={getDocsUrl()}>{tc("docs")}</a>
          <a href={`${MARKETING_ORIGIN}/roadmap`}>{tc("roadmap")}</a>
          <a href={`mailto:${getBrandEmail("support")}`}>{tc("contact")}</a>
        </div>
        <div>
          <h2>{tc("governance")}</h2>
          <a href={`${MARKETING_ORIGIN}/privacy`}>{tc("privacy")}</a>
          <a href={`${MARKETING_ORIGIN}/terms`}>{tc("terms")}</a>
          {/* MiSans licence: the product states it uses MiSans — on /credits. */}
          <a href={`${MARKETING_ORIGIN}/credits`}>{tc("credits")}</a>
          <a href={`${brand.social.github}/${brand.name}-Sailor`}>{tc("openSource")}</a>
        </div>
      </div>
    </footer>
  );
}
