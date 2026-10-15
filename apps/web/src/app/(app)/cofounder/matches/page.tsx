import { PageHeader } from "@nebutra/ui/layout";
import { useTranslations } from "next-intl";
import { MatchesList } from "@/components/cofounder-match/matches-list";

export default function CofounderMatchesPage() {
  const tc = useTranslations("copy.matchesPage");
  return (
    <section className="mx-auto w-full max-w-3xl">
      <PageHeader title={tc("yourMatches")} description={tc("foundersYouAndThey")} />
      <MatchesList />
    </section>
  );
}
