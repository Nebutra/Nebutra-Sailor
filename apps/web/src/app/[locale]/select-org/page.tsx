import type { SelectOrgSearchParams } from "./journey-state";
import { SelectOrgClient } from "./select-org-client";

interface SelectOrgPageProps {
  searchParams?: SelectOrgSearchParams | Promise<SelectOrgSearchParams>;
}

export default async function SelectOrgPage({ searchParams }: SelectOrgPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return <SelectOrgClient initialJourneyParams={resolvedSearchParams} />;
}
