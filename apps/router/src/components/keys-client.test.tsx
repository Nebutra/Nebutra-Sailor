import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KeysClient } from "@/components/keys-client";
import type { ApiKeyRow } from "@/lib/console-api";
import { ConsoleError } from "@/lib/console-client";

/**
 * The defects this file pins are all the same defect wearing different hats:
 * the console used to draw a screen that did not correspond to what the server
 * said. A refusal drew as "you have no keys"; a failed rename drew as a
 * successful one; one key's mutation greyed out every other key's buttons.
 *
 * The boundary mocked here is `@/lib/console-api` — the last layer before the
 * network. Everything above it (the resource hook, the four-state renderer,
 * the optimistic write and its rollback) is the code under test and runs for
 * real.
 */

const listKeys = vi.fn();
const patchKey = vi.fn();
const revokeKey = vi.fn();
const createKey = vi.fn();

vi.mock("@/lib/console-api", () => ({
  consoleApi: {
    listKeys: (...args: unknown[]) => listKeys(...args),
    patchKey: (...args: unknown[]) => patchKey(...args),
    revokeKey: (...args: unknown[]) => revokeKey(...args),
    createKey: (...args: unknown[]) => createKey(...args),
  },
  usageExportHref: () => "/api/console/v1/usage/export",
}));

function keyRow(overrides: Partial<ApiKeyRow> & { id: string; name: string }): ApiKeyRow {
  return {
    keyPrefix: `sk-sailor-${overrides.id}`,
    scopes: ["models:*"],
    status: "active",
    rateLimitRps: 10,
    saveLogs: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    lastUsedAt: null,
    expiresAt: null,
    limits: { total: null, daily: null },
    cost: { daily: 0, total: 0 },
    ...overrides,
  };
}

