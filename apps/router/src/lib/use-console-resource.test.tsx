import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsoleError } from "@/lib/console-client";
import { useConsoleResource } from "@/lib/use-console-resource";

/**
 * The hook every console panel loads through.
 *
 * `createRequestLane` is already unit-tested in `console-client.test.ts`; what
 * is not covered there is the thing that actually bit us — a superseded load
 * resolving last and overwriting the state that a newer load already wrote.
 * The abort signal alone does not prevent it, because a loader is free to
 * ignore its signal (any `fetch` already in the response-parsing phase does).
 * So the hook also has to drop the result, and that is what is pinned here.
 */

function Probe({
  loadKey,
  load,
}: {
  loadKey: string;
  load: (signal: AbortSignal) => Promise<string>;
}) {
  const { resource, reload } = useConsoleResource<string>(loadKey, load);
  return (
    <div>
      <p data-status={resource.status}>{resource.status}</p>
      <p>{resource.data === null ? "no-data" : `data:${resource.data}`}</p>
      <p>{resource.error ?? "no-error"}</p>
      <button type="button" onClick={reload}>
        重新加载
      </button>
    </div>
  );
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

describe("useConsoleResource", () => {
  it("starts in loading with no data and no error", () => {
    render(<Probe loadKey="a" load={() => new Promise(() => {})} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.getByText("no-data")).toBeInTheDocument();
    expect(screen.getByText("no-error")).toBeInTheDocument();
  });

  it("moves to error, not to empty data, when the load is refused", async () => {
    render(
      <Probe
        loadKey="a"
        load={() => Promise.reject(new ConsoleError("当前账号没有这个操作的权限。", 403))}
      />,
    );
    expect(await screen.findByText("error")).toBeInTheDocument();
    expect(screen.getByText("当前账号没有这个操作的权限。")).toBeInTheDocument();
    expect(screen.getByText("no-data")).toBeInTheDocument();
  });

  it("aborts the in-flight load when the key changes", async () => {
    const signals: AbortSignal[] = [];
    const load = (signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(() => {});
    };
    const { rerender } = render(<Probe loadKey="a" load={load} />);
    rerender(<Probe loadKey="b" load={load} />);

    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("a superseded load cannot overwrite the newer result, even resolving last", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    // Both loaders ignore their signal, which is exactly the case an
    // AbortController does not cover.
    const { rerender } = render(<Probe loadKey="a" load={() => first.promise} />);
    rerender(<Probe loadKey="b" load={() => second.promise} />);

    second.resolve("second");
    expect(await screen.findByText("data:second")).toBeInTheDocument();

    first.resolve("first");
    await first.promise;
    await waitFor(() => expect(screen.getByText("data:second")).toBeInTheDocument());
    expect(screen.queryByText("data:first")).not.toBeInTheDocument();
  });

  it("a superseded load that fails cannot paint an error over the newer result", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const { rerender } = render(<Probe loadKey="a" load={() => first.promise} />);
    rerender(<Probe loadKey="b" load={() => second.promise} />);

    second.resolve("second");
    expect(await screen.findByText("data:second")).toBeInTheDocument();

    first.reject(new ConsoleError("服务端出错了（HTTP 500）。", 500));
    await first.promise.catch(() => undefined);
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(screen.getByText("no-error")).toBeInTheDocument();
  });
});
