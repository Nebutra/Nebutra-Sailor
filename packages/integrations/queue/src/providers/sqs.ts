import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { logger } from "@nebutra/logger";
import type { JobHandler, JobPayload, JobResult, QueueProvider, SQSProviderConfig } from "../types";

// =============================================================================
// SQS Provider — AWS Simple Queue Service
// =============================================================================
// Pull-based queue: enqueue() calls SendMessage; a background poll loop
// fetches messages via ReceiveMessage (long-poll) and dispatches to handlers
// registered via registerHandler(). Suitable for AWS-native deployments and
// teams already running on IAM-authed AWS infra.
//
// Architecture:
//   enqueue()  →  SendMessage
//   registerHandler()  →  starts a long-poll loop that ReceiveMessage's,
//                         dispatches to the handler, then DeleteMessage on
//                         success. Failures fall back to SQS's own retry +
//                         dead-letter queue if configured on the queue side.
// =============================================================================

interface HandlerEntry {
  handler: JobHandler;
  abort: AbortController;
}

const handlerRegistry = new Map<string, HandlerEntry>();

function handlerKey(queue: string, type: string): string {
  return `${queue}:${type}`;
}

export class SQSProvider implements QueueProvider {
  readonly name = "sqs" as const;

  private client: SQSClient;
  private queueUrl: string;
  private waitTimeSeconds: number;
  private maxMessages: number;
  private visibilityTimeoutSeconds: number;

  constructor(config: Omit<SQSProviderConfig, "provider">) {
    const region = config.region ?? process.env.AWS_REGION;
    const queueUrl = config.queueUrl ?? process.env.AWS_SQS_QUEUE_URL;
    if (!region) {
      throw new Error("SQS region not configured. Set AWS_REGION env var or pass `region`.");
    }
    if (!queueUrl) {
      throw new Error(
        "SQS queue URL not configured. Set AWS_SQS_QUEUE_URL env var or pass `queueUrl`.",
      );
    }

    const accessKeyId = config.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;

    this.client = new SQSClient({
      region,
      // If explicit creds provided, use them; otherwise AWS SDK uses default
      // chain (IAM role on EC2/ECS/Lambda, ~/.aws/credentials, env, etc.).
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    this.queueUrl = queueUrl;
    this.waitTimeSeconds = config.waitTimeSeconds ?? 20;
    this.maxMessages = config.maxMessages ?? 10;
    this.visibilityTimeoutSeconds = config.visibilityTimeoutSeconds ?? 30;

    logger.info("[queue:sqs] Provider initialised", { region, queueUrl: queueUrl.slice(0, 60) });
  }

  // ── Enqueue ─────────────────────────────────────────────────────────────

  async enqueue(job: JobPayload): Promise<JobResult> {
    try {
      const response = await this.client.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(job),
          ...(job.options?.delaySec ? { DelaySeconds: Math.min(job.options.delaySec, 900) } : {}),
          ...(job.options?.idempotencyKey
            ? {
                // FIFO queues use deduplication ID; standard queues ignore it.
                MessageDeduplicationId: job.options.idempotencyKey,
                MessageGroupId: job.queue,
              }
            : {}),
        }),
      );

      const messageId = response.MessageId ?? job.id;

      logger.info("[queue:sqs] Job enqueued", { jobId: job.id, messageId });

      return {
        jobId: messageId,
        accepted: true,
        provider: "sqs",
      };
    } catch (error) {
      logger.error("[queue:sqs] Failed to enqueue job", {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async enqueueBatch(jobs: JobPayload[]): Promise<JobResult[]> {
    // SQS SendMessageBatch caps at 10 entries per request — chunk if needed.
    const results: JobResult[] = [];
    for (let i = 0; i < jobs.length; i += 10) {
      const chunk = jobs.slice(i, i + 10);
      try {
        const response = await this.client.send(
          new SendMessageBatchCommand({
            QueueUrl: this.queueUrl,
            Entries: chunk.map((job, idx) => ({
              Id: `msg-${idx}-${Date.now()}`,
              MessageBody: JSON.stringify(job),
              ...(job.options?.delaySec
                ? { DelaySeconds: Math.min(job.options.delaySec, 900) }
                : {}),
            })),
          }),
        );
        const successful = response.Successful ?? [];
        for (let j = 0; j < chunk.length; j++) {
          const ok = successful[j];
          results.push({
            jobId: ok?.MessageId ?? chunk[j]?.id ?? "",
            accepted: Boolean(ok),
            provider: "sqs",
          });
        }
      } catch (error) {
        logger.error("[queue:sqs] Batch enqueue failed, falling back to sequential", {
          error: error instanceof Error ? error.message : String(error),
        });
        for (const job of chunk) {
          try {
            results.push(await this.enqueue(job));
          } catch {
            results.push({ jobId: job.id, accepted: false, provider: "sqs" });
          }
        }
      }
    }
    return results;
  }

  // ── Handler Registration & Poll Loop ─────────────────────────────────────

  registerHandler<T extends Record<string, unknown>>(
    queue: string,
    type: string,
    handler: JobHandler<T>,
  ): void {
    const key = handlerKey(queue, type);
    if (handlerRegistry.has(key)) {
      logger.warn("[queue:sqs] Handler already registered, replacing", { key });
      const existing = handlerRegistry.get(key);
      existing?.abort.abort();
    }

    const abort = new AbortController();
    handlerRegistry.set(key, { handler: handler as JobHandler, abort });

    void this.pollLoop(queue, type, handler as JobHandler, abort.signal);

    logger.info("[queue:sqs] Handler registered + poll loop started", { key });
  }

  private async pollLoop(
    queue: string,
    type: string,
    handler: JobHandler,
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      try {
        const response = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: this.maxMessages,
            WaitTimeSeconds: this.waitTimeSeconds,
            VisibilityTimeout: this.visibilityTimeoutSeconds,
          }),
        );
        const messages = response.Messages ?? [];

        for (const msg of messages) {
          if (signal.aborted) break;
          await this.dispatch(msg, queue, type, handler);
        }
      } catch (error) {
        if (signal.aborted) break;
        logger.error("[queue:sqs] Poll error, sleeping 5s", {
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  private async dispatch(
    msg: Message,
    queue: string,
    type: string,
    handler: JobHandler,
  ): Promise<void> {
    if (!msg.Body || !msg.ReceiptHandle) return;
    let job: JobPayload;
    try {
      job = JSON.parse(msg.Body) as JobPayload;
    } catch {
      logger.error("[queue:sqs] Malformed message body, deleting", { messageId: msg.MessageId });
      await this.deleteMessage(msg.ReceiptHandle);
      return;
    }

    if (job.queue !== queue || job.type !== type) {
      // Not for this handler — leave it for whoever owns it. Visibility timeout
      // will expire and another consumer can pick it up.
      return;
    }

    try {
      await handler(job);
      await this.deleteMessage(msg.ReceiptHandle);
    } catch (error) {
      logger.error("[queue:sqs] Handler failed; message will be retried by SQS", {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't delete — SQS will redeliver after visibility timeout.
      // Configure a DLQ on the SQS queue side for terminal failure handling.
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteMessageCommand({ QueueUrl: this.queueUrl, ReceiptHandle: receiptHandle }),
      );
    } catch (error) {
      logger.error("[queue:sqs] DeleteMessage failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    for (const entry of handlerRegistry.values()) entry.abort.abort();
    handlerRegistry.clear();
    this.client.destroy();
    logger.info("[queue:sqs] Provider closed");
  }
}
