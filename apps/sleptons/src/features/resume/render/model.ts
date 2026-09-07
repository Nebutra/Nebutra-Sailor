import type { ResumeContentV1 } from "@nebutra/contracts/sleptons";

/**
 * One serializer for every output. CVise re-walked the profile by hand in the
 * React renderer, markdown, html and docx exporters, so a schema change cost
 * four edits (spec §8). Here the React document and every exporter consume
 * the same `DocumentModel`.
 */

export interface DocEntry {
  title: string;
  subtitle?: string;
  meta?: string;
  bullets: string[];
  tags?: string[];
  link?: string;
}

export interface DocSection {
  id: DocSectionId;
  title: string;
  /** Free text for summary-type sections. */
  text?: string;
  entries: DocEntry[];
  /** Label → values, for the skills matrix. */
  groups?: { label: string; values: string[] }[];
}

export interface DocumentModel {
  name: string;
  nameEn?: string;
  headline?: string;
  contact: string[];
  links: { label: string; href: string }[];
  advantageTags: string[];
  sections: DocSection[];
}

export type DocSectionId =
  | "summary"
  | "ventures"
  | "experiences"
  | "projects"
  | "skills"
  | "education"
  | "achievements"
  | "certificates"
  | "funding"
  | "press"
  | "publications"
  | "patents"
  | "opensource"
  | "volunteering"
  | "interests";

export const DEFAULT_SECTION_ORDER: readonly DocSectionId[] = [
  "summary",
  "ventures",
  "experiences",
  "projects",
  "skills",
  "education",
  "achievements",
  "certificates",
  "funding",
  "press",
  "publications",
  "patents",
  "opensource",
  "volunteering",
  "interests",
];

export const SECTION_TITLES: Record<DocSectionId, string> = {
  summary: "Summary",
  ventures: "Ventures",
  experiences: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  achievements: "Achievements",
  certificates: "Certificates",
  funding: "Funding",
  press: "Press",
  publications: "Publications",
  patents: "Patents",
  opensource: "Open source",
  volunteering: "Volunteering",
  interests: "Interests",
};

const SKILL_LABELS: Record<string, string> = {
  programming: "Programming",
  ai_engineering: "AI engineering",
  ai_theory: "AI theory",
  data: "Data",
  product: "Product",
  finance: "Finance",
  tools: "Tools",
  ai_tools: "AI tools",
  languages: "Languages",
};

const HTML_TAG = /<[^>]*>/g;

export function plainText(input: string | undefined): string {
  return (input ?? "").replace(HTML_TAG, " ").replace(/\s+/g, " ").trim();
}

const joinMeta = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" · ") || undefined;

export interface ModelOptions {
  /** Strip email/phone (public page, PDF for strangers). */
  hideContact?: boolean;
}

