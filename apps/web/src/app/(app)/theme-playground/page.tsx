import type { Metadata } from "next";
import { ThemePlaygroundWorkbench } from "@/components/theme-playground/theme-playground-workbench";

export const metadata: Metadata = {
  title: "Theme Playground",
  description: "Live token governance and theme preview workbench.",
};

export default function ThemePlaygroundPage() {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col" aria-label="Theme Playground">
      <ThemePlaygroundWorkbench />
    </section>
  );
}
