// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskRecord, UploadDocumentAndCreateTaskResult } from "@/lib/api/document-upload-task";
import { DocumentTaskUploader } from "../document-task-uploader";

vi.mock("@nebutra/auth/client", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-token"),
  }),
}));

function makeFile(name = "strategy.md") {
  return new File(["markdown"], name, { type: "text/markdown" });
}

function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(ui: ReactElement) {
  const client = makeTestClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function makeUploadResult(overrides: Partial<TaskRecord> = {}): UploadDocumentAndCreateTaskResult {
  const task: TaskRecord = {
    id: "task_1",
    type: "document.parse",
    status: "queued",
    progress: 0,
    queue: "document",
    priority: "normal",
    metadata: {},
    result: null,
    error: null,
    dispatcher_provider: "celery",
    provider_job_id: "celery-1",
    created_at: "2026-06-04T09:01:00.000Z",
    updated_at: "2026-06-04T09:01:00.000Z",
    started_at: null,
    completed_at: null,
    ...overrides,
  };

  return {
    upload: {
      id: "upload_1",
      status: "completed",
      provider: "r2",
      bucket: "nebutra-uploads",
      key: "tenants/org_1/uploads/upload_1/raw/strategy.md",
      filename: "strategy.md",
      content_type: "text/markdown",
      size: 8,
      metadata: {},
      presigned_upload: null,
      etag: "etag-1",
      checksum_sha256: null,
      created_at: "2026-06-04T09:00:00.000Z",
      updated_at: "2026-06-04T09:01:00.000Z",
      completed_at: "2026-06-04T09:01:00.000Z",
    },
    task,
  };
}

afterEach(() => {
  cleanup();
});

describe("DocumentTaskUploader", () => {
  it("submits the selected file and surfaces the queued document task", async () => {
    const uploadResult = makeUploadResult();
    const onUpload = vi.fn().mockResolvedValue(uploadResult);
    const onGetTask = vi.fn().mockResolvedValue(uploadResult.task);

    renderWithClient(<DocumentTaskUploader onUpload={onUpload} onGetTask={onGetTask} />);

    fireEvent.change(screen.getByLabelText("Document file"), {
      target: { files: [makeFile()] },
    });
    expect(screen.getByText("strategy.md")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start parse task" }));

    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith({
        file: expect.any(File),
        metadata: { source: "workspace" },
      }),
    );
    expect(await screen.findByText("task_1")).toBeTruthy();
    expect(screen.getByText("tenants/org_1/uploads/upload_1/raw/strategy.md")).toBeTruthy();
    await waitFor(() => expect(onGetTask).toHaveBeenCalledWith("task_1"));
  });

  it("refreshes task status and lets the user cancel a running task", async () => {
    const runningTask = makeUploadResult({
      status: "running",
      progress: 35,
      started_at: "2026-06-04T09:02:00.000Z",
      updated_at: "2026-06-04T09:02:00.000Z",
    }).task;
    const cancelledTask = makeUploadResult({
      status: "cancelled",
      progress: 35,
      completed_at: "2026-06-04T09:03:00.000Z",
      updated_at: "2026-06-04T09:03:00.000Z",
    }).task;
    const onUpload = vi.fn().mockResolvedValue(makeUploadResult());
    const onGetTask = vi.fn().mockResolvedValue(runningTask);
    const onCancelTask = vi.fn().mockResolvedValue(cancelledTask);

    renderWithClient(
      <DocumentTaskUploader
        onUpload={onUpload}
        onGetTask={onGetTask}
        onCancelTask={onCancelTask}
      />,
    );

    fireEvent.change(screen.getByLabelText("Document file"), {
      target: { files: [makeFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start parse task" }));

    expect(await screen.findByText("Running")).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Task progress" }).getAttribute("aria-valuenow"),
    ).toBe("35");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(onCancelTask).toHaveBeenCalledWith("task_1"));
    expect(await screen.findByText("Cancelled")).toBeTruthy();
  });

  it("does not start a second document upload while the first task is pending", async () => {
    const pendingUpload = deferred<ReturnType<typeof makeUploadResult>>();
    const onUpload = vi.fn(() => pendingUpload.promise);

    renderWithClient(<DocumentTaskUploader onUpload={onUpload} />);

    fireEvent.change(screen.getByLabelText("Document file"), {
      target: { files: [makeFile()] },
    });
    const submitButton = screen.getByRole("button", { name: "Start parse task" });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));

    pendingUpload.resolve(makeUploadResult());
    expect(await screen.findByText("task_1")).toBeTruthy();
  });

  it("keeps the selected file stable while the upload mutation is pending", async () => {
    const pendingUpload = deferred<ReturnType<typeof makeUploadResult>>();
    const onUpload = vi.fn(() => pendingUpload.promise);

    renderWithClient(<DocumentTaskUploader onUpload={onUpload} />);

    const input = screen.getByLabelText("Document file");
    fireEvent.change(input, {
      target: { files: [makeFile("strategy.md")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start parse task" }));

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));

    fireEvent.change(input, {
      target: { files: [makeFile("second.md")] },
    });

    expect(screen.getByText("strategy.md")).toBeTruthy();
    expect(screen.queryByText("second.md")).toBeNull();

    pendingUpload.resolve(makeUploadResult());
    expect(await screen.findByText("task_1")).toBeTruthy();
  });
});
