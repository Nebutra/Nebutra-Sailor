import type { StartupOSProject } from "@/lib/startup-os/compiler";
import { companyName, valueProposition } from "@/lib/startup-os/company-context/projection";

/**
 * Match-Your-Cofounder derives a founder's pool card from their REAL compiled
 * company (Startup OS CompanyContext) — never from a hand-entered résumé. A
 * founder can only opt in once they have a compiled company, so the card always
 * reflects something they actually built.
 */
export interface CofounderProfileInput {
  readonly arena: string;
  readonly headline: string;
  /**
   * Founder archetype (Technical / GTM / …) is computed from real activity
   * signals (skill vectors). We do NOT fabricate one at opt-in time — it stays
   * undefined until activity data is wired, and the card shows "Founder".
   */
  readonly archetype?: string;
}

const HEADLINE_MAX = 280;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Build the opt-in profile input from a compiled project. Honest by
 * construction: the headline is the company's own value proposition (falling
 * back to its name), and no archetype is invented.
 */
export function deriveCofounderProfileInput(project: StartupOSProject): CofounderProfileInput {
  const proposition = valueProposition(project.companyContext).trim();
  const headline = truncate(proposition || companyName(project.companyContext), HEADLINE_MAX);
  return {
    arena: project.arena,
    headline,
  };
}
