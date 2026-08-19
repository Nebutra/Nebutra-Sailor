import {
  type AgentExtractPack,
  AgentExtractPackSchema,
  type Specimen,
  type Typeface,
  type Work,
} from "./schema";
import { SPECIMEN_BY_ID } from "./specimens";
import { TYPEFACE_BY_ID } from "./typefaces";
import { WORK_BY_ID } from "./works";

function roleCssVar(role: string): string {
  return `--font-${role}`;
}
export function extractSpecimen(specimenId: string): AgentExtractPack {
  const specimen = SPECIMEN_BY_ID.get(specimenId);
  if (!specimen) throw new Error(`Specimen not found: ${specimenId}`);
  return extractFromParts(specimen);
}
export function extractFromParts(
  specimen: Specimen,
  work: Work = requiredWork(specimen.workId),
  typefaceIndex: ReadonlyMap<string, Typeface> = TYPEFACE_BY_ID,
): AgentExtractPack {
  const pairing: AgentExtractPack["pairing"] = {};
  const cssTokens: Record<string, string> = {};
  const licenses: AgentExtractPack["licenses"] = [];
  const seen = new Set<string>();
  for (const ref of specimen.typefaces) {
    const tf = typefaceIndex.get(ref.typefaceId);
    if (!tf) throw new Error(`Typeface ${ref.typefaceId} missing for specimen ${specimen.id}`);
    if (!tf.license.commercialOk) throw new Error(`Typeface ${tf.id} is not commercialOk`);
    // Keyed by role only where the source recorded one. Everything promoted
    // from Fonts In Use has no role — that field used to be filled in by array
    // index, which made `--font-display` mean "whichever face sorted first".
    // Faces without a role are still exported, keyed by their own id, so an
    // agent gets the set without being told a hierarchy nobody observed.
    const key = ref.role ?? tf.id;
    if (!pairing[key]) {
      const entry: (typeof pairing)[string] = {
        family: tf.family,
        typefaceId: tf.id,
        cssStack: tf.cssStack,
      };
      if (ref.role) entry.role = ref.role;
      if (ref.weight) entry.weight = ref.weight;
      pairing[key] = entry;
      if (ref.role) cssTokens[roleCssVar(ref.role)] = tf.cssStack;
    }
    if (!seen.has(tf.id)) {
      seen.add(tf.id);
      licenses.push({
        typefaceId: tf.id,
        family: tf.family,
        commercialOk: true,
        spdxOrLabel: tf.license.spdxOrLabel,
        licenseUrl: tf.license.licenseUrl,
        attributionRequired: tf.license.attributionRequired,
      });
    }
  }
  return AgentExtractPackSchema.parse({
    schemaVersion: 1,
    specimenId: specimen.id,
    workId: work.id,
    workSlug: work.slug,
    intentHints: [...specimen.tags, ...work.mood, work.medium, work.industry ?? ""].filter(Boolean),
    pairing,
    ...(specimen.hierarchy ? { hierarchy: { steps: specimen.hierarchy } } : {}),
    cssTokens,
    licenses,
    ...(specimen.confidence == null ? {} : { confidence: specimen.confidence }),
    // "hybrid" used to count as human-verified. Nothing in the promote
    // pipeline was reviewed by a person, so only "human" says so now.
    humanVerified: specimen.verifiedBy === "human",
    medium: work.medium,
    scripts: work.scripts,
    summary: specimen.summary,
  });
}
function requiredWork(workId: string): Work {
  const work = WORK_BY_ID.get(workId);
  if (!work) throw new Error(`Work not found: ${workId}`);
  return work;
}
