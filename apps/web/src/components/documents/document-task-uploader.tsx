"use client";

import {
  Check,
  CloudUpload,
  FileText,
  RefreshClockwise,
  StopCircle,
  Warning,
} from "@nebutra/icons";
import { Badge, Button, Progress } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";

import { useTypedApiClient } from "@/hooks/use-typed-api-client";
import {
  cancelDocumentTask,
  DocumentUploadTaskError,
  getDocumentTask,
  isTerminalTaskStatus,
  type TaskRecord,
  type UploadDocumentAndCreateTaskResult,
  uploadDocumentAndCreateTask,
} from "@/lib/api/document-upload-task";
import { queryKeys } from "@/lib/query-keys";

type UploadRunnerInput = {
  file: File;
  metadata: Record<string, string>;
};

export type DocumentTaskUploaderProps = {
  onUpload?: (input: UploadRunnerInput) => Promise<UploadDocumentAndCreateTaskResult>;
  onGetTask?: (taskId: string) => Promise<TaskRecord>;
  onCancelTask?: (taskId: string) => Promise<TaskRecord>;
  labels?: Partial<DocumentTaskUploaderLabels>;
  className?: string;
};

type DocumentTaskUploaderLabels = {
  intakeTitle: string;
  intakeDescription: string;
  chooseDocument: string;
  startParseTask: string;
  queued: string;
  fileInputLabel: string;
  fallbackError: string;
  taskStatus: string;
  progressLabel: string;
  refreshStatus: string;
  cancelTask: string;
  statusError: string;
  cancelError: string;
  statusQueued: string;
  statusRunning: string;
  statusSucceeded: string;
  statusFailed: string;
  statusCancelled: string;
  resultReady: string;
  taskError: string;
  updatedAt: string;
};

const DEFAULT_LABELS: DocumentTaskUploaderLabels = {
  intakeTitle: "Document intake",
  intakeDescription: "PDF, Markdown, text, or Word document",
  chooseDocument: "Choose document",
  startParseTask: "Start parse task",
  queued: "Queued",
  fileInputLabel: "Document file",
  fallbackError: "Document task failed.",
  taskStatus: "Task status",
  progressLabel: "Task progress",
  refreshStatus: "Refresh",
  cancelTask: "Cancel",
  statusError: "Could not refresh task status.",
  cancelError: "Could not cancel the task.",
  statusQueued: "Queued",
  statusRunning: "Running",
  statusSucceeded: "Succeeded",
  statusFailed: "Failed",
  statusCancelled: "Cancelled",
  resultReady: "Result ready",
  taskError: "Task error",
  updatedAt: "Updated",
};

const TASK_POLL_INTERVAL_MS = 2_000;

