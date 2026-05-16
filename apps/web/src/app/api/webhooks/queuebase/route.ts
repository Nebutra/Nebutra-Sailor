import { queuebaseWebhookHandler } from "@nebutra/queue/queuebase";

export async function POST(request: Request): Promise<Response> {
  return queuebaseWebhookHandler(request);
}
