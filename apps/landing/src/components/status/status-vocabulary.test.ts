import { describe, expect, it } from "vitest";
import {
  buildPastIncidentDays,
  buildUptimeSeries,
  PAST_INCIDENT_DAYS,
  UPTIME_WINDOW_DAYS,
} from "./status-vocabulary";

describe("buildUptimeSeries", () => {
  it("returns exactly 90 days and only colors today from the live probe without history", () => {
    const now = new Date("2026-07-31T15:00:00.000Z");
    const series = buildUptimeSeries("degraded", {}, now);

    expect(series).toHaveLength(UPTIME_WINDOW_DAYS);
    expect(series[series.length - 1]).toMatchObject({
      date: "2026-07-31",
      isToday: true,
      status: "degraded",
    });
    expect(series.slice(0, -1).every((day) => day.status === "no_data")).toBe(true);
    expect(series[0]?.date).toBe("2026-05-03");
  });

  it("never fabricates historical operational days from a live green probe", () => {
    const series = buildUptimeSeries("operational", {}, new Date("2026-07-31T00:00:00.000Z"));
    const historicalOperational = series.filter(
      (day) => !day.isToday && day.status === "operational",
    );
    expect(historicalOperational).toHaveLength(0);
  });

  it("paints stored history on past days while live state owns today", () => {
    const now = new Date("2026-07-31T12:00:00.000Z");
    const series = buildUptimeSeries(
      "operational",
      {
        "2026-07-30": "outage",
        "2026-07-29": "degraded",
      },
      now,
    );

    expect(series.find((d) => d.date === "2026-07-30")?.status).toBe("outage");
    expect(series.find((d) => d.date === "2026-07-29")?.status).toBe("degraded");
    expect(series.find((d) => d.date === "2026-07-31")?.status).toBe("operational");
  });
});

describe("buildPastIncidentDays", () => {
  it("returns the most recent 14 UTC calendar days newest-first", () => {
    const days = buildPastIncidentDays(new Date("2026-07-31T12:00:00.000Z"));
    expect(days).toHaveLength(PAST_INCIDENT_DAYS);
    expect(days[0]).toBe("2026-07-31");
    expect(days[13]).toBe("2026-07-18");
  });
});
