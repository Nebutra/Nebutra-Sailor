import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { requireCapabilityTenant } from "@nebutra/capability-kit";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";

export type SkillArea = "code" | "growth" | "brand" | "support";

export interface ActivityProfileInput {
  readonly founderId: string;
  readonly activeDays: number;
  readonly playCounts: Partial<Record<SkillArea, number>>;
  readonly domainTags: readonly string[];
  readonly communicationSamples: readonly string[];
}

export interface FounderProfile {
  readonly founderId: string;
  readonly activityVerified: boolean;
  readonly lockedReason?: string;
  readonly activeDays: number;
  readonly skillVector: Record<SkillArea, number>;
  readonly domainTags: readonly string[];
  readonly communicationStyle: readonly string[];
}

export interface MatchScore {
  readonly leftFounderId: string;
  readonly rightFounderId: string;
  readonly overall: number;
  readonly skillComplementarity: number;
  readonly domainAdjacency: number;
  readonly paceCompatibility: number;
  readonly why: readonly string[];
}

export interface ChatThread {
  readonly threadId: string;
  readonly threadKind: "mutual-consent-intro";
  readonly founders: readonly [string, string];
  readonly icebreaker: string;
}

export interface CofounderMatchDoctorReport {
  readonly capability: "cofounder-match";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly features: readonly string[];
  readonly suggestion?: string;
}

