import type { Client } from "openapi-fetch";

import { browserApiClient } from "./client";
import type { paths } from "./types.generated";

type ApiClient = Pick<Client<paths>, "POST">;
type JsonContent<T> = T extends { content: { "application/json": infer Body } } ? Body : never;
type OperationRequestBody<T> = T extends {
  requestBody?: { content: { "application/json": infer Body } };
}
  ? Body
  : never;

export type UploadPresignRequest = OperationRequestBody<paths["/api/v1/uploads/presign"]["post"]>;
export type UploadCompleteRequest = OperationRequestBody<paths["/api/v1/uploads/complete"]["post"]>;
export type CreateTaskRequest = OperationRequestBody<paths["/api/v1/tasks"]["post"]>;
export type UploadRecord = JsonContent<paths["/api/v1/uploads/complete"]["post"]["responses"][200]>;
export type TaskRecord = JsonContent<paths["/api/v1/tasks"]["post"]["responses"][202]>;
export type DocumentUploadTaskPayload = {
  uploadId: string;
  provider: string;
  bucket: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
};

export class DocumentUploadTaskError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DocumentUploadTaskError";
  }
}

export type UploadDocumentAndCreateTaskInput = {
  file: File;
  apiClient?: ApiClient;
  uploadFetch?: typeof fetch;
  metadata?: UploadPresignRequest["metadata"];
  idempotencyKey?: string;
  taskIdempotencyKey?: string;
  taskType?: "document.parse" | "document.summarize" | "document.markdown" | "knowledge.index";
  queue?: string;
  priority?: CreateTaskRequest["priority"];
};

export type UploadDocumentAndCreateTaskResult = {
  upload: UploadRecord;
  task: TaskRecord;
};

export async function uploadDocumentAndCreateTask({
  file,
  apiClient = browserApiClient,
  uploadFetch = fetch,
  metadata = {},
  idempotencyKey,
  taskIdempotencyKey,
  taskType = "document.parse",
  queue = "document",
  priority = "normal",
}: UploadDocumentAndCreateTaskInput): Promise<UploadDocumentAndCreateTaskResult> {
  const contentType = file.type || "application/octet-stream";
  const presignBody: UploadPresignRequest = {
    filename: file.name,
    content_type: contentType,
    size: file.size,
    metadata,
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
  };

  const pendingUpload = requireApiData(
    await callApi(
      () =>
        apiClient.POST("/api/v1/uploads/presign", {
          body: presignBody,
        }),
      "Could not create a direct upload URL.",
    ),
    "Could not create a direct upload URL.",
  );

  if (!pendingUpload.presigned_upload) {
    throw new DocumentUploadTaskError("Upload origin did not return direct upload instructions.");
  }
  const uploadInstructions = pendingUpload.presigned_upload;

  const storageResponse = await callApi(
    () =>
      uploadFetch(uploadInstructions.url, {
        method: uploadInstructions.method,
        headers: uploadInstructions.headers,
        body: file,
      }),
    "Could not upload the file to object storage.",
  );

  if (!storageResponse.ok) {
    throw new DocumentUploadTaskError(
      `Object storage upload failed with status ${storageResponse.status}.`,
    );
  }

  const etag = normalizeHeader(storageResponse.headers.get("etag"));
  const completeBody: UploadCompleteRequest = {
    upload_id: pendingUpload.id,
    size: file.size,
    ...(etag ? { etag } : {}),
  };

  const completedUpload = requireApiData(
    await callApi(
      () =>
        apiClient.POST("/api/v1/uploads/complete", {
          body: completeBody,
        }),
      "Could not mark the upload complete.",
    ),
    "Could not mark the upload complete.",
  );

  const taskBody: CreateTaskRequest = {
    type: taskType,
    payload: toDocumentTaskPayload(completedUpload),
    queue,
    priority,
    metadata,
    ...(taskIdempotencyKey ? { idempotency_key: taskIdempotencyKey } : {}),
  };

  const task = requireApiData(
    await callApi(
      () => apiClient.POST("/api/v1/tasks", { body: taskBody }),
      "Could not create the document task.",
    ),
    "Could not create the document task.",
  );

  return {
    upload: completedUpload,
    task,
  };
}

function toDocumentTaskPayload(upload: UploadRecord): DocumentUploadTaskPayload {
  return {
    uploadId: upload.id,
    provider: upload.provider,
    bucket: upload.bucket,
    key: upload.key,
    filename: upload.filename,
    contentType: upload.content_type,
    size: upload.size,
  };
}

function requireApiData<T>(response: { data?: T; error?: unknown }, message: string): T {
  if (response.error) {
    throw new DocumentUploadTaskError(message, response.error);
  }

  if (!response.data) {
    throw new DocumentUploadTaskError(message);
  }

  return response.data;
}

async function callApi<T>(callback: () => Promise<T>, message: string): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof DocumentUploadTaskError) {
      throw error;
    }

    throw new DocumentUploadTaskError(message, error);
  }
}

function normalizeHeader(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized.replace(/^"(.*)"$/, "$1") : undefined;
}
