// @brand-exempt: IdP document title until brand metadata wiring
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebutra Identity",
  description: "Nebutra OAuth 2.0 / OpenID Connect Identity Provider",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--neutral-2)] text-[var(--neutral-12)] antialiased">
        {children}
      </body>
    </html>
  );
}
