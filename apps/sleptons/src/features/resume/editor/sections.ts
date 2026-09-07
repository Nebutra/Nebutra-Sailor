import {
  RESUME_SKILL_CATEGORIES,
  type ResumeContentV1,
  type ResumeSkillCategory,
} from "@nebutra/contracts/sleptons";
import { TECH_STACK_OPTIONS } from "@/lib/constants";

/**
 * Data-driven section registry for the résumé editor (spec §8: the 14 CVise
 * step files were hard-coded three times; this is the single source). Every
 * section here maps 1:1 to a key of `ResumeContentV1`; the guard test asserts
 * that no schema key is left without a section and no field points at a key
 * the schema does not know.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "tags"
  | "bullets"
  | "select"
  | "number";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  options?: readonly { value: string; label: string }[];
  /** Suggestions for `tags` fields (free text still allowed). */
  suggestions?: readonly string[];
  maxItems?: number;
  required?: boolean;
  /** Span both columns of the two-column grid. */
  wide?: boolean;
}

export type ObjectSectionKey = "basic" | "objective";
export type ListSectionKey = Exclude<
  keyof ResumeContentV1,
  ObjectSectionKey | "version" | "preferences" | "skills" | "interests"
>;

export type SectionDef =
  | { kind: "object"; id: ObjectSectionKey; title: string; description: string; fields: FieldDef[] }
  | {
      kind: "list";
      id: ListSectionKey;
      title: string;
      description: string;
      fields: FieldDef[];
      /** Field whose value names an item in the list header. */
      itemTitleKey: string;
      addLabel: string;
    }
  | {
      kind: "skills";
      id: "skills";
      title: string;
      description: string;
      categories: readonly { key: ResumeSkillCategory; label: string }[];
    }
  | { kind: "tags"; id: "interests"; title: string; description: string; field: FieldDef };

const period: FieldDef = {
  key: "period",
  label: "Period",
  type: "text",
  placeholder: "2024.06 – now",
};
const details: FieldDef = {
  key: "details",
  label: "Highlights",
  type: "bullets",
  description: "One outcome per line. Numbers rank higher on your card.",
  maxItems: 12,
  wide: true,
};

