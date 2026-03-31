import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { type Locale, routing } from "@/i18n/routing";
import { LicenseWizard } from "./LicenseWizard";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export const metadata: Metadata = {
  title: "Get Your License — Nebutra",
  description: "Join the Nebutra community. Get your free license in 2 minutes.",
};

async function RequireAuth({ lang, children }: { lang: string; children: React.ReactNode }) {
  const { userId } = await auth();
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
