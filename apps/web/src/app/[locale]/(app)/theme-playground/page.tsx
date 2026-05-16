import type { Metadata } from "next";
import { ThemePlaygroundWorkbench } from "@/components/theme-playground/theme-playground-workbench";

export const metadata: Metadata = {
  title: "Theme Playground | Nebutra Sailor",
  description: "Live token governance and theme preview workbench for Nebutra Sailor.",
};

export default function ThemePlaygroundPage() {
  return (
    <section className="-m-4 sm:-m-6 lg:-m-8" aria-label="Theme Playground">
      <ThemePlaygroundWorkbench />
    </section>
  );
}