export const RESUME_SECTIONS: readonly SectionDef[] = [
  {
    kind: "object",
    id: "basic",
    title: "Basics",
    description: "Who you are and how to reach you.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "name_en", label: "Name (Latin)", type: "text", placeholder: "Optional romanisation" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "location", label: "Location", type: "text", placeholder: "Shanghai" },
      { key: "website", label: "Website", type: "url", placeholder: "https://" },
    ],
  },
  {
    kind: "object",
    id: "objective",
    title: "Summary",
    description: "One paragraph. The first sentence becomes your headline.",
    fields: [
      { key: "summary", label: "Summary", type: "textarea", wide: true },
      {
        key: "advantage_tags",
        label: "Advantage tags",
        type: "tags",
        maxItems: 8,
        description: "Up to 8. What makes you the obvious pick.",
        wide: true,
      },
    ],
  },
  {
    kind: "list",
    id: "ventures",
    title: "Ventures",
    description: "Companies and products you founded or co-founded.",
    itemTitleKey: "name",
    addLabel: "Add venture",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "text", placeholder: "Founder" },
      period,
      {
        key: "stage",
        label: "Stage",
        type: "select",
        options: [
          { value: "idea", label: "Idea" },
          { value: "building", label: "Building" },
          { value: "launched", label: "Launched" },
          { value: "scaling", label: "Scaling" },
          { value: "exited", label: "Exited" },
          { value: "closed", label: "Closed" },
        ],
      },
      { key: "url", label: "URL", type: "url", placeholder: "https://" },
      {
        key: "outcome",
        label: "Outcome",
        type: "text",
        placeholder: "1,200 paying customers in 9 months",
        wide: true,
      },
      details,
    ],
  },
  {
    kind: "list",
    id: "experiences",
    title: "Experience",
    description: "Work, campus and founder roles.",
    itemTitleKey: "org",
    addLabel: "Add experience",
    fields: [
      { key: "org", label: "Organisation", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { ...period, required: true },
      {
        key: "kind",
        label: "Kind",
        type: "select",
        options: [
          { value: "work", label: "Work" },
          { value: "founder", label: "Founder" },
          { value: "campus", label: "Campus" },
        ],
      },
      details,
      { key: "tags", label: "Tags", type: "tags", maxItems: 20, wide: true },
    ],
  },
  {
    kind: "list",
    id: "education",
    title: "Education",
    description: "Optional for founders.",
    itemTitleKey: "school",
    addLabel: "Add school",
    fields: [
      { key: "school", label: "School", type: "text", required: true },
      { key: "school_en", label: "School (Latin)", type: "text" },
      { key: "major", label: "Major", type: "text" },
      { key: "degree", label: "Degree", type: "text", placeholder: "BSc" },
      period,
      { key: "gpa", label: "GPA", type: "text" },
      { key: "courses", label: "Key courses", type: "tags", maxItems: 30, wide: true },
    ],
  },
  {
    kind: "list",
    id: "projects",
    title: "Projects",
    description: "Side projects and open-source work with a story.",
    itemTitleKey: "name",
    addLabel: "Add project",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      period,
      { key: "stack", label: "Stack", type: "tags", maxItems: 20, suggestions: TECH_STACK_OPTIONS },
      details,
      {
        key: "links",
        label: "Links",
        type: "bullets",
        maxItems: 6,
        placeholder: "https://",
        wide: true,
      },
    ],
  },
  {
    kind: "skills",
    id: "skills",
    title: "Skills",
    description:
      "Values from the canonical list count toward matching; others stay on your résumé only.",
    categories: [
      { key: "programming", label: "Programming" },
      { key: "ai_engineering", label: "AI engineering" },
      { key: "ai_theory", label: "AI theory" },
      { key: "data", label: "Data" },
      { key: "product", label: "Product" },
      { key: "finance", label: "Finance" },
      { key: "tools", label: "Tools" },
      { key: "ai_tools", label: "AI tools" },
      { key: "languages", label: "Languages" },
    ],
  },
  {
    kind: "list",
    id: "achievements",
    title: "Achievements",
    description: "Awards, competitions, recognitions.",
    itemTitleKey: "title",
    addLabel: "Add achievement",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "level", label: "Level", type: "text", placeholder: "National" },
      { key: "year", label: "Year", type: "text" },
    ],
  },
  {
    kind: "list",
    id: "certificates",
    title: "Certificates",
    description: "",
    itemTitleKey: "name",
    addLabel: "Add certificate",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "issuer", label: "Issuer", type: "text" },
      { key: "year", label: "Year", type: "text" },
    ],
  },
  {
    kind: "list",
    id: "funding",
    title: "Funding",
    description: "Rounds raised, if any.",
    itemTitleKey: "round",
    addLabel: "Add round",
    fields: [
      { key: "round", label: "Round", type: "text", placeholder: "Pre-seed", required: true },
      { key: "amount", label: "Amount", type: "text", placeholder: "¥2M" },
      { key: "date", label: "Date", type: "text" },
      { key: "investors", label: "Investors", type: "tags", maxItems: 20, wide: true },
    ],
  },
  {
    kind: "list",
    id: "press",
    title: "Press",
    description: "Coverage worth pointing at.",
    itemTitleKey: "title",
    addLabel: "Add coverage",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "outlet", label: "Outlet", type: "text" },
      { key: "date", label: "Date", type: "text" },
      { key: "url", label: "URL", type: "url", placeholder: "https://" },
    ],
  },
  {
    kind: "list",
    id: "publications",
    title: "Publications",
    description: "",
    itemTitleKey: "title",
    addLabel: "Add publication",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, wide: true },
      { key: "venue", label: "Venue", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "url", label: "URL", type: "text", placeholder: "https:// or DOI", wide: true },
    ],
  },
  {
    kind: "list",
    id: "patents",
    title: "Patents",
    description: "",
    itemTitleKey: "title",
    addLabel: "Add patent",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, wide: true },
      { key: "id", label: "Patent no.", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "status", label: "Status", type: "text", placeholder: "Granted" },
    ],
  },
  {
    kind: "list",
    id: "opensource",
    title: "Open source",
    description: "",
    itemTitleKey: "repo",
    addLabel: "Add repository",
    fields: [
      { key: "repo", label: "Repository", type: "text", placeholder: "owner/name", required: true },
      { key: "role", label: "Role", type: "text", placeholder: "Maintainer" },
      { key: "stars", label: "Stars", type: "number" },
      { ...details, key: "highlights" },
    ],
  },
  {
    kind: "list",
    id: "volunteering",
    title: "Volunteering",
    description: "",
    itemTitleKey: "org",
    addLabel: "Add role",
    fields: [
      { key: "org", label: "Organisation", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      period,
      details,
    ],
  },
  {
    kind: "tags",
    id: "interests",
    title: "Interests",
    description: "",
    field: { key: "interests", label: "Interests", type: "tags", maxItems: 20, wide: true },
  },
];

export const SKILL_CATEGORY_KEYS: readonly ResumeSkillCategory[] = RESUME_SKILL_CATEGORIES;

export function getSection(id: SectionDef["id"]): SectionDef {
  const s = RESUME_SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown résumé section: ${id}`);
  return s;
}
