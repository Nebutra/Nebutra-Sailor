import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";

export interface IcpDefinition {
  readonly industries: readonly string[];
  readonly companySize: { readonly min: number; readonly max: number };
  readonly titles: readonly string[];
  readonly geo: readonly string[];
  readonly techStack: readonly string[];
}

export interface ComplianceProfile {
  readonly physicalAddress: string;
  readonly unsubscribeUrl: string;
  readonly gdprBasis?: "legitimate_interest" | "consent" | "existing_customer";
}

export interface EmailVariant {
  readonly step: number;
  readonly subject: string;
  readonly body: string;
  readonly daysAfterPrevious: number;
}

export interface ComplianceReport {
  readonly ok: boolean;
  readonly checks: {
    readonly hasUnsubscribeLink: boolean;
    readonly hasPhysicalAddress: boolean;
    readonly hasClearSubject: boolean;
    readonly gdprBasisDocumented: boolean;
  };
  readonly suggestion?: string;
}

export interface CampaignInput {
  readonly tenantId?: string;
  readonly icpDescription: string;
  readonly targetCount: number;
  readonly product: string;
  readonly sequenceLength: number;
  readonly sendPerDay: number;
  readonly senderEmails: readonly string[];
  readonly complianceProfile: ComplianceProfile;
}

export interface Lead {
  readonly id: string;
  readonly company: string;
  readonly title: string;
  readonly source: "local-plan";
  readonly confidence: number;
}

export interface CampaignPackage {
  readonly tenantId: string;
  readonly play: "outreach_campaign";
  readonly id: string;
  readonly status: "draft";
  readonly icp: IcpDefinition;
  readonly leads: readonly Lead[];
  readonly sequence: readonly EmailVariant[];
  readonly compliance: ComplianceReport;
  readonly schedule: {
    readonly dailyLimit: number;
    readonly senderEmails: readonly string[];
    readonly requiresApprovalBeforeSend: true;
  };
  readonly artifactPath: string;
  readonly eventId: string;
}

export interface SequenceInput {
  readonly product: string;
  readonly sequenceLength: number;
  readonly brandVoice?: readonly string[];
}

export interface OutreachDoctorReport {
  readonly capability: "outreach-engine";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly plays: readonly string[];
  readonly sendMode: "draft-only";
  readonly adapters: readonly { readonly provider: string; readonly ok: boolean }[];
}

export interface OutreachEngineOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function requireTenant(explicit: string | undefined, fallback: string | undefined): string {
  const tenantId = explicit ?? fallback;
  if (!tenantId?.trim()) {
    throw new CapabilityError("outreach-engine", "Outreach Engine requires tenant context", {
      suggestion: "Pass tenantId before creating or persisting a campaign.",
      statusCode: 400,
    });
  }
  return tenantId;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function defineIcp(description: string): IcpDefinition {
  const text = description.toLowerCase();
  const industries =
    text.includes("e-commerce") || text.includes("d2c")
      ? ["e-commerce", "D2C"]
      : text.includes("saas")
        ? ["SaaS"]
        : ["startup"];
  const titles = text.includes("cto")
    ? ["CTO", "VP Engineering", "Head of Engineering"]
    : ["VP Marketing", "Head of Growth", "CMO"];
  const companySize =
    text.includes("mid-size") || text.includes("medium")
      ? { min: 50, max: 500 }
      : { min: 1, max: 50 };
  const geo = text.includes("eu") ? ["EU"] : text.includes("us") ? ["US"] : ["US", "EU"];
  const techStack = text.includes("shopify") ? ["Shopify"] : [];
  return { industries, companySize, titles, geo, techStack };
}

export function buildEmailSequence(input: SequenceInput): readonly EmailVariant[] {
  const length = Math.max(1, Math.min(5, input.sequenceLength));
  const voice = input.brandVoice?.join(", ") ?? "clear, useful";
  return Array.from({ length }, (_, index) => {
    const step = index + 1;
    return {
      step,
      subject: step === 1 ? "Quick question" : `Following up ${step}`,
      body: [
        `Hi {{first_name}},`,
        "",
        step === 1
          ? `I noticed {{company}} may care about ${input.product}.`
          : `Sharing one more angle on ${input.product}.`,
        `Tone: ${voice}.`,
        "",
        "If this is not useful, unsubscribe here: {{unsubscribe_url}}.",
        "{{physical_address}}",
      ].join("\n"),
      daysAfterPrevious: step === 1 ? 0 : step + 1,
    };
  });
}

export function checkEmailCompliance(
  email: EmailVariant | undefined,
  profile: ComplianceProfile,
): ComplianceReport {
  const body = email?.body ?? "";
  const checks = {
    hasUnsubscribeLink: body.includes("unsubscribe") && profile.unsubscribeUrl.startsWith("http"),
    hasPhysicalAddress: profile.physicalAddress.trim().length > 4,
    hasClearSubject: Boolean(email?.subject.trim()),
    gdprBasisDocumented: Boolean(profile.gdprBasis),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    ok,
    checks,
    ...(!ok
      ? {
          suggestion:
            "Add unsubscribe URL, physical address, clear subject, and GDPR basis before any send adapter can run.",
        }
      : {}),
  };
}

function plannedLeads(icp: IcpDefinition, count: number): readonly Lead[] {
  const size = Math.max(1, Math.min(250, count));
  return Array.from({ length: size }, (_, index) => ({
    id: `lead_${String(index + 1).padStart(3, "0")}`,
    company: `${icp.industries[0] ?? "startup"} account ${index + 1}`,
    title: icp.titles[index % icp.titles.length] ?? "Founder",
    source: "local-plan",
    confidence: 0.72,
  }));
}

export class OutreachEngine {
  readonly #tenantId: string | undefined;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;

