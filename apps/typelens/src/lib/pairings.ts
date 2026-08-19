/**
 * Pairings = font combinations (not works clones).
 * Works are evidence; the combination is the product unit.
 *
 * Worker-safe: group from typeface refs + getTypeface only.
 * Full extract only for the best specimen of each group.
 */
import {
  type AgentExtractPack,
  extractSpecimen,
  getTypeface,
  getWork,
  listSpecimens,
  type Typeface,
  type Work,
} from "@/lib/catalog";

export type PairingFace = {
  typefaceId: string;
  /** Only when the source actually recorded it. */
  role?: string;
  family: string;
  sampleImageUrl?: string;
  cssStack: string;
};

export type PairingWorkThumb = {
  slug: string;
  title: string;
  medium: string;
  cover?: string;
};

export type PairingGroup = {
  key: string;
  faces: PairingFace[];
  workCount: number;
  works: PairingWorkThumb[];
  specimenId: string;
  pack: AgentExtractPack;
  strategy: string;
  mediums: string[];
  tags: string[];
};

function coverOf(work: Work): string | undefined {
  return (work.imageAssets ?? []).find(
    (u) => /^https?:\/\//i.test(u) && /use-media|thumb|upto-/i.test(u),
  );
}

/**
 * The faces a work uses, deduped, in the order the source listed them.
 *
 * This used to key on `role` and sort by a ROLE_ORDER table. Both were built on
 * a value the promote script assigned by array index, so the "display face" of
 * every work was simply whichever face came back first. Now that roles are only
 * present when known, dedupe on the typeface itself and keep source order.
 */
function freeFacesFromSpecimen(
  typefaces: readonly { typefaceId: string; role?: string | undefined }[],
): PairingFace[] {
  const seen = new Set<string>();
  const out: PairingFace[] = [];
  for (const ref of typefaces) {
    if (seen.has(ref.typefaceId)) continue;
    const tf: Typeface | undefined = getTypeface(ref.typefaceId);
    if (!tf?.license.commercialOk) continue;
    seen.add(ref.typefaceId);
    const face: PairingFace = {
      typefaceId: tf.id,
      family: tf.family,
      cssStack: tf.cssStack,
    };
    if (ref.role) face.role = ref.role;
    if (tf.sampleImageUrl) face.sampleImageUrl = tf.sampleImageUrl;
    out.push(face);
  }
  return out;
}

type Acc = {
  key: string;
  faces: PairingFace[];
  workCount: number;
  works: PairingWorkThumb[];
  specimenId: string;
  strategy: string;
  mediums: Set<string>;
  tags: Set<string>;
  seenSlugs: Set<string>;
};

let CACHED: PairingGroup[] | null = null;

function buildAllGroups(): PairingGroup[] {
  const map = new Map<string, Acc>();

  for (const s of listSpecimens()) {
    const work = getWork(s.workId);
    if (!work || work.status !== "published") continue;

    const faces = freeFacesFromSpecimen(s.typefaces);
    if (faces.length < 1) continue;

    const key = [...new Set(faces.map((f) => f.typefaceId))].sort().join("+");
    let acc = map.get(key);
    if (!acc) {
      acc = {
        key,
        faces,
        workCount: 0,
        works: [],
        specimenId: s.id,
        strategy: s.pairing.strategy,
        mediums: new Set(),
        tags: new Set(),
        seenSlugs: new Set(),
      };
      map.set(key, acc);
    }

    acc.workCount += 1;
    acc.mediums.add(work.medium);
    for (const t of s.tags) {
      if (t !== "fiu-promote" && t !== "listing-only") acc.tags.add(t);
    }
    // The representative specimen used to be whichever had the highest
    // `confidence`, a field the promote script set to one of two constants —
    // so the choice was effectively arbitrary and dressed as a ranking. The
    // first published work carrying this exact face set is at least a fact.
    if (!acc.specimenId) {
      acc.specimenId = s.id;
      acc.strategy = s.pairing.strategy;
      acc.faces = faces;
    }
    if (!acc.seenSlugs.has(work.slug) && acc.works.length < 4) {
      acc.seenSlugs.add(work.slug);
      const thumb: PairingWorkThumb = {
        slug: work.slug,
        title: work.title,
        medium: work.medium,
      };
      const cover = coverOf(work);
      if (cover) thumb.cover = cover;
      acc.works.push(thumb);
    }
  }

  const groups: PairingGroup[] = [];
  for (const a of map.values()) {
    let pack: AgentExtractPack;
    try {
      pack = extractSpecimen(a.specimenId);
    } catch {
      continue;
    }
    groups.push({
      key: a.key,
      faces: a.faces,
      workCount: a.workCount,
      works: a.works,
      specimenId: a.specimenId,
      pack,
      strategy: a.strategy,
      mediums: [...a.mediums],
      tags: [...a.tags].slice(0, 8),
    });
  }

  groups.sort((a, b) => {
    if (b.workCount !== a.workCount) return b.workCount - a.workCount;
    return b.faces.length - a.faces.length;
  });
  return groups;
}

/**
 * Aggregate free-commercial typeface sets into combination-centric groups.
 */
export function listPairingGroups(
  opts: { multiOnly?: boolean; limit?: number } = {},
): PairingGroup[] {
  const multiOnly = opts.multiOnly ?? true;
  const limit = opts.limit ?? 36;

  if (!CACHED) {
    CACHED = buildAllGroups();
  }

  const filtered = multiOnly ? CACHED.filter((g) => g.faces.length >= 2) : CACHED;
  return filtered.slice(0, limit);
}
