import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";
import { getAuth } from "@/lib/auth";
import { LicenseWizard } from "./LicenseWizard";

// Under Next 16's `cacheComponents: true`, route segment `dynamic = "force-dynamic"`
// is rejected at build time. Dynamic rendering is triggered automatically because
// `getAuth()` reads cookies via `headers()`; no explicit opt-out is needed.

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
  const t = await getTranslations({ locale: lang as Locale, namespace: "getLicenseMeta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

async function RequireAuth({ lang, children }: { lang: string; children: React.ReactNode }) {
  const { userId } = await getAuth();
  if (!userId) {
    redirect(`/${lang}/sign-in?redirect_url=/${lang}/get-license`);
  }
  return <>{children}</>;
}

export default async function GetLicensePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return null;
  setRequestLocale(lang as Locale);

  return (
    <main className="min-h-screen bg-[var(--neutral-1)]">
      <Navbar />
      <Suspense fallback={null}>
        <RequireAuth lang={lang}>
          <LicenseWizard />
        </RequireAuth>
      </Suspense>
      <FooterMinimal />
    </main>
  );
}