  private constructor(
    options: OutreachEngineOptions & { contentStore: ContentStore; eventLog: EventLog },
  ) {
    this.#tenantId = options.tenantId;
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/outreach-engine",
    options: Omit<OutreachEngineOptions, "root" | "contentStore" | "eventLog"> = {},
  ): Promise<OutreachEngine> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new OutreachEngine({ ...options, tenantId, root, contentStore, eventLog });
  }

  async createCampaign(input: CampaignInput): Promise<CampaignPackage> {
    const tenantId = requireTenant(input.tenantId, this.#tenantId);
    const icp = defineIcp(input.icpDescription);
    const sequence = buildEmailSequence({
      product: input.product,
      sequenceLength: input.sequenceLength,
      brandVoice: ["specific", "useful", "respectful"],
    });
    const compliance = checkEmailCompliance(sequence[0], input.complianceProfile);
    if (!compliance.ok) {
      throw new CapabilityError("outreach-engine", "Campaign failed compliance checks", {
        suggestion:
          compliance.suggestion ??
          "Add unsubscribe URL, physical address, clear subject, and GDPR basis.",
        statusCode: 400,
        metadata: compliance.checks,
      });
    }
    const id = assetId("outreach_campaign", slug(input.icpDescription));
    const leads = plannedLeads(icp, input.targetCount);
    const artifactPath = `outreach/${id}.json`;
    const draft = {
      id,
      status: "draft",
      icp,
      leads,
      sequence,
      schedule: {
        dailyLimit: Math.max(1, Math.min(30, input.sendPerDay)),
        senderEmails: input.senderEmails,
        requiresApprovalBeforeSend: true,
      } as const,
    };
    const content = `${JSON.stringify(draft, null, 2)}\n`;
    await this.#contentStore.write(artifactPath, content);
    const eventId = await this.#eventLog.commit({
      traceId: id,
      kind: "content_write",
      affected: [artifactPath],
      parent: null,
      snapshot: { [artifactPath]: content },
    });
    const campaign: CampaignPackage = {
      tenantId,
      play: "outreach_campaign",
      id,
      status: "draft",
      icp,
      leads,
      sequence,
      compliance,
      schedule: draft.schedule,
      artifactPath,
      eventId,
    };
    await this.#debug({ type: "campaign_draft", tenantId, campaignId: id, eventId });
    return campaign;
  }

  async doctor(): Promise<OutreachDoctorReport> {
    return {
      capability: "outreach-engine",
      ok: true,
      checkedAt: new Date().toISOString(),
      plays: ["outreach_campaign"],
      sendMode: "draft-only",
      adapters: [
        { provider: "local-plan", ok: true },
        { provider: "integration-vault-email", ok: false },
        { provider: "crm-sync", ok: false },
      ],
    };
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(join(this.#debugRoot, ".nebutra", "debug", "outreach-engine.jsonl")), {
      recursive: true,
    });
    await appendCapabilityDebug("outreach-engine", entry, { root: this.#debugRoot });
  }
}

export async function readOutreachEngineDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  return readCapabilityDebug("outreach-engine", { root, limit });
}
