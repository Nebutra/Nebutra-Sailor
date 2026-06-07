import type { SelectOrgSearchParams } from "./journey-state";
import { SelectOrgClient } from "./select-org-client";

interface SelectOrgPageProps {
  // Next.js 16 PageProps requires searchParams to be a Promise (not a plain
  // object union). Runtime awaits via `await searchParams` below.
  searchParams?: Promise<SelectOrgSearchParams>;
}

export default async function SelectOrgPage({ searchParams }: SelectOrgPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return <SelectOrgClient initialJourneyParams={resolvedSearchParams} />;
}
