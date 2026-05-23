import { Combobox } from "@nebutra/ui/primitives";

const frameworks = [
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "nuxt", label: "Nuxt" },
];

export function ComboboxLabelDemo() {
  return <Combobox options={frameworks} label="Framework" placeholder="Select framework..." />;
}
