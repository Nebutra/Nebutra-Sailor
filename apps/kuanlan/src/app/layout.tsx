import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: `${BRAND.name} ${BRAND.nameCn}`,
  description: BRAND.slogan,
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="shell">{children}</body>
    </html>
  );
}
