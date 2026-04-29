import { statusSnapshotResponse } from "@/lib/status-response";

export async function GET() {
  return statusSnapshotResponse();
}
