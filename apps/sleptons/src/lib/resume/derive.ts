import type { ResumeContentV1, ResumeDerived } from "@nebutra/contracts/sleptons";
import { RESUME_SKILL_CATEGORIES } from "@nebutra/contracts/sleptons";
import { TECH_STACK_OPTIONS } from "../constants";

/**
 * Derived columns for `sleptons_resumes`, recomputed on every save.
 * Pure: no I/O, no model calls. Spec §3.1 and §6.3.
 */

const HTML_TAG = /<[^>]*>/g;
const WHITESPACE = /\s+/g;
const HAS_NUMBER = /\d/;
const YEAR = /(19|20)\d{2}/;

function stripHtml(input: string): string {
  return input.replace(HTML_TAG, " ").replace(WHITESPACE, " ").trim();
}

const CANONICAL_SKILLS = new Map(TECH_STACK_OPTIONS.map((s) => [s.toLowerCase(), s] as const));

/** Normalize a free-text skill against the Sleptons canonical vocabulary; null if unknown. */
export function canonicalSkill(raw: string): string | null {
  return CANONICAL_SKILLS.get(raw.trim().toLowerCase()) ?? null;
}

export function deriveHeadline(content: ResumeContentV1): string | null {
  const summary = content.objective.summary ? stripHtml(content.objective.summary) : "";
  if (summary) {
    const firstSentence = summary.split(/(?<=[.。!?！？])\s*/)[0] ?? summary;
    return firstSentence.slice(0, 120);
  }
  const venture = content.ventures?.[0];
  if (venture) return `${venture.role ? `${venture.role} · ` : ""}${venture.name}`.slice(0, 120);
  const exp = content.experiences?.[0];
  if (exp) return `${exp.title} · ${exp.org}`.slice(0, 120);
  return null;
}

/** All skill categories flattened; only canonical values (spec §3.2). */
export function deriveSkillsFlat(content: ResumeContentV1): string[] {
  const out = new Set<string>();
  for (const category of RESUME_SKILL_CATEGORIES) {
    for (const raw of content.skills?.[category] ?? []) {
      const c = canonicalSkill(raw);
      if (c) out.add(c);
    }
  }
  return [...out];
}

function earliestYear(periods: Array<string | undefined>): number | null {
  const years = periods
    .map((p) => p?.match(YEAR)?.[0])
    .filter((y): y is string => Boolean(y))
    .map(Number);
  return years.length ? Math.min(...years) : null;
}

export function deriveYearsActive(content: ResumeContentV1, now = new Date()): number | null {
  const start = earliestYear([
    ...(content.ventures ?? []).map((v) => v.period),
    ...(content.experiences ?? []).map((e) => e.period),
  ]);
  if (start === null) return null;
  return Math.max(0, now.getFullYear() - start);
}

type ScoredBullet = { text: string; score: number };

/**
 * Spec §6.3: (has number) × 2 + (has canonical skill) × 1 + (founder-kind) × 2 + recency.
 * Recency = position bonus: entries are assumed newest-first, first entry +1.
 */
export function deriveHighlights(content: ResumeContentV1): string[] {
  const scored: ScoredBullet[] = [];
  const push = (text: string, base: number, index: number) => {
    const clean = stripHtml(text);
    if (!clean) return;
    let score = base + (index === 0 ? 1 : 0);
    if (HAS_NUMBER.test(clean)) score += 2;
    if (clean.split(/[\s,，/、]+/).some((w) => canonicalSkill(w))) score += 1;
    scored.push({ text: clean.slice(0, 200), score });
  };

  (content.ventures ?? []).forEach((v, i) => {
    for (const d of v.details ?? []) push(d, 2, i);
    if (v.outcome) push(v.outcome, 2, i);
  });
  (content.experiences ?? []).forEach((e, i) => {
    for (const d of e.details ?? []) push(d, e.kind === "founder" ? 2 : 0, i);
  });
  (content.projects ?? []).forEach((p, i) => {
    for (const d of p.details ?? []) push(d, 0, i);
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.text);
}

/**
 * 0–100 completeness, ported from CVise `calculateResumeProgress` with founder
 * weights: ventures count as experience, contact is name + one channel.
 */
export function deriveCompleteness(content: ResumeContentV1): number {
  const weights = {
    basic: 15,
    objective: 10,
    education: 10,
    experience: 25,
    projects: 15,
    skills: 10,
    achievements: 5,
    other: 10,
  };
  let earned = 0;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const hasChannel = Boolean(
    content.basic.email ||
      content.basic.website ||
      Object.values(content.basic.links ?? {}).some(Boolean),
  );
  if (content.basic.name && hasChannel) earned += weights.basic;
  else if (content.basic.name) earned += weights.basic * 0.6;

  if (content.objective.summary || (content.objective.advantage_tags?.length ?? 0) > 0)
    earned += weights.objective;

  if ((content.education?.length ?? 0) > 0) {
    const full = content.education?.some((e) => e.school && e.major && e.degree);
    earned += full ? weights.education : weights.education * 0.5;
  }

  const ventures = content.ventures?.length ?? 0;
  const experiences = content.experiences?.length ?? 0;
  if (ventures > 0 && experiences > 0) earned += weights.experience;
  else if (ventures > 0 || experiences > 0) earned += weights.experience * 0.7;

  if ((content.projects?.length ?? 0) > 0) {
    const full = content.projects?.some((p) => p.name && (p.details?.length ?? 0) > 0);
    earned += full ? weights.projects : weights.projects * 0.5;
  }

  if (Object.values(content.skills ?? {}).some((arr) => Array.isArray(arr) && arr.length > 0))
    earned += weights.skills;

  if ((content.achievements?.length ?? 0) > 0 || (content.certificates?.length ?? 0) > 0)
    earned += weights.achievements;

  const other =
    (content.publications?.length ?? 0) > 0 ||
    (content.opensource?.length ?? 0) > 0 ||
    (content.press?.length ?? 0) > 0 ||
    (content.funding?.length ?? 0) > 0 ||
    (content.interests?.length ?? 0) > 0;
  if (other) earned += weights.other;

  return Math.round((earned / total) * 100);
}

export function deriveResume(content: ResumeContentV1, now = new Date()): ResumeDerived {
  return {
    headline: deriveHeadline(content),
    skills_flat: deriveSkillsFlat(content),
    highlights: deriveHighlights(content),
    years_active: deriveYearsActive(content, now),
    completeness: deriveCompleteness(content),
  };
}
