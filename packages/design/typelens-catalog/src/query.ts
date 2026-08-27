import { extractSpecimen } from "./extract";
import type {
  LicenseCheckResult,
  Medium,
  ScriptTag,
  Specimen,
  Typeface,
  TypeRole,
  Work,
  WorkStatus,
} from "./schema";
import { SPECIMEN_BY_ID, SPECIMENS } from "./specimens";
import { TYPEFACE_BY_ID, TYPEFACES } from "./typefaces";
import { WORK_BY_ID, WORK_BY_SLUG, WORKS } from "./works";
export interface ListTypefacesOptions {
  script?: ScriptTag;
  category?: Typeface["category"];
  commercialOnly?: boolean;
}
export function listTypefaces(opts: ListTypefacesOptions = {}): Typeface[] {
  const commercialOnly = opts.commercialOnly ?? true;
  return TYPEFACES.filter((t) => {
    if (commercialOnly && !t.license.commercialOk) return false;
    if (opts.script && !t.scripts.includes(opts.script)) return false;
    if (opts.category && t.category !== opts.category) return false;
    return true;
  });
}
export function getTypeface(id: string): Typeface | undefined {
  return TYPEFACE_BY_ID.get(id);
}
export interface ListWorksOptions {
  medium?: Medium;
  script?: ScriptTag;
  status?: WorkStatus;
  mood?: string;
}
export function listWorks(opts: ListWorksOptions = {}): Work[] {
  const status = opts.status ?? "published";
  return WORKS.filter((w) => {
    if (w.status !== status) return false;
    if (opts.medium && w.medium !== opts.medium) return false;
    if (opts.script && !w.scripts.includes(opts.script)) return false;
    if (opts.mood && !w.mood.includes(opts.mood)) return false;
    return true;
  });
}
export function getWork(idOrSlug: string): Work | undefined {
  return WORK_BY_ID.get(idOrSlug) ?? WORK_BY_SLUG.get(idOrSlug);
}
export interface SearchSpecimensOptions {
  medium?: Medium;
  script?: ScriptTag;
  role?: TypeRole;
  tag?: string;
  mood?: string;
  query?: string;
  publishedOnly?: boolean;
}
export function listSpecimens(): Specimen[] {
  return [...SPECIMENS];
}
export function getSpecimen(id: string): Specimen | undefined {
  return SPECIMEN_BY_ID.get(id);
}
export function searchSpecimens(opts: SearchSpecimensOptions = {}): Specimen[] {
  const publishedOnly = opts.publishedOnly ?? true;
  const q = opts.query?.trim().toLowerCase();
  return SPECIMENS.filter((s) => {
    const work = WORK_BY_ID.get(s.workId);
    if (!work) return false;
    if (publishedOnly && work.status !== "published") return false;
    if (opts.medium && work.medium !== opts.medium) return false;
    if (opts.script && !work.scripts.includes(opts.script)) return false;
    if (opts.mood && !work.mood.includes(opts.mood)) return false;
    if (opts.tag && !s.tags.includes(opts.tag)) return false;
    if (opts.role && !s.typefaces.some((t) => t.role === opts.role)) return false;
    if (q) {
      const hay = [
        s.summary,
        s.summaryZh ?? "",
        s.pairing.strategy,
        ...s.tags,
        work.title,
        work.titleZh ?? "",
        work.slug,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
export function getSpecimenForWork(workId: string): Specimen | undefined {
  return SPECIMENS.find((s) => s.workId === workId);
}
export function checkLicenses(typefaceIds: string[]): LicenseCheckResult[] {
  return typefaceIds.map((typefaceId) => {
    const tf = TYPEFACE_BY_ID.get(typefaceId);
    if (!tf) return { typefaceId, found: false, commercialOk: false };
    return {
      typefaceId,
      found: true,
      commercialOk: tf.license.commercialOk,
      spdxOrLabel: tf.license.spdxOrLabel,
      licenseUrl: tf.license.licenseUrl,
      attributionRequired: tf.license.attributionRequired,
      family: tf.family,
    };
  });
}
export { extractSpecimen, SPECIMENS, TYPEFACES, WORKS };
