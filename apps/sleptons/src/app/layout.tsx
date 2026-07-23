import "@nebutra/tokens/styles.css";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";

export const metadata = {
  title: "Sleptons — AI-native founders",
  description: "Where AI-native one-person companies are born, discovered, and scaled.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="bg-background text-foreground">{children}</body>
      </html>
    </ClerkProvider>
  );
}