const ACCEPTED_DOCUMENT_TYPES = [
  ".pdf",
  ".md",
  ".markdown",
  ".txt",
  ".doc",
  ".docx",
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export function DocumentTaskUploader({
  onUpload,
  onGetTask,
  onCancelTask,
  labels,
  className,
}: DocumentTaskUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const getApiClient = useTypedApiClient();
  const queryClient = useQueryClient();
  const text = { ...DEFAULT_LABELS, ...labels };
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadDocumentAndCreateTaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taskId = result?.task.id ?? null;

  async function runUpload(input: UploadRunnerInput) {
    if (onUpload) {
      return onUpload(input);
    }

    const operationId = createOperationId();
    const apiClient = await getApiClient();
    return uploadDocumentAndCreateTask({
      apiClient,
      file: input.file,
      metadata: input.metadata,
      idempotencyKey: `upload:${operationId}`,
      taskIdempotencyKey: `task:${operationId}`,
    });
  }

  async function runGetTask(taskId: string) {
    if (onGetTask) {
      return onGetTask(taskId);
    }

    const apiClient = await getApiClient();
    return getDocumentTask(taskId, apiClient);
  }

  async function runCancelTask(taskId: string) {
    if (onCancelTask) {
      return onCancelTask(taskId);
    }

    const apiClient = await getApiClient();
    return cancelDocumentTask(taskId, apiClient);
  }

  const uploadMutation = useMutation({
    mutationKey: queryKeys.tasks.uploadDocument(),
    mutationFn: runUpload,
    onMutate() {
      setError(null);
      setResult(null);
    },
    onSuccess(uploaded) {
      setResult(uploaded);
      queryClient.setQueryData(queryKeys.tasks.detail(uploaded.task.id), uploaded.task);
    },
    onError(err) {
      setError(getErrorMessage(err, text.fallbackError));
    },
  });

  const taskQuery = useQuery({
    queryKey: taskId ? queryKeys.tasks.detail(taskId) : queryKeys.tasks.detail("idle"),
    queryFn: () => {
      if (!taskId) {
        throw new DocumentUploadTaskError(text.statusError);
      }
      return runGetTask(taskId);
    },
    enabled: Boolean(taskId),
    initialData: result?.task,
    refetchInterval: (query) =>
      query.state.data && isTerminalTaskStatus(query.state.data.status)
        ? false
        : TASK_POLL_INTERVAL_MS,
    staleTime: 0,
  });

  const cancelMutation = useMutation({
    mutationFn: runCancelTask,
    onSuccess(task) {
      setError(null);
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
    },
    onError(err) {
      setError(getErrorMessage(err, text.cancelError));
    },
  });

  const currentTask = taskQuery.data ?? result?.task ?? null;
  const uploadPending = uploadMutation.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploadPending) {
      return;
    }

    uploadMutation.mutate({
      file,
      metadata: { source: "workspace" },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-muted p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-background text-muted-foreground ring-1 ring-[hsl(var(--border))]">
            <FileText className="size-4" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{text.intakeTitle}</p>
            {file ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{file.name}</span>
                <span className="mx-1 text-muted-foreground">/</span>
                {formatBytes(file.size)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">{text.intakeDescription}</p>
            )}
          </div>
        </div>

        {result && currentTask ? (
          <TaskStatusPanel
            task={currentTask}
            uploadKey={result.upload.key}
            labels={text}
            fetching={taskQuery.isFetching}
            cancelPending={cancelMutation.isPending}
            onRefresh={() => void taskQuery.refetch()}
            onCancel={() => void cancelMutation.mutate(currentTask.id)}
          />
        ) : null}

        {taskQuery.isError ? (
          <p
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-3 py-2 text-[hsl(var(--warning-strong))] text-xs"
          >
            <Warning className="size-3.5 shrink-0" aria-hidden={true} />
            {text.statusError}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-[hsl(var(--destructive-strong))] text-xs"
          >
            <Warning className="size-3.5 shrink-0" aria-hidden={true} />
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <input
          data-allow-native
          id={inputId}
          type="file"
          accept={ACCEPTED_DOCUMENT_TYPES}
          aria-label={text.fileInputLabel}
          ref={inputRef}
          className="sr-only"
          disabled={uploadPending}
          onChange={(event) => {
            if (uploadPending) {
              event.currentTarget.value = "";
              return;
            }

            const nextFile = event.target.files?.[0] ?? null;
            setFile(nextFile);
            setResult(null);
            setError(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          prefix={<CloudUpload />}
          disabled={uploadPending}
          onClick={() => inputRef.current?.click()}
        >
          {text.chooseDocument}
        </Button>
        <Button type="submit" size="sm" loading={uploadPending} disabled={!file || uploadPending}>
          {text.startParseTask}
        </Button>
      </div>
    </form>
  );
}

function TaskStatusPanel({
  task,
  uploadKey,
  labels,
  fetching,
  cancelPending,
  onRefresh,
  onCancel,
}: {
  task: TaskRecord;
  uploadKey: string;
  labels: DocumentTaskUploaderLabels;
  fetching: boolean;
  cancelPending: boolean;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const terminal = isTerminalTaskStatus(task.status);
  const payload = task.result ?? task.error;

  return (
    <div
      className={cn(
        "mt-3 grid gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs",
        getTaskPanelTone(task.status),
      )}
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {task.status === "succeeded" ? (
          <Check className="size-3.5 shrink-0" aria-hidden={true} />
        ) : (
          <FileText className="size-3.5 shrink-0" aria-hidden={true} />
        )}
        <span className="font-medium">{labels.taskStatus}</span>
        <Badge variant={getStatusBadgeVariant(task.status)} size="sm" dot>
          {getStatusLabel(task.status, labels)}
        </Badge>
        <code className="min-w-0 max-w-full truncate font-mono">{task.id}</code>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            prefix={<RefreshClockwise />}
            loading={fetching}
            onClick={onRefresh}
          >
            {labels.refreshStatus}
          </Button>
          {!terminal ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              prefix={<StopCircle />}
              loading={cancelPending}
              onClick={onCancel}
            >
              {labels.cancelTask}
            </Button>
          ) : null}
        </div>
      </div>

      <Progress
        aria-label={labels.progressLabel}
        value={task.progress}
        max={100}
        size="sm"
        type={getProgressType(task.status)}
        showValue
      />

      <div className="grid gap-1 text-muted-foreground">
        <code className="block truncate font-mono">{uploadKey}</code>
        <span className="text-[11px]">
          {labels.updatedAt}: {formatTimestamp(task.updated_at)}
        </span>
      </div>

      {payload ? (
        <div className="grid gap-1 rounded-[var(--radius-sm)] bg-background px-2 py-1.5 text-muted-foreground">
          <span className="font-medium text-foreground">
            {task.error ? labels.taskError : labels.resultReady}
          </span>
          <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">
            {formatJson(payload)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DocumentUploadTaskError || error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function createOperationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStatusLabel(status: TaskRecord["status"], labels: DocumentTaskUploaderLabels) {
  switch (status) {
    case "queued":
      return labels.statusQueued;
    case "running":
      return labels.statusRunning;
    case "succeeded":
      return labels.statusSucceeded;
    case "failed":
      return labels.statusFailed;
    case "cancelled":
      return labels.statusCancelled;
  }
}

function getStatusBadgeVariant(status: TaskRecord["status"]) {
  switch (status) {
    case "queued":
      return "amber-subtle";
    case "running":
      return "blue-subtle";
    case "succeeded":
      return "green-subtle";
    case "failed":
      return "red-subtle";
    case "cancelled":
      return "gray-subtle";
  }
}

function getProgressType(status: TaskRecord["status"]) {
  switch (status) {
    case "succeeded":
      return "success";
    case "failed":
      return "error";
    case "cancelled":
      return "secondary";
    case "queued":
    case "running":
      return "secondary";
  }
}

function getTaskPanelTone(status: TaskRecord["status"]) {
  switch (status) {
    case "succeeded":
      return "border-success/30 bg-success/10 text-[hsl(var(--success-strong))]";
    case "failed":
      return "border-destructive/30 bg-destructive/10 text-[hsl(var(--destructive-strong))]";
    case "cancelled":
      return "border-border bg-muted text-foreground";
    case "queued":
    case "running":
      return "border-primary/30 bg-primary/10 text-primary";
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