/** Scope queries to the table row that mentions `name`. */
function row(name: string) {
  const found = screen
    .getAllByRole("row")
    .find((candidate) => candidate.textContent?.includes(name));
  if (!found) throw new Error(`no row mentioning ${name}`);
  return within(found);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KeysClient — a refusal is not an empty result", () => {
  it("renders an error with a retry when the list is forbidden, and never the empty state", async () => {
    listKeys.mockRejectedValue(new ConsoleError("当前账号没有这个操作的权限。", 403));
    render(<KeysClient />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("这块内容没能加载出来");
    expect(alert).toHaveTextContent("当前账号没有这个操作的权限。");
    expect(within(alert).getByRole("button", { name: "重试" })).toBeInTheDocument();
    // The exact bug: "no keys" shown to an account that was refused.
    expect(screen.queryByText("这个账号下还没有 Key")).not.toBeInTheDocument();
  });

  it("re-runs the load when retry is pressed", async () => {
    listKeys.mockRejectedValueOnce(new ConsoleError("服务端出错了（HTTP 500）。", 500));
    listKeys.mockResolvedValueOnce([keyRow({ id: "k1", name: "alpha" })]);
    render(<KeysClient />);

    fireEvent.click(await screen.findByRole("button", { name: "重试" }));

    expect(await screen.findByText("alpha")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(listKeys).toHaveBeenCalledTimes(2);
  });

  it("renders the empty state, not an alert, when the account really has no keys", async () => {
    listKeys.mockResolvedValue([]);
    render(<KeysClient />);

    expect(await screen.findByText("这个账号下还没有 Key")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a skeleton, not an empty state, while the first load is in flight", async () => {
    const gate = deferred<ApiKeyRow[]>();
    listKeys.mockReturnValue(gate.promise);
    const { container } = render(<KeysClient />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("这个账号下还没有 Key")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    gate.resolve([]);
    expect(await screen.findByText("这个账号下还没有 Key")).toBeInTheDocument();
  });
});

describe("KeysClient — an optimistic write that fails rolls back and says so", () => {
  it("restores the previous row and shows a failure notice when disable is refused", async () => {
    listKeys.mockResolvedValue([
      keyRow({ id: "k1", name: "alpha" }),
      keyRow({ id: "k2", name: "beta" }),
    ]);
    patchKey.mockRejectedValue(new ConsoleError("当前状态无法执行这个操作。", 409));
    render(<KeysClient />);
    await screen.findByText("alpha");

    fireEvent.click(row("alpha").getByRole("button", { name: "停用" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("当前状态无法执行这个操作。");
    // Rolled back: the row is active again and still offers 停用, not 启用.
    expect(row("alpha").getByRole("button", { name: "停用" })).toBeInTheDocument();
    expect(row("alpha").getByText("启用中")).toBeInTheDocument();
    expect(row("beta").getByText("启用中")).toBeInTheDocument();
  });

  it("marks only the acted-on row as pending, not the whole table", async () => {
    listKeys.mockResolvedValue([
      keyRow({ id: "k1", name: "alpha" }),
      keyRow({ id: "k2", name: "beta" }),
    ]);
    const gate = deferred<ApiKeyRow>();
    patchKey.mockReturnValue(gate.promise);
    render(<KeysClient />);
    await screen.findByText("alpha");

    fireEvent.click(row("alpha").getByRole("button", { name: "停用" }));

    // alpha is busy…
    expect(row("alpha").getByRole("button", { name: "启用" })).toBeDisabled();
    expect(row("alpha").getByRole("button", { name: "吊销 alpha" })).toBeDisabled();
    // …and beta is not. This is the "one loading boolean for the whole table" bug.
    expect(row("beta").getByRole("button", { name: "停用" })).toBeEnabled();
    expect(row("beta").getByRole("button", { name: "吊销 beta" })).toBeEnabled();

    gate.resolve(keyRow({ id: "k1", name: "alpha", status: "disabled" }));
    await waitFor(() => expect(row("alpha").getByRole("button", { name: "启用" })).toBeEnabled());
  });

  it("keeps the server's version of the row when the patch succeeds", async () => {
    listKeys.mockResolvedValue([keyRow({ id: "k1", name: "alpha" })]);
    patchKey.mockResolvedValue(keyRow({ id: "k1", name: "alpha", status: "disabled" }));
    render(<KeysClient />);
    await screen.findByText("alpha");

    fireEvent.click(row("alpha").getByRole("button", { name: "停用" }));

    await waitFor(() => expect(row("alpha").getByText("已停用")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("KeysClient — revoking is confirmed before it happens", () => {
  it("does not call the API until the confirmation is accepted", async () => {
    listKeys.mockResolvedValue([keyRow({ id: "k1", name: "alpha" })]);
    revokeKey.mockResolvedValue(undefined);
    render(<KeysClient />);
    await screen.findByText("alpha");

    fireEvent.click(row("alpha").getByRole("button", { name: "吊销 alpha" }));

    // The dialog is up and nothing has been destroyed yet.
    expect(await screen.findByText("吊销 alpha")).toBeInTheDocument();
    expect(revokeKey).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认吊销" }));
    await waitFor(() => expect(revokeKey).toHaveBeenCalledWith("k1"));
  });

  it("does not revoke when the confirmation is cancelled", async () => {
    listKeys.mockResolvedValue([keyRow({ id: "k1", name: "alpha" })]);
    render(<KeysClient />);
    await screen.findByText("alpha");

    fireEvent.click(row("alpha").getByRole("button", { name: "吊销 alpha" }));
    fireEvent.click(await screen.findByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "确认吊销" })).toBeNull());
    expect(revokeKey).not.toHaveBeenCalled();
  });

  it("puts the row back when the revocation itself is refused", async () => {
    listKeys.mockResolvedValue([keyRow({ id: "k1", name: "alpha" })]);
    revokeKey.mockRejectedValue(new ConsoleError("当前账号没有这个操作的权限。", 403));
    render(<KeysClient />);
    await screen.findByText("alpha");

    fireEvent.click(row("alpha").getByRole("button", { name: "吊销 alpha" }));
    fireEvent.click(await screen.findByRole("button", { name: "确认吊销" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("当前账号没有这个操作的权限。");
    // The optimistic removal is undone — the key is still there, because it
    // still exists on the server.
    expect(screen.getByText("alpha")).toBeInTheDocument();
  });
});
