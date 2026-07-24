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
    if (!pairing[ref.role]) {
      pairing[ref.role] = {
        family: tf.family,
        typefaceId: tf.id,
        role: ref.role,
        weight: ref.weight,
        cssStack: tf.cssStack,
      };
      cssTokens[roleCssVar(ref.role)] = tf.cssStack;
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
    hierarchy: { steps: specimen.hierarchy },
    cssTokens,
    licenses,
    confidence: specimen.confidence,
    humanVerified: specimen.verifiedBy === "human" || specimen.verifiedBy === "hybrid",
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
