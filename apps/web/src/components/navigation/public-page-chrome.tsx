import Link from "next/link";
import { BrandLogo, webBrandLabels } from "@/components/brand/brand-assets";
import styles from "./public-page-chrome.module.css";

const MARKETING_ORIGIN = "https://nebutra.com";

const publicLinks = [
  { href: `${MARKETING_ORIGIN}/features`, label: "Product" },
  { href: `${MARKETING_ORIGIN}/pricing`, label: "Pricing" },
  { href: "https://docs.nebutra.com", label: "Docs" },
  { href: "https://github.com/Nebutra/Nebutra-Sailor", label: "GitHub" },
];

export function PublicPageAnnouncement() {
  return (
    <div className={styles.announcement}>
      <span className={styles.status} aria-hidden="true" />
      Nebutra Console recovery surface
      <a href="https://status.nebutra.com">System status</a>
    </div>
  );
}

export function PublicPageHeader() {
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
          Log in
        </Link>
        <Link className={styles.solidButton} href="/sign-up">
          Sign up
        </Link>
      </div>
    </header>
  );
}

export function PublicPageFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.footerBrand} href="/" aria-label={webBrandLabels.homeLink}>
          <BrandLogo />
        </Link>
        <p className={styles.footerNote}>
          Governed AI infrastructure with predictable recovery surfaces.
        </p>
        <p className={styles.statusDot}>Recovery surface online</p>
      </div>
      <div className={styles.footerGrid}>
        <div>
          <h2>Product</h2>
          <a href={`${MARKETING_ORIGIN}/features`}>Features</a>
          <a href={`${MARKETING_ORIGIN}/pricing`}>Pricing</a>
          <a href={`${MARKETING_ORIGIN}/about`}>About</a>
        </div>
        <div>
          <h2>Resources</h2>
          <a href="https://docs.nebutra.com">Docs</a>
          <a href={`${MARKETING_ORIGIN}/roadmap`}>Roadmap</a>
          <a href="mailto:support@nebutra.com">Contact</a>
        </div>
        <div>
          <h2>Governance</h2>
          <a href={`${MARKETING_ORIGIN}/privacy`}>Privacy</a>
          <a href={`${MARKETING_ORIGIN}/terms`}>Terms</a>
          <a href="https://github.com/Nebutra/Nebutra-Sailor">Open source</a>
        </div>
      </div>
    </footer>
  );
}
