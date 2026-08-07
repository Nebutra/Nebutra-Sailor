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
  role: string;
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

const ROLE_ORDER = ["display", "headline", "body", "caption", "mono", "accent"];

function freeFacesFromSpecimen(
  typefaces: readonly { typefaceId: string; role: string }[],
): PairingFace[] {
  const byRole = new Map<string, PairingFace>();
  for (const ref of typefaces) {
    if (byRole.has(ref.role)) continue;
    const tf: Typeface | undefined = getTypeface(ref.typefaceId);
    if (!tf?.license.commercialOk) continue;
    const face: PairingFace = {
      typefaceId: tf.id,
      role: ref.role,
      family: tf.family,
      cssStack: tf.cssStack,
    };
    if (tf.sampleImageUrl) face.sampleImageUrl = tf.sampleImageUrl;
    byRole.set(ref.role, face);
  }
  return [...byRole.values()].sort((a, b) => {
    const ia = ROLE_ORDER.indexOf(a.role);
    const ib = ROLE_ORDER.indexOf(b.role);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
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
  confidence: number;
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
        confidence: s.confidence,
        seenSlugs: new Set(),
      };
      map.set(key, acc);
    }

    acc.workCount += 1;
    acc.mediums.add(work.medium);
    for (const t of s.tags) {
      if (t !== "fiu-promote" && t !== "listing-only") acc.tags.add(t);
    }
    if (s.confidence >= acc.confidence) {
      acc.confidence = s.confidence;
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