export interface CofounderMatchOptions {
  readonly tenantId?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function skillVector(input: Partial<Record<SkillArea, number>>): Record<SkillArea, number> {
  return {
    code: input.code ?? 0,
    growth: input.growth ?? 0,
    brand: input.brand ?? 0,
    support: input.support ?? 0,
  };
}

function strongestSkill(vector: Record<SkillArea, number>): SkillArea {
  return (
    (Object.entries(vector) as Array<[SkillArea, number]>).sort(
      ([leftKey, left], [rightKey, right]) => right - left || leftKey.localeCompare(rightKey),
    )[0]?.[0] ?? "code"
  );
}

function weakestSkill(vector: Record<SkillArea, number>): SkillArea {
  return (
    (Object.entries(vector) as Array<[SkillArea, number]>).sort(
      ([leftKey, left], [rightKey, right]) => left - right || leftKey.localeCompare(rightKey),
    )[0]?.[0] ?? "growth"
  );
}

function sharedCount(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.filter((item) => rightSet.has(item.toLowerCase())).length;
}

function consentKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export class CofounderMatch {
  readonly #tenantId: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;
  readonly #profiles = new Map<string, FounderProfile>();
  readonly #interests = new Set<string>();

  private constructor(
    options: Required<Pick<CofounderMatchOptions, "tenantId" | "contentStore" | "eventLog">> &
      Pick<CofounderMatchOptions, "debugRoot">,
  ) {
    this.#tenantId = requireCapabilityTenant({
      explicit: options.tenantId,
      onMissing: () =>
        new CapabilityError("cofounder-match", "Cofounder Match requires tenant context", {
          suggestion: "Pass tenantId so profile and consent artifacts stay tenant-scoped.",
          statusCode: 400,
        }),
    });
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/cofounder-match",
    options: Omit<CofounderMatchOptions, "contentStore" | "eventLog"> = {},
  ): Promise<CofounderMatch> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new CofounderMatch({ ...options, tenantId, contentStore, eventLog });
  }

  async buildProfileFromActivity(input: ActivityProfileInput): Promise<FounderProfile> {
    const profile: FounderProfile = {
      founderId: input.founderId,
      activeDays: input.activeDays,
      activityVerified: input.activeDays >= 30,
      ...(input.activeDays < 30
        ? { lockedReason: "Cofounder matching unlocks after 30 days of real activity." }
        : {}),
      skillVector: skillVector(input.playCounts),
      domainTags: input.domainTags,
      communicationStyle: input.communicationSamples,
    };
    const path = `cofounder-match/profiles/${input.founderId}.json`;
    const snapshot = `${JSON.stringify(profile, null, 2)}\n`;
    await this.#contentStore.write(path, snapshot);
    this.#profiles.set(input.founderId, profile);
    await this.#debug({
      type: "profile",
      tenantId: this.#tenantId,
      founderId: input.founderId,
      activityVerified: profile.activityVerified,
    });
    return profile;
  }

  scoreMatch(left: FounderProfile, right: FounderProfile): MatchScore {
    const leftWeak = weakestSkill(left.skillVector);
    const rightStrong = strongestSkill(right.skillVector);
    const rightWeak = weakestSkill(right.skillVector);
    const leftStrong = strongestSkill(left.skillVector);
    const growthFill = left.skillVector.growth <= 10 && right.skillVector.growth >= 30 ? 45 : 0;
    const codeFill = right.skillVector.code <= 10 && left.skillVector.code >= 30 ? 25 : 0;
    const supportFill = left.skillVector.support <= 5 && right.skillVector.support >= 15 ? 10 : 0;
    const brandFill = right.skillVector.brand <= 5 && left.skillVector.brand >= 10 ? 10 : 0;
    const complements = Math.min(100, 20 + growthFill + codeFill + supportFill + brandFill);
    const domainAdjacency = Math.min(100, 55 + sharedCount(left.domainTags, right.domainTags) * 20);
    const paceCompatibility = Math.max(40, 100 - Math.abs(left.activeDays - right.activeDays));
    const overall = Math.round(
      Math.min(100, complements * 0.55 + domainAdjacency * 0.25 + paceCompatibility * 0.2),
    );
    const why = [
      `${right.founderId} is strong in ${rightStrong[0]?.toUpperCase()}${rightStrong.slice(
        1,
      )}, which complements ${left.founderId}'s ${leftWeak} gap.`,
      `${left.founderId} is strong in ${leftStrong}, which balances ${right.founderId}'s ${rightWeak} gap.`,
      `Shared domains: ${sharedCount(left.domainTags, right.domainTags)}.`,
    ];
    return {
      leftFounderId: left.founderId,
      rightFounderId: right.founderId,
      overall,
      skillComplementarity: Math.min(100, complements),
      domainAdjacency,
      paceCompatibility,
      why,
    };
  }

  async expressInterest(fromFounderId: string, toFounderId: string): Promise<void> {
    this.#interests.add(consentKey(fromFounderId, toFounderId));
    await this.#debug({ type: "interest", tenantId: this.#tenantId, fromFounderId, toFounderId });
  }

  async startChat(leftFounderId: string, rightFounderId: string): Promise<ChatThread> {
    if (
      !this.#interests.has(consentKey(leftFounderId, rightFounderId)) ||
      !this.#interests.has(consentKey(rightFounderId, leftFounderId))
    ) {
      throw new CapabilityError("cofounder-match", "Mutual consent is required before chat", {
        suggestion: "Wait for mutual interest before opening a cofounder intro thread.",
        statusCode: 403,
      });
    }
    const thread: ChatThread = {
      threadId: assetId("cofounder_chat", `${leftFounderId}_${rightFounderId}`),
      threadKind: "mutual-consent-intro",
      founders: [leftFounderId, rightFounderId],
      icebreaker: `${leftFounderId}, start with the specific work you admired in ${rightFounderId}'s profile.`,
    };
    const path = `cofounder-match/chats/${thread.threadId}.json`;
    const snapshot = `${JSON.stringify(thread, null, 2)}\n`;
    await this.#contentStore.write(path, snapshot);
    await this.#eventLog.commit({
      traceId: assetId("cofounder_match_chat", thread.threadId),
      kind: "content_write",
      affected: [path],
      parent: null,
      snapshot: { [path]: snapshot },
    });
    await this.#debug({
      type: "start_chat",
      tenantId: this.#tenantId,
      founders: thread.founders,
    });
    return thread;
  }

  async doctor(): Promise<CofounderMatchDoctorReport> {
    const report: CofounderMatchDoctorReport = {
      capability: "cofounder-match",
      ok: true,
      checkedAt: new Date().toISOString(),
      features: ["activity-verified-profile", "explainable-score", "mutual-consent-intro"],
      suggestion:
        "Local matching contracts are ready; encrypted chat and identity providers remain adapter handoffs.",
    };
    await this.#debug({ type: "doctor", tenantId: this.#tenantId, profiles: this.#profiles.size });
    return report;
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await appendCapabilityDebug("cofounder-match", entry, { root: this.#debugRoot });
  }
}

export async function readCofounderMatchDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  return readCapabilityDebug("cofounder-match", { root, limit });
}
