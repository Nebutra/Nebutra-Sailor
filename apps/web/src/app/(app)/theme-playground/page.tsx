import type { Metadata } from "next";
import { ThemePlaygroundWorkbench } from "@/components/theme-playground/theme-playground-workbench";
import { getNonce } from "@/lib/nonce";

export const metadata: Metadata = {
  title: "Theme Playground",
  description: "Live token governance and theme preview workbench.",
};

export default async function ThemePlaygroundPage() {
  // The workbench injects the preview carrier as an inline <style>. The
  // dashboard's CSP is nonce-based (style-src 'self' 'nonce-…'), so a style
  // tag without the request nonce is dropped by the browser — the artboard
  // would silently keep the factory tokens. Server components read the nonce
  // from x-nonce; hand it to the client tree like ThemeShell does.
  const nonce = await getNonce();

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col" aria-label="Theme Playground">
      <ThemePlaygroundWorkbench nonce={nonce} />
    </section>
  );
}
