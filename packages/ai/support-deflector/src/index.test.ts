import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePlayMarkdown } from "@nebutra/play-loader";
import { afterEach, describe, expect, it } from "vitest";
import { classifyTicket, decideTicket, readSupportDeflectorDebug, SupportDeflector } from "./index";

let root: string | undefined;
let support: SupportDeflector | undefined;

const ticket = {
  id: "ticket_1",
  tenantId: "tenant_a",
  customer: { id: "customer_1", email: "a@example.com", plan: "free" },
  subject: "How do refunds work?",
  body: "Can I get a refund if I cancel this week?",
} as const;

const articles = [
  {
    id: "kb_refund",
    title: "Refund policy",
    body: "Refunds are available within 14 days. Contact support and include your account email.",
  },
];

afterEach(async () => {
  if (support) await support.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  support = undefined;
});

async function open(): Promise<SupportDeflector> {
  root = await mkdtemp(join(tmpdir(), "support-deflector-"));
  support = await SupportDeflector.open(root, { tenantId: "tenant_a" });
  return support;
}

describe("support-deflector", () => {
  it("classifies customer tickets conservatively", () => {
    expect(classifyTicket(ticket)).toMatchObject({ category: "billing", sentiment: "neutral" });
    expect(
      classifyTicket({
        ...ticket,
        body: "I am angry and this bug broke production for our enterprise team",
      }),
    ).toMatchObject({ category: "bug", sentiment: "angry", highValue: true });
  });

  it("uses confidence gates to decide auto-answer, suggest, or escalate", () => {
    const auto = decideTicket(ticket, articles, { autoReplyThreshold: 0.82 });
    const escalate = decideTicket(
      {
        ...ticket,
        body: "I am angry and this broke production",
        customer: { ...ticket.customer, plan: "enterprise" },
      },
      articles,
      { autoReplyThreshold: 0.82 },
    );

    expect(auto.action).toBe("auto-answer");
    expect(auto.reply?.body).toContain("Refunds are available within 14 days");
    expect(escalate.action).toBe("escalate");
  });

  it("runs ticket_triage and records the decision", async () => {
    const runtime = await open();

    const decision = await runtime.handleTicket({
      ticket,
      articles,
      policy: { autoReplyThreshold: 0.82 },
    });

    expect(decision.play).toBe("ticket_triage");
    expect(decision.action).toBe("auto-answer");
    expect(decision.eventId).toEqual(expect.any(String));
    await expect(readSupportDeflectorDebug(root)).resolves.toEqual(expect.any(Array));
  });

  it("requires tenant context before persistent operations", async () => {
    const runtime = await open();

    await expect(
      runtime.handleTicket({
        ticket: { ...ticket, tenantId: "" },
        articles,
        policy: { autoReplyThreshold: 0.82 },
      }),
    ).rejects.toMatchObject({
      capability: "support-deflector",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("keeps ticket triage as SKILL.md instead of a new workflow format", async () => {
    const skill = await readFile(join(process.cwd(), "plays", "ticket_triage", "SKILL.md"), "utf8");
    const play = parsePlayMarkdown(skill);

    expect(play.meta).toMatchObject({ name: "ticket_triage", kind: "play" });
    expect(play.requiredSkills).toContain("knowledge_base.search");
    expect(play.subAgents.map((agent) => agent.role)).toContain("support_triager");
  });
});
