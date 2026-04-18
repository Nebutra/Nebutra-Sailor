/**
 * Queue provider registry — single source of truth for the create-sailor CLI.
 *
 * L2 depth: the `@nebutra/queue` package in the monorepo is already a real
 * provider-agnostic implementation. This registry just drives CLI prompts
 * and env-var injection — it does NOT generate wrapper code.
 */

export type QueueProviderId = "qstash" | "bullmq" | "upstash" | "sqs" | "none";

export type QueueRegion = "global" | "cn" | "both";

export interface QueueProviderMeta {
  id: QueueProviderId;
  name: string;
  region: QueueRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const QUEUE_PROVIDERS: QueueProviderMeta[] = [
  {
    id: "qstash",
    name: "Upstash QStash",
    region: "both",
    envVars: ["QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"],
    docs: "https://upstash.com/docs/qstash",
    description: "Serverless HTTP-based queue",
  },
  {
    id: "bullmq",
    name: "BullMQ",
    region: "both",
    envVars: ["REDIS_URL"],
    docs: "https://docs.bullmq.io",
    description: "Redis-backed job queue",
  },
  {
    id: "upstash",
    name: "Upstash Kafka",
    region: "both",
    envVars: [
      "UPSTASH_KAFKA_REST_URL",
      "UPSTASH_KAFKA_REST_USERNAME",
      "UPSTASH_KAFKA_REST_PASSWORD",
    ],
    docs: "https://upstash.com/docs/kafka",
    description: "Serverless Kafka",
  },
  {
    id: "sqs",
    name: "AWS SQS",
    region: "global",
    envVars: ["AWS_SQS_QUEUE_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    docs: "https://docs.aws.amazon.com/AWSSimpleQueueService/",
    description: "AWS managed queue",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
    description: "Skip queue package",
  },
];

export function getQueueProvider(id: string): QueueProviderMeta | undefined {
  return QUEUE_PROVIDERS.find((p) => p.id === id);
}

export const QUEUE_PROVIDERS_BY_REGION = QUEUE_PROVIDERS.reduce<
  Record<QueueRegion, QueueProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<QueueRegion, QueueProviderMeta[]>,
);
