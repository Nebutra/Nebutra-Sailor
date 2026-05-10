import { PreviewShell } from "@/components/preview-shell";
import { TEMPLATES } from "@/lib/registry";

export default function HomePage() {
  return <PreviewShell templates={TEMPLATES} />;
}
