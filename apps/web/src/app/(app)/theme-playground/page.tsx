import type { Metadata } from "next";
import { ThemePlaygroundWorkbench } from "@/components/theme-playground/theme-playground-workbench";

export const metadata: Metadata = {
  title: "Theme Playground",
  description: "Live token governance and theme preview workbench.",
};

export default function ThemePlaygroundPage() {
  return (
    <section className="min-h-0" aria-label="Theme Playground">
      <ThemePlaygroundWorkbench />
    </section>
  );
}
