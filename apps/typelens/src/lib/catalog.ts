export {
  type AgentExtractPack,
  checkLicenses,
  extractSpecimen,
  getSpecimen,
  getSpecimenForWork,
  getTypeface,
  getWork,
  listSpecimens,
  listTypefaces,
  listWorks,
  type Medium,
  SPECIMENS,
  type Specimen,
  searchSpecimens,
  TYPEFACES,
  type Typeface,
  WORKS,
  type Work,
} from "@nebutra/typelens-catalog";

export function mediumLabel(medium: string): string {
  const map: Record<string, string> = {
    poster: "Posters",
    website: "Web",
    "app-ui": "Software / Apps",
    "brand-identity": "Branding / Identity",
    editorial: "Editorial",
    packaging: "Packaging",
    other: "Other",
  };
  return map[medium] ?? medium;
}
