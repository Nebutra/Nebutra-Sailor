import { PageHeader } from "@nebutra/ui/layout";
import { useTranslations } from "next-intl";
import { DiscoverDeck } from "@/components/cofounder-match/discover-deck";

export default function CofounderDiscoverPage() {
  const tc = useTranslations("copy.discoverPage");
  return (
    <section className="mx-auto w-full max-w-xl">
      <PageHeader title={tc("discoverCofounders")} description={tc("oneCompanyAtA")} />
      <DiscoverDeck />
    </section>
  );
}
