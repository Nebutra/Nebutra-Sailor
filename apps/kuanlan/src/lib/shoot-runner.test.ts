import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  shootWithImage2: vi.fn(),
  composeIdPhoto: vi.fn(),
  persistIdPhotoMoment: vi.fn(),
  refundShootCredits: vi.fn(),
  markShootRunning: vi.fn(),
  setShootProgress: vi.fn(),
  succeedShoot: vi.fn(),
  failShoot: vi.fn(),
}));

vi.mock("./image2", () => ({
  shootWithImage2: deps.shootWithImage2,
  idPhotoShootBrief: () => "brief",
  image2SizeForSku: () => "1024x1024",
}));
vi.mock("./id-photo", () => ({ composeIdPhoto: deps.composeIdPhoto }));
vi.mock("./resources.server", () => ({ persistIdPhotoMoment: deps.persistIdPhotoMoment }));
vi.mock("./credits", () => ({ refundShootCredits: deps.refundShootCredits }));
vi.mock("./shoots", () => ({
  markShootRunning: deps.markShootRunning,
  setShootProgress: deps.setShootProgress,
  succeedShoot: deps.succeedShoot,
  failShoot: deps.failShoot,
}));

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() };

function input() {
  return {
    db: {} as never,
    tenantId: "t1",
    userId: "u1",
    taskId: "task1",
    print: { id: "linkedin-smoke", sizeId: "linkedin" } as never,
    source: Buffer.from("face"),
    mimeType: "image/jpeg",
    log: log as never,
  };
}

describe("the shoot worker", () => {
  beforeEach(() => {
    for (const fn of Object.values(deps)) fn.mockReset();
    for (const fn of Object.values(log)) fn.mockReset();
    deps.markShootRunning.mockResolvedValue({});
    deps.setShootProgress.mockResolvedValue(undefined);
    deps.refundShootCredits.mockResolvedValue({ refunded: true, balanceAfter: 1500 });
    deps.failShoot.mockResolvedValue({});
  });

  it("marks the row running, ticks progress, and closes it succeeded with the print", async () => {
    deps.shootWithImage2.mockResolvedValue(Buffer.from("frame"));
    deps.composeIdPhoto.mockResolvedValue({
      png: Buffer.from("png"),
      width: 472,
      height: 591,
      dpi: 300,
    });
    deps.persistIdPhotoMoment.mockResolvedValue({ key: "k/task1.png", url: "u" });
    const { runShoot } = await import("./shoot-runner");

    await runShoot(input());

    expect(deps.markShootRunning).toHaveBeenCalledWith({}, "task1");
    expect(deps.setShootProgress.mock.calls.map((c) => c[2])).toEqual([60, 85]);
    expect(deps.persistIdPhotoMoment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task1" }),
    );
    expect(deps.succeedShoot).toHaveBeenCalledWith({}, "task1", {
      key: "k/task1.png",
      width: 472,
      height: 591,
      dpi: 300,
    });
    expect(deps.failShoot).not.toHaveBeenCalled();
    expect(deps.refundShootCredits).not.toHaveBeenCalled();
  });

  it("records the step it died at and refunds when the router fails", async () => {
    deps.shootWithImage2.mockRejectedValue(Object.assign(new Error("40s"), { name: "Timeout" }));
    const { runShoot } = await import("./shoot-runner");

    await runShoot(input());

    expect(deps.failShoot).toHaveBeenCalledWith({}, "task1", {
      step: "router",
      name: "Timeout",
      message: "40s",
    });
    expect(deps.refundShootCredits).toHaveBeenCalledWith("t1", "task1", "shoot failed at router");
    expect(deps.succeedShoot).not.toHaveBeenCalled();
  });

  it("names compose and store as their own steps", async () => {
    deps.shootWithImage2.mockResolvedValue(Buffer.from("frame"));
    deps.composeIdPhoto.mockRejectedValue(
      Object.assign(new Error("no face"), { name: "InvalidPortraitError" }),
    );
    const { runShoot } = await import("./shoot-runner");
    await runShoot(input());
    expect(deps.failShoot.mock.calls[0]?.[2]).toMatchObject({ step: "compose" });

    deps.failShoot.mockClear();
    deps.composeIdPhoto.mockResolvedValue({
      png: Buffer.from("png"),
      width: 1,
      height: 1,
      dpi: 300,
    });
    deps.persistIdPhotoMoment.mockRejectedValue(new Error("r2 down"));
    await runShoot(input());
    expect(deps.failShoot.mock.calls[0]?.[2]).toMatchObject({ step: "store" });
  });

  it("never throws out — a failure while recording the failure is logged, not raised", async () => {
    deps.shootWithImage2.mockRejectedValue(new Error("boom"));
    deps.failShoot.mockRejectedValue(new Error("db also down"));
    deps.refundShootCredits.mockRejectedValue(new Error("ledger down"));
    const { runShoot } = await import("./shoot-runner");

    await expect(runShoot(input())).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledWith(
      "could not record the failure",
      expect.any(Error),
      expect.anything(),
    );
    expect(log.error).toHaveBeenCalledWith(
      "could not refund the shoot",
      expect.any(Error),
      expect.anything(),
    );
  });

  it("truncates a long error message so the row cannot swallow a dump", async () => {
    deps.shootWithImage2.mockRejectedValue(new Error("x".repeat(2000)));
    const { runShoot } = await import("./shoot-runner");
    await runShoot(input());
    expect((deps.failShoot.mock.calls[0]?.[2] as { message: string }).message).toHaveLength(500);
  });
});
