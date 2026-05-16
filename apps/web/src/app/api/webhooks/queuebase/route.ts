import { queuebaseWebhookHandler } from "@nebutra/queue";

export async function POST(request: Request): Promise<Response> {
  return queuebaseWebhookHandler(request);
}
