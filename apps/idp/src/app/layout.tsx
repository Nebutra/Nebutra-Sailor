// @brand-exempt: IdP document title until brand metadata wiring
import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebutra Identity",
  description: "Nebutra OAuth 2.0 / OpenID Connect Identity Provider",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="min-h-screen bg-muted text-foreground antialiased">
        <FontFaces />
        {children}
      </body>
    </html>
  );
}