export function toDocumentModel(c: ResumeContentV1, opts: ModelOptions = {}): DocumentModel {
  const maxBullets = c.preferences.max_bullets_per_entry;
  const cap = (xs: string[] | undefined) => (xs ?? []).slice(0, maxBullets);

  const contact: string[] = [];
  if (!opts.hideContact) {
    if (c.basic.email) contact.push(c.basic.email);
    if (c.basic.phone) contact.push(c.basic.phone);
  }
  if (c.basic.location) contact.push(c.basic.location);

  const links: DocumentModel["links"] = [];
  if (c.basic.website) links.push({ label: "Website", href: c.basic.website });
  const l = c.basic.links ?? {};
  if (l.github)
    links.push({
      label: "GitHub",
      href: l.github.startsWith("http") ? l.github : `https://github.com/${l.github}`,
    });
  if (l.linkedin)
    links.push({
      label: "LinkedIn",
      href: l.linkedin.startsWith("http") ? l.linkedin : `https://linkedin.com/in/${l.linkedin}`,
    });
  if (l.twitter)
    links.push({
      label: "X",
      href: l.twitter.startsWith("http") ? l.twitter : `https://x.com/${l.twitter}`,
    });
  if (l.personal) links.push({ label: "Site", href: l.personal });

  const summary = plainText(c.objective.summary);

  const builders: Record<DocSectionId, () => DocSection | null> = {
    summary: () =>
      summary ? { id: "summary", title: SECTION_TITLES.summary, text: summary, entries: [] } : null,
    ventures: () =>
      section("ventures", c.ventures, (v) => ({
        title: v.name,
        subtitle: v.role,
        meta: joinMeta(v.period, v.stage),
        bullets: cap([v.outcome, ...(v.details ?? [])].filter((x): x is string => Boolean(x))),
        link: v.url,
      })),
    experiences: () =>
      section("experiences", c.experiences, (e) => ({
        title: e.title,
        subtitle: e.org,
        meta: joinMeta(e.period, e.kind === "work" ? undefined : e.kind),
        bullets: cap(e.details ?? (e.rich ? [plainText(e.rich)] : [])),
        tags: e.tags,
      })),
    projects: () =>
      section("projects", c.projects, (p) => ({
        title: p.name,
        subtitle: p.role,
        meta: p.period,
        bullets: cap(p.details),
        tags: p.stack,
        link: p.links?.[0],
      })),
    skills: () => {
      const groups = Object.entries(c.skills ?? {})
        .filter(([, v]) => Array.isArray(v) && v.length > 0)
        .map(([k, v]) => ({ label: SKILL_LABELS[k] ?? k, values: v as string[] }));
      return groups.length
        ? { id: "skills", title: SECTION_TITLES.skills, entries: [], groups }
        : null;
    },
    education: () =>
      section("education", c.education, (e) => ({
        title: e.school_en ? `${e.school} (${e.school_en})` : e.school,
        subtitle: joinMeta(e.degree, e.major),
        meta: joinMeta(e.period, e.gpa ? `GPA ${e.gpa}` : undefined),
        bullets: e.courses?.length ? [`Courses: ${e.courses.join(", ")}`] : [],
      })),
    achievements: () =>
      section("achievements", c.achievements, (a) => ({
        title: a.title,
        meta: joinMeta(a.level, a.year),
        bullets: [],
      })),
    certificates: () =>
      section("certificates", c.certificates, (x) => ({
        title: x.name,
        subtitle: x.issuer,
        meta: x.year,
        bullets: [],
      })),
    funding: () =>
      section("funding", c.funding, (f) => ({
        title: f.round,
        subtitle: f.amount,
        meta: f.date,
        bullets: f.investors?.length ? [`Investors: ${f.investors.join(", ")}`] : [],
      })),
    press: () =>
      section("press", c.press, (p) => ({
        title: p.title,
        subtitle: p.outlet,
        meta: p.date,
        bullets: [],
        link: p.url,
      })),
    publications: () =>
      section("publications", c.publications, (p) => ({
        title: p.title,
        subtitle: p.venue,
        meta: p.year,
        bullets: [],
        link: p.url,
      })),
    patents: () =>
      section("patents", c.patents, (p) => ({
        title: p.title,
        subtitle: p.id,
        meta: joinMeta(p.year, p.status),
        bullets: [],
      })),
    opensource: () =>
      section("opensource", c.opensource, (o) => ({
        title: o.repo,
        subtitle: o.role,
        meta: o.stars !== undefined ? `★ ${o.stars}` : undefined,
        bullets: cap(o.highlights),
      })),
    volunteering: () =>
      section("volunteering", c.volunteering, (v) => ({
        title: v.org,
        subtitle: v.role,
        meta: v.period,
        bullets: cap(v.details),
      })),
    interests: () =>
      c.interests?.length
        ? {
            id: "interests",
            title: SECTION_TITLES.interests,
            text: c.interests.join(" · "),
            entries: [],
          }
        : null,
  };

  const order = resolveOrder(c.preferences.section_order);
  const sections = order.map((id) => builders[id]()).filter((s): s is DocSection => s !== null);

  return {
    name: c.basic.name,
    nameEn: c.basic.name_en,
    headline: summary
      ? (summary.split(/(?<=[.。!?！？])\s*/)[0] ?? summary).slice(0, 120)
      : undefined,
    contact,
    links,
    advantageTags: c.objective.advantage_tags ?? [],
    sections,
  };
}

function section<T>(
  id: DocSectionId,
  items: T[] | undefined,
  map: (item: T) => DocEntry,
): DocSection | null {
  if (!items?.length) return null;
  return { id, title: SECTION_TITLES[id], entries: items.map(map) };
}

/** Preference order first (unknown ids ignored), then any section not mentioned, in default order. */
export function resolveOrder(preferred: string[] | undefined): DocSectionId[] {
  const known = new Set<string>(DEFAULT_SECTION_ORDER);
  const head = (preferred ?? []).filter((id): id is DocSectionId => known.has(id));
  const seen = new Set(head);
  return [...head, ...DEFAULT_SECTION_ORDER.filter((id) => !seen.has(id))];
}
