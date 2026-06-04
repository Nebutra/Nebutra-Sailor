import type { Client } from "openapi-fetch";
import { describe, expect, it, vi } from "vitest";
import { type DocumentUploadTaskError, uploadDocumentAndCreateTask } from "../document-upload-task";
import type { paths } from "../types.generated";

function makeFile() {
  const blob = new Blob([new Uint8Array(1024)], { type: "application/pdf" });
  return new File([blob], "Quarterly Plan.pdf", { type: "application/pdf" });
}

describe("uploadDocumentAndCreateTask", () => {
  it("presigns, uploads to object storage, completes metadata, then creates a document.parse task", async () => {
    const file = makeFile();
    const calls: string[] = [];
    const post = vi.fn(async (path: string, init?: { body?: unknown }) => {
      calls.push(path);

      if (path === "/api/v1/uploads/presign") {
        expect(init?.body).toEqual({
          filename: "Quarterly Plan.pdf",
          content_type: "application/pdf",
          size: 1024,
          metadata: { source: "workspace" },
          idempotency_key: "upload-once",
        });
        return {
          data: {
            id: "upload_1",
            status: "pending",
            provider: "r2",
            bucket: "nebutra-uploads",
            key: "tenants/org_1/uploads/upload_1/raw/Quarterly_Plan.pdf",
            filename: "Quarterly Plan.pdf",
            content_type: "application/pdf",
            size: 1024,
            metadata: { source: "workspace" },
            presigned_upload: {
              url: "https://uploads.example/upload_1",
              method: "PUT",
              headers: { "Content-Type": "application/pdf" },
              expires_at: "2026-06-04T10:00:00.000Z",
            },
            etag: null,
            checksum_sha256: null,
            created_at: "2026-06-04T09:00:00.000Z",
            updated_at: "2026-06-04T09:00:00.000Z",
            completed_at: null,
          },
        };
      }

      if (path === "/api/v1/uploads/complete") {
        expect(init?.body).toEqual({
          upload_id: "upload_1",
          size: 1024,
          etag: "etag-1",
        });
        return {
          data: {
            id: "upload_1",
            status: "completed",
            provider: "r2",
            bucket: "nebutra-uploads",
            key: "tenants/org_1/uploads/upload_1/raw/Quarterly_Plan.pdf",
            filename: "Quarterly Plan.pdf",
            content_type: "application/pdf",
            size: 1024,
            metadata: { source: "workspace" },
            presigned_upload: null,
            etag: "etag-1",
            checksum_sha256: null,
            created_at: "2026-06-04T09:00:00.000Z",
            updated_at: "2026-06-04T09:01:00.000Z",
            completed_at: "2026-06-04T09:01:00.000Z",
          },
        };
      }

      if (path === "/api/v1/tasks") {
        expect(init?.body).toMatchObject({
          type: "document.parse",
          payload: {
            uploadId: "upload_1",
            provider: "r2",
            bucket: "nebutra-uploads",
            key: "tenants/org_1/uploads/upload_1/raw/Quarterly_Plan.pdf",
            filename: "Quarterly Plan.pdf",
            contentType: "application/pdf",
            size: 1024,
          },
          idempotency_key: "task-once",
          queue: "document",
          priority: "normal",
        });
        return {
          data: {
            id: "task_1",
            type: "document.parse",
            status: "queued",
            progress: 0,
            queue: "document",
            priority: "normal",
            metadata: { source: "workspace" },
            result: null,
            error: null,
            dispatcher_provider: "celery",
            provider_job_id: "celery-1",
            created_at: "2026-06-04T09:01:00.000Z",
            updated_at: "2026-06-04T09:01:00.000Z",
            started_at: null,
            completed_at: null,
          },
        };
      }

      throw new Error(`unexpected path ${path}`);
    });
    const uploadFetch = vi.fn(
      async () => new Response(null, { status: 200, headers: { etag: "etag-1" } }),
    );

    const result = await uploadDocumentAndCreateTask({
      apiClient: { POST: post } as unknown as Client<paths>,
      file,
      idempotencyKey: "upload-once",
      taskIdempotencyKey: "task-once",
      metadata: { source: "workspace" },
      uploadFetch,
    });

    expect(result.task.id).toBe("task_1");
    expect(result.upload.status).toBe("completed");
    expect(uploadFetch).toHaveBeenCalledWith("https://uploads.example/upload_1", {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
    expect(calls).toEqual(["/api/v1/uploads/presign", "/api/v1/uploads/complete", "/api/v1/tasks"]);
  });

  it("wraps object storage upload failures for UI callers", async () => {
    const file = makeFile();
    const storageError = new Error("network offline");
    const post = vi.fn(async (path: string) => {
      if (path === "/api/v1/uploads/presign") {
        return {
          data: {
            id: "upload_1",
            status: "pending",
            provider: "r2",
            bucket: "nebutra-uploads",
            key: "tenants/org_1/uploads/upload_1/raw/Quarterly_Plan.pdf",
            filename: "Quarterly Plan.pdf",
            content_type: "application/pdf",
            size: 1024,
            metadata: {},
            presigned_upload: {
              url: "https://uploads.example/upload_1",
              method: "PUT",
              headers: { "Content-Type": "application/pdf" },
              expires_at: "2026-06-04T10:00:00.000Z",
            },
            etag: null,
            checksum_sha256: null,
            created_at: "2026-06-04T09:00:00.000Z",
            updated_at: "2026-06-04T09:00:00.000Z",
            completed_at: null,
          },
        };
      }

      throw new Error(`unexpected path ${path}`);
    });

    await expect(
      uploadDocumentAndCreateTask({
        apiClient: { POST: post } as unknown as Client<paths>,
        file,
        uploadFetch: vi.fn(async () => {
          throw storageError;
        }),
      }),
    ).rejects.toMatchObject({
      name: "DocumentUploadTaskError",
      cause: storageError,
    } satisfies Partial<DocumentUploadTaskError>);
  });
});
