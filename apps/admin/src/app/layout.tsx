import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { THEME_STORAGE_KEY, ThemeProvider } from "@nebutra/tokens";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/console-shell";
import type { ConsoleTab } from "@/components/console-tabs";
import { verifyAccessAssertion } from "@/lib/access-assertion";
import { cachedInbox, fleetSize } from "@/lib/console-data";
import { environmentLabel } from "@/lib/format";
import { getStaffContext, type StaffContext } from "@/lib/staff";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Admin`,
    template: `%s · ${brand.name} Admin`,
  },
  description: `Internal control plane for the ${brand.name} ecosystem.`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function tabsFor(staff: StaffContext): Promise<ConsoleTab[]> {
  let inboxCount: number | undefined;
  try {
    inboxCount = (await cachedInbox({ userId: staff.userId, role: staff.role })).items.length;
  } catch {
    inboxCount = undefined;
  }
  return [
    { href: "/", label: "Inbox", count: inboxCount },
    { href: "/fleet", label: "Fleet", count: fleetSize },
    { href: "/supply", label: "Supply" },
    { href: "/tenants", label: "Customers", disabled: true },
    { href: "/staff", label: "Staff", disabled: true },
    { href: "/trust", label: "Trust", disabled: true },
  ];
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const staff = await getStaffContext();
  const themeCookie = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const themeClass = themeCookie === "dark" ? "dark" : themeCookie === "light" ? "light" : "";

  let body: ReactNode;
  if (staff) {
    body = (
      <ConsoleShell staff={staff} environment={environmentLabel()} tabs={await tabsFor(staff)}>
        {children}
      </ConsoleShell>
    );
  } else {
    // Authenticated at the edge, maybe, but not provisioned here. Say so plainly
    // and name the identity Access asserted so the owner knows whom to grant.
    const identity = await verifyAccessAssertion((await headers()).get("cf-access-jwt-assertion"));
    body = (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
          <h1 className="font-semibold text-sm leading-5">Not a platform staff member</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-5">
            {identity
              ? `${identity.email} passed Cloudflare Access but holds no PlatformStaff grant.`
              : "No Cloudflare Access identity reached this process."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <html
      lang="en"
      data-brand="vercel"
      className={`${themeClass} ${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`.trim()}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {body}
        </ThemeProvider>
      </body>
    </html>
  );
}
