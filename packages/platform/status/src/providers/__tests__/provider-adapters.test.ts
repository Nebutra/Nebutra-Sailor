import { afterEach, describe, expect, it, vi } from "vitest";
import { createStatusProvider } from "../../provider";
import { BetterstackStatusProvider } from "../betterstack";
import { InstatusStatusProvider } from "../instatus";
import { OpenStatusProvider } from "../openstatus";
import { AtlassianStatuspageProvider } from "../statuspage";

function stubJsonFetch(payload: unknown, assertUrl?: (url: string) => void) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assertUrl?.(url);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

describe("createStatusProvider factory", () => {
  it("defaults to OpenStatus when provider is omitted", () => {
    expect(createStatusProvider({ pageSlug: "nebutra" })).toBeInstanceOf(OpenStatusProvider);
  });

  it("selects Statuspage / Better Stack / Instatus by provider field", () => {
    expect(createStatusProvider({ provider: "statuspage", pageId: "abc" })).toBeInstanceOf(
      AtlassianStatuspageProvider,
    );
    expect(
      createStatusProvider({ provider: "betterstack", pageUrl: "https://status.example.com" }),
    ).toBeInstanceOf(BetterstackStatusProvider);
    expect(
      createStatusProvider({ provider: "instatus", pageUrl: "https://status.example.com" }),
    ).toBeInstanceOf(InstatusStatusProvider);
  });
});

describe("BetterstackStatusProvider transform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps resources, skips resolved reports, and hits /index.json", async () => {
    stubJsonFetch(
      {
        data: {
          id: "1",
          type: "status_page",
          attributes: {
            company_name: "Acme",
            subdomain: "acme",
            custom_domain: "status.acme.com",
            aggregate_state: "degraded",
            updated_at: "2026-07-30T00:00:00.000Z",
          },
        },
        included: [
          {
            id: "r1",
            type: "status_page_resource",
            attributes: {
              public_name: "API",
              status: "degraded",
              availability: 0.995,
              explanation: "Elevated latency",
              status_history: [
                {
                  day: "2026-07-29",
                  status: "degraded",
                  downtime_duration: 0,
                  maintenance_duration: 0,
                },
                {
                  day: "2026-07-30",
                  status: "operational",
                  downtime_duration: 0,
                  maintenance_duration: 0,
                },
              ],
            },
          },
          {
            id: "rep-open",
            type: "status_report",
            attributes: {
              title: "API slow",
              report_type: "manual",
              aggregate_state: "investigating",
              starts_at: "2026-07-30T01:00:00.000Z",
              ends_at: null,
              affected_resources: [],
            },
          },
          {
            id: "rep-done",
            type: "status_report",
            attributes: {
              title: "Past outage",
              report_type: "manual",
              aggregate_state: "resolved",
              starts_at: "2026-07-01T00:00:00.000Z",
              ends_at: "2026-07-01T02:00:00.000Z",
              affected_resources: [],
            },
          },
          {
            id: "maint-1",
            type: "status_report",
            attributes: {
              title: "DB upgrade",
              report_type: "maintenance",
              aggregate_state: "scheduled",
              starts_at: "2026-08-01T00:00:00.000Z",
              ends_at: "2026-08-01T02:00:00.000Z",
              affected_resources: [],
            },
          },
        ],
      },
      (url) => {
        expect(url).toBe("https://status.acme.com/index.json");
      },
    );

    const provider = new BetterstackStatusProvider({
      provider: "betterstack",
      pageUrl: "https://status.acme.com",
    });
    const summary = await provider.fetchSummary();

    expect(summary.status).toBe("degraded");
    expect(summary.pageUrl).toBe("https://status.acme.com");
    expect(summary.monitors).toHaveLength(1);
    expect(summary.monitors[0]).toMatchObject({
      name: "API",
      status: "degraded",
      uptime: 99.5,
    });
    expect(summary.activeIncidents).toHaveLength(1);
    expect(summary.activeIncidents[0]?.title).toBe("API slow");
    expect(summary.scheduledMaintenances).toHaveLength(1);
    expect(summary.scheduledMaintenances[0]?.title).toBe("DB upgrade");
    expect(summary.uptime.last24h).toBeGreaterThan(0);
  });

  it("resolves bare Better Uptime subdomains", async () => {
    stubJsonFetch(
      {
        data: {
          id: "1",
          type: "status_page",
          attributes: { aggregate_state: "operational", updated_at: "2026-07-30T00:00:00.000Z" },
        },
        included: [],
      },
      (url) => {
        expect(url).toBe("https://acme.betteruptime.com/index.json");
      },
    );

    const provider = new BetterstackStatusProvider({
      provider: "betterstack",
      pageUrl: "acme",
    });
    const summary = await provider.fetchSummary();
    expect(summary.status).toBe("operational");
  });
});

describe("InstatusStatusProvider transform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps page/incidents/maintenances from summary.json", async () => {
    stubJsonFetch(
      {
        page: {
          name: "Acme",
          url: "https://status.acme.com",
          status: "HASISSUES",
        },
        activeIncidents: [
          {
            name: "API issue",
            started: "Sat Jun 11 2022 18:55:50 GMT+0000 (Coordinated Universal Time)",
            status: "INVESTIGATING",
            impact: "MAJOROUTAGE",
            url: "https://status.acme.com/incident/1",
          },
        ],
        activeMaintenances: [
          {
            name: "Database maintenance",
            start: "2026-08-01T00:00:00.000Z",
            status: "NOTSTARTEDYET",
            duration: "60",
            url: "https://status.acme.com/maintenance/1",
          },
        ],
        components: [
          { id: "c1", name: "API", status: "MAJOROUTAGE" },
          { id: "c2", name: "Web", status: "OPERATIONAL" },
        ],
      },
      (url) => {
        expect(url).toBe("https://status.acme.com/summary.json");
      },
    );

    const provider = new InstatusStatusProvider({
      provider: "instatus",
      pageUrl: "https://status.acme.com",
    });
    const summary = await provider.fetchSummary();

    expect(summary.status).toBe("degraded");
    expect(summary.pageUrl).toBe("https://status.acme.com");
    expect(summary.monitors).toHaveLength(2);
    expect(summary.monitors[0]?.status).toBe("major_outage");
    expect(summary.activeIncidents).toHaveLength(1);
    expect(summary.activeIncidents[0]).toMatchObject({
      title: "API issue",
      status: "investigating",
      impact: "major",
      shortlink: "https://status.acme.com/incident/1",
    });
    expect(summary.scheduledMaintenances).toHaveLength(1);
    expect(summary.scheduledMaintenances[0]?.status).toBe("scheduled");
    expect(summary.scheduledMaintenances[0]?.scheduledUntil).toBe("2026-08-01T01:00:00.000Z");
  });

  it("resolves bare Instatus subdomains and UP page status", async () => {
    stubJsonFetch(
      {
        page: { name: "Acme", url: "https://acme.instatus.com", status: "UP" },
      },
      (url) => {
        expect(url).toBe("https://acme.instatus.com/summary.json");
      },
    );

    const provider = new InstatusStatusProvider({
      provider: "instatus",
      pageUrl: "acme",
    });
    const summary = await provider.fetchSummary();
    expect(summary.status).toBe("operational");
    expect(summary.activeIncidents).toEqual([]);
  });
});
