import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";
import { parsePlayMarkdown } from "@nebutra/play-loader";

export type Visibility = "private" | "public";
export type Pricing =
  | { readonly model: "free" }
  | { readonly model: "one_time"; readonly amountUsd: number }
  | {
      readonly model: "subscription";
      readonly amountUsd: number;
      readonly interval: "month" | "year";
    }
  | { readonly model: "per_run"; readonly amountUsd: number };

export interface ValidatePlayPackageRequest {
  readonly skillMarkdown: string;
}

export interface PlayValidationReport {
  readonly ok: boolean;
  readonly playName: string;
  readonly version: string;
  readonly requiredSkills: readonly string[];
  readonly subAgents: readonly string[];
}

export interface PublishPlayRequest {
  readonly skillMarkdown: string;
  readonly visibility: Visibility;
  readonly pricing: Pricing;
  readonly invitedAuthor: boolean;
}

export interface PublishedPlay {
  readonly playId: string;
  readonly version: string;
  readonly registryPath: string;
  readonly visibility: Visibility;
  readonly pricing: Pricing;
  readonly quality: {
    readonly verified: boolean;
    readonly successRate: number;
    readonly avgCostUsd: number;
    readonly avgDurationMinutes: number;
  };
  readonly eventId: string;
}

export interface MarketplaceSearchRequest {
  readonly query: string;
  readonly sort: "success_rate" | "new";
}

export interface MarketplaceSearchResult {
  readonly items: readonly PublishedPlay[];
}

export interface InstalledPlay {
  readonly playId: string;
  readonly version: string;
  readonly status: "installed";
  readonly registeredSkill: string;
  readonly installPath: string;
}

export interface PlayMarketplaceDoctorReport {
  readonly capability: "play-marketplace";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly features: readonly string[];
  readonly suggestion?: string;
}

export interface PlayMarketplaceOptions {
  readonly tenantId?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function requireTenant(value: string | undefined): string {
  if (!value?.trim()) {
    throw new CapabilityError("play-marketplace", "Play Marketplace requires tenant context", {
      suggestion: "Pass tenantId so registry and install artifacts stay tenant-scoped.",
      statusCode: 400,
    });
  }
  return value;
}

function isPaid(pricing: Pricing): boolean {
  return pricing.model !== "free";
}

export function validatePlayPackage(request: ValidatePlayPackageRequest): PlayValidationReport {
  const play = parsePlayMarkdown(request.skillMarkdown);
  return {
    ok: true,
    playName: play.meta.name,
    version: play.meta.version,
    requiredSkills: play.requiredSkills,
    subAgents: play.subAgents.map((agent) => agent.role),
  };
}

export class PlayMarketplace {
  readonly #tenantId: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;
  readonly #plays = new Map<string, PublishedPlay & { readonly skillMarkdown: string }>();

  private constructor(
    options: Required<Pick<PlayMarketplaceOptions, "tenantId" | "contentStore" | "eventLog">> &
      Pick<PlayMarketplaceOptions, "debugRoot">,
  ) {
    this.#tenantId = requireTenant(options.tenantId);
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/play-marketplace",
    options: Omit<PlayMarketplaceOptions, "contentStore" | "eventLog"> = {},
  ): Promise<PlayMarketplace> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new PlayMarketplace({ ...options, tenantId, contentStore, eventLog });
  }

  async publish(request: PublishPlayRequest): Promise<PublishedPlay> {
    if (isPaid(request.pricing) && !request.invitedAuthor) {
      throw new CapabilityError(
        "play-marketplace",
        "Paid Play publishing is limited during controlled launch",
        {
          suggestion:
            "Use an invited author account or publish a free Play until paid publishing opens.",
          statusCode: 403,
        },
      );
    }

    const validation = validatePlayPackage({ skillMarkdown: request.skillMarkdown });
    const playId = validation.playName;
    const registryPath = `marketplace/plays/${playId}@${validation.version}.json`;
    const record = {
      playId,
      version: validation.version,
      visibility: request.visibility,
      pricing: request.pricing,
      quality: {
        verified: false,
        successRate: 0,
        avgCostUsd: 0,
        avgDurationMinutes: 0,
      },
      requiredSkills: validation.requiredSkills,
      subAgents: validation.subAgents,
      signature: assetId("play_sig", `${playId}_${validation.version}`),
    };
    const snapshot = `${JSON.stringify(record, null, 2)}\n`;
    await this.#contentStore.write(registryPath, snapshot);
    const eventId = await this.#eventLog.commit({
      traceId: assetId("play_marketplace_publish", `${playId}_${validation.version}`),
      kind: "content_write",
      affected: [registryPath],
      parent: null,
      snapshot: { [registryPath]: snapshot },
    });
    const published: PublishedPlay & { readonly skillMarkdown: string } = {
      playId,
      version: validation.version,
      registryPath,
      visibility: request.visibility,
      pricing: request.pricing,
      quality: record.quality,
      eventId,
      skillMarkdown: request.skillMarkdown,
    };
    this.#plays.set(`${playId}@${validation.version}`, published);
    await this.#debug({
      type: "publish",
      tenantId: this.#tenantId,
      playId,
      version: validation.version,
    });
    return published;
  }

  async search(request: MarketplaceSearchRequest): Promise<MarketplaceSearchResult> {
    const probe = request.query.toLowerCase();
    const items = [...this.#plays.values()]
      .filter(
        (play) =>
          play.playId.toLowerCase().includes(probe) ||
          play.skillMarkdown.toLowerCase().includes(probe),
      )
      .sort((left, right) =>
        request.sort === "success_rate"
          ? right.quality.successRate - left.quality.successRate ||
            left.playId.localeCompare(right.playId)
          : right.eventId.localeCompare(left.eventId),
      );
    await this.#debug({
      type: "search",
      tenantId: this.#tenantId,
      query: request.query,
      hits: items.length,
    });
    return { items };
  }

  async install(playId: string, version: string): Promise<InstalledPlay> {
    const key = `${playId}@${version}`;
    const play = this.#plays.get(key);
    if (!play) {
      throw new CapabilityError("play-marketplace", "Play registry record not found", {
        suggestion: "Search the marketplace and install an available version.",
        metadata: { playId, version },
        statusCode: 404,
      });
    }
    const installPath = `marketplace/installed/${playId}@${version}.json`;
    const install: InstalledPlay = {
      playId,
      version,
      status: "installed",
      registeredSkill: playId,
      installPath,
    };
    const snapshot = `${JSON.stringify(install, null, 2)}\n`;
    await this.#contentStore.write(installPath, snapshot);
    await this.#eventLog.commit({
      traceId: assetId("play_marketplace_install", `${playId}_${version}`),
      kind: "content_write",
      affected: [installPath],
      parent: play.eventId,
      snapshot: { [installPath]: snapshot },
    });
    await this.#debug({ type: "install", tenantId: this.#tenantId, playId, version });
    return install;
  }

  async doctor(): Promise<PlayMarketplaceDoctorReport> {
    const report: PlayMarketplaceDoctorReport = {
      capability: "play-marketplace",
      ok: true,
      checkedAt: new Date().toISOString(),
      features: ["validate-skill", "publish", "search", "install", "paid-launch-gate"],
      suggestion:
        "Local registry artifacts are active; remote registry, billing, and verified review queues remain handoffs.",
    };
    await this.#debug({ type: "doctor", tenantId: this.#tenantId, plays: this.#plays.size });
    return report;
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await appendCapabilityDebug("play-marketplace", entry, { root: this.#debugRoot });
  }
}

export async function readPlayMarketplaceDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  return readCapabilityDebug("play-marketplace", { root, limit });
}
