/* tokens loaded once via globals.css → @nebutra/ui/styles/preset.css */
import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export const metadata = {
  title: "Sleptons — AI-native founders",
  description: "Where AI-native one-person companies are born, discovered, and scaled.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${fontClassName}`}>
        <body className="bg-background text-foreground">
          <FontFaces />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
