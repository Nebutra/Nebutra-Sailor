// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentTaskUploader } from "../document-task-uploader";

vi.mock("@nebutra/auth/client", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-token"),
  }),
}));

function makeFile() {
  return new File(["markdown"], "strategy.md", { type: "text/markdown" });
}

describe("DocumentTaskUploader", () => {
  it("submits the selected file and surfaces the queued document task", async () => {
    const onUpload = vi.fn().mockResolvedValue({
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
      task: {
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
      },
    });

    render(<DocumentTaskUploader onUpload={onUpload} />);

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
  });
});
