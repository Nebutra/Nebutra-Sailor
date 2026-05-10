import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import "./global.css";

export const metadata = {
  title: "{PRODUCT_NAME} Docs",
  description: "Documentation for {PRODUCT_NAME}",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
