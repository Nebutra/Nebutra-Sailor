import { afterEach, describe, expect, it } from "vitest";
import {
  clearScheduledJobs,
  getScheduledJob,
  listScheduledJobs,
  registerScheduledJob,
  type ScheduledJob,
} from "../scheduler.js";

const noopJob = (overrides?: Partial<ScheduledJob>): ScheduledJob => ({
  name: "test.job",
  cron: "0 * * * *",
  handler: async () => ({ ok: true }),
  ...overrides,
});

describe("scheduler registry", () => {
  afterEach(() => {
    clearScheduledJobs();
  });

  it("registers and retrieves a job by name", () => {
    const job = noopJob({ name: "alpha", cron: "*/5 * * * *" });
    registerScheduledJob(job);

    const fetched = getScheduledJob("alpha");
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe("alpha");
    expect(fetched?.cron).toBe("*/5 * * * *");
  });

  it("returns undefined for unknown job names", () => {
    expect(getScheduledJob("does-not-exist")).toBeUndefined();
  });

  it("lists every registered job (snapshot, not live reference)", () => {
    registerScheduledJob(noopJob({ name: "alpha" }));
    registerScheduledJob(noopJob({ name: "beta" }));

    const list = listScheduledJobs();
    expect(list).toHaveLength(2);
    const names = list.map((j) => j.name).sort();
    expect(names).toEqual(["alpha", "beta"]);

    // Mutating the snapshot does NOT affect the registry.
    list.pop();
    expect(listScheduledJobs()).toHaveLength(2);
  });

  it("re-registering overwrites the previous entry", () => {
    registerScheduledJob(noopJob({ name: "alpha", cron: "0 * * * *" }));
    registerScheduledJob(noopJob({ name: "alpha", cron: "0 0 * * *" }));

    expect(listScheduledJobs()).toHaveLength(1);
    expect(getScheduledJob("alpha")?.cron).toBe("0 0 * * *");
  });

  it("rejects malformed registrations", () => {
    expect(() =>
      registerScheduledJob({ name: "", cron: "0 * * * *", handler: async () => ({ ok: true }) }),
    ).toThrow(/non-empty/);

    expect(() =>
      registerScheduledJob({ name: "x", cron: "", handler: async () => ({ ok: true }) }),
    ).toThrow(/non-empty/);

    expect(() =>
      registerScheduledJob({
        name: "x",
        cron: "0 * * * *",
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
        handler: undefined as any,
      }),
    ).toThrow(/function/);
  });

  it("invokes the registered handler when called", async () => {
    let calls = 0;
    registerScheduledJob({
      name: "counted",
      cron: "0 * * * *",
      handler: async () => {
        calls += 1;
        return { ok: true, details: { calls } };
      },
    });

    const job = getScheduledJob("counted");
    expect(job).toBeDefined();
    const result = await job?.handler();
    expect(result?.ok).toBe(true);
    expect(result?.details).toEqual({ calls: 1 });
  });
});
