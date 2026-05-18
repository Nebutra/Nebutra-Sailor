import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";

export type TicketCategory = "billing" | "bug" | "how_to" | "sales" | "other";
export type TicketSentiment = "neutral" | "angry" | "positive";
export type SupportAction = "auto-answer" | "suggest-answer" | "escalate";

export interface SupportTicket {
  readonly id: string;
  readonly tenantId?: string;
  readonly customer: {
    readonly id: string;
    readonly email: string;
    readonly plan?: string;
  };
  readonly subject: string;
  readonly body: string;
}

export interface KnowledgeArticle {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export interface TicketClassification {
  readonly category: TicketCategory;
  readonly sentiment: TicketSentiment;
  readonly highValue: boolean;
  readonly complaint: boolean;
}

export interface SupportPolicy {
  readonly autoReplyThreshold: number;
  readonly escalateOnComplaint?: boolean;
  readonly escalateOnHighValueCustomer?: boolean;
}

export interface SupportReply {
  readonly subject: string;
  readonly body: string;
  readonly citations: readonly string[];
}

export interface SupportDecision {
  readonly play: "ticket_triage";
  readonly action: SupportAction;
  readonly confidence: number;
  readonly classification: TicketClassification;
  readonly reply?: SupportReply;
  readonly escalationSummary?: string;
  readonly eventId?: string;
}

export interface HandleTicketInput {
  readonly ticket: SupportTicket;
  readonly articles: readonly KnowledgeArticle[];
  readonly policy: SupportPolicy;
}

export interface SupportDoctorReport {
  readonly capability: "support-deflector";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly plays: readonly string[];
  readonly mode: "confidence-gated";
  readonly channels: readonly { readonly provider: string; readonly ok: boolean }[];
}

export interface SupportDeflectorOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function requireTenant(explicit: string | undefined, fallback: string | undefined): string {
  const tenantId = explicit ?? fallback;
  if (!tenantId?.trim()) {
    throw new CapabilityError("support-deflector", "Support Deflector requires tenant context", {
      suggestion: "Pass tenantId with the ticket or construct SupportDeflector with tenantId.",
      statusCode: 400,
    });
  }
  return tenantId;
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function classifyTicket(ticket: SupportTicket): TicketClassification {
  const text = `${ticket.subject} ${ticket.body}`.toLowerCase();
  const category: TicketCategory = includesAny(text, ["bug", "broke", "error", "production"])
    ? "bug"
    : includesAny(text, ["refund", "invoice", "billing", "cancel"])
      ? "billing"
      : includesAny(text, ["how", "setup", "configure"])
        ? "how_to"
        : includesAny(text, ["pricing", "demo", "sales"])
          ? "sales"
          : "other";
  const angry = includesAny(text, ["angry", "furious", "broken", "terrible", "lawsuit"]);
  const positive = includesAny(text, ["thanks", "great", "love"]);
  const highValue = ticket.customer.plan === "enterprise" || includesAny(text, ["enterprise"]);
  return {
    category,
    sentiment: angry ? "angry" : positive ? "positive" : "neutral",
    highValue,
    complaint: angry || includesAny(text, ["complaint", "refund now", "unacceptable"]),
  };
}

function matchArticle(
  ticket: SupportTicket,
  articles: readonly KnowledgeArticle[],
): KnowledgeArticle | undefined {
  const text = `${ticket.subject} ${ticket.body}`.toLowerCase();
  return (
    articles.find((article) =>
      article.title
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 3)
        .some((term) => text.includes(term)),
    ) ??
    articles.find((article) =>
      article.body
        .toLowerCase()
        .split(/\W+/)
        .filter((term) => term.length > 6)
        .some((term) => text.includes(term)),
    )
  );
}

function synthesizeReply(ticket: SupportTicket, article: KnowledgeArticle): SupportReply {
  const firstSentence = article.body.split(".")[0]?.trim() ?? article.body;
  return {
    subject: `Re: ${ticket.subject}`,
    body: `${firstSentence}. If you want, reply here and we will help with the next step.`,
    citations: [article.id],
  };
}

export function decideTicket(
  ticket: SupportTicket,
  articles: readonly KnowledgeArticle[],
  policy: SupportPolicy,
): SupportDecision {
  const classification = classifyTicket(ticket);
  const article = matchArticle(ticket, articles);
  const confidence = article ? (classification.category === "other" ? 0.72 : 0.9) : 0.35;
  const shouldEscalate =
    (policy.escalateOnComplaint ?? true) && classification.complaint
      ? true
      : (policy.escalateOnHighValueCustomer ?? true) && classification.highValue;
  if (shouldEscalate) {
    return {
      play: "ticket_triage",
      action: "escalate",
      confidence,
      classification,
      ...(article ? { reply: synthesizeReply(ticket, article) } : {}),
      escalationSummary: `${ticket.customer.email} needs founder attention for ${classification.category}.`,
    };
  }
  if (article && confidence >= policy.autoReplyThreshold) {
    return {
      play: "ticket_triage",
      action: "auto-answer",
      confidence,
      classification,
      reply: synthesizeReply(ticket, article),
    };
  }
  return {
    play: "ticket_triage",
    action: "suggest-answer",
    confidence,
    classification,
    ...(article ? { reply: synthesizeReply(ticket, article) } : {}),
  };
}

export class SupportDeflector {
  readonly #tenantId: string | undefined;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;

  private constructor(
    options: SupportDeflectorOptions & { contentStore: ContentStore; eventLog: EventLog },
  ) {
    this.#tenantId = options.tenantId;
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/support-deflector",
    options: Omit<SupportDeflectorOptions, "root" | "contentStore" | "eventLog"> = {},
  ): Promise<SupportDeflector> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new SupportDeflector({ ...options, tenantId, root, contentStore, eventLog });
  }

  async handleTicket(input: HandleTicketInput): Promise<SupportDecision> {
    const tenantId = requireTenant(input.ticket.tenantId, this.#tenantId);
    const decision = decideTicket(input.ticket, input.articles, input.policy);
    const artifactPath = `support/tickets/${input.ticket.id}.json`;
    const content = `${JSON.stringify({ ticket: input.ticket, decision }, null, 2)}\n`;
    await this.#contentStore.write(artifactPath, content);
    const eventId = await this.#eventLog.commit({
      traceId: assetId("support_ticket", input.ticket.id),
      kind: "content_write",
      affected: [artifactPath],
      parent: null,
      snapshot: { [artifactPath]: content },
    });
    await this.#debug({
      type: "ticket_decision",
      tenantId,
      ticketId: input.ticket.id,
      action: decision.action,
      eventId,
    });
    return { ...decision, eventId };
  }

  async doctor(): Promise<SupportDoctorReport> {
    return {
      capability: "support-deflector",
      ok: true,
      checkedAt: new Date().toISOString(),
      plays: ["ticket_triage"],
      mode: "confidence-gated",
      channels: [
        { provider: "local-ticket", ok: true },
        { provider: "chatwoot-bridge", ok: false },
        { provider: "email-bridge", ok: false },
      ],
    };
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(join(this.#debugRoot, ".nebutra", "debug", "support-deflector.jsonl")), {
      recursive: true,
    });
    await appendCapabilityDebug("support-deflector", entry, { root: this.#debugRoot });
  }
}

export async function readSupportDeflectorDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  return readCapabilityDebug("support-deflector", { root, limit });
}
