import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebutra Auth",
  description: "Nebutra login center — shared authentication for all first-party apps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
