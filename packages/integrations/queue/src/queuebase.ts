import type { z } from "zod";
import type { QueuebaseJobRouter } from "./queuebase-webhook";
import { queuebaseJobs } from "./queuebase-webhook";
import type { JobOptions, JobResult, QueueProvider } from "./types";

export type {
  QueuebaseBackoff,
  QueuebaseJobContext,
  QueuebaseJobDefinition,
  QueuebaseJobRouter,
  QueuebaseJobs,
  QueuebaseSchedule,
  QueuebaseScheduleConfig,
  QueuebaseScheduleMetadata,
  QueuebaseWebhookOptions,
} from "./queuebase-webhook";
export {
  createJobRouter,
  createQueuebaseWebhookHandler,
  defineQueueJob,
  listQueuebaseSchedules,
  queuebaseJobs,
  queuebaseWebhookHandler,
  verifyQueuebaseSignature,
} from "./queuebase-webhook";

export interface QueuebaseClientOptions {
  callbackUrl: string;
  apiUrl?: string;
  apiKey?: string;
  queue?: QueueProvider;
}

export type QueuebaseClient<TRouter extends QueuebaseJobRouter> = {
  [K in keyof TRouter]: {
    enqueue: (
      input: z.input<TRouter[K]["input"]>,
      options?: JobOptions,
    ) => Promise<QueuebaseEnqueueResult>;
  };
};

export interface QueuebaseEnqueueResult extends JobResult {
  jobName: string;
  callbackUrl: string;
}

export function createJobClient<TRouter extends QueuebaseJobRouter>(
  router: TRouter,
  options: QueuebaseClientOptions,
): QueuebaseClient<TRouter> {
  return Object.fromEntries(
    Object.entries(router).map(([jobName, definition]) => [
      jobName,
      {
        enqueue: async (input: unknown, enqueueOptions?: JobOptions) => {
          const parsed = definition.input.safeParse(input);
          if (!parsed.success) {
            throw new Error(`Invalid input for job ${jobName}: ${parsed.error.message}`);
          }

          const { createJob, getQueue } = await import("./factory");
          const queue = options.queue ?? (await getQueue());
          const result = await queue.enqueue(
            createJob("queuebase", jobName, parsed.data as Record<string, unknown>, {
              ...enqueueOptions,
              maxRetries: enqueueOptions?.maxRetries ?? definition.defaults?.retries,
              metadata: {
                ...enqueueOptions?.metadata,
                queuebaseJobName: jobName,
                callbackUrl: options.callbackUrl,
                ...(options.apiUrl ? { apiUrl: options.apiUrl } : {}),
                ...(definition.defaults?.backoff ? { backoff: definition.defaults.backoff } : {}),
              },
            }),
          );

          return {
            ...result,
            jobName,
            callbackUrl: options.callbackUrl,
          };
        },
      },
    ]),
  ) as QueuebaseClient<TRouter>;
}

export function getQueuebaseCallbackUrl(baseUrl = getBaseUrlFromEnv()): string {
  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/queuebase`;
}

export const queuebaseJobClient = createJobClient(queuebaseJobs, {
  apiUrl: process.env.QUEUEBASE_API_URL ?? "http://localhost:3847",
  ...(process.env.QUEUEBASE_API_KEY ? { apiKey: process.env.QUEUEBASE_API_KEY } : {}),
  callbackUrl: getQueuebaseCallbackUrl(),
});

function getBaseUrlFromEnv(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? "3001"}`;
}
