import { queuebaseWebhookHandler } from "@nebutra/queue/queuebase-webhook";

export async function POST(request: Request): Promise<Response> {
  return queuebaseWebhookHandler(request);
}
