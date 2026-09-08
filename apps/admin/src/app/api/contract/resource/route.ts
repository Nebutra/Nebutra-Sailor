import { handleContractResource } from "@/lib/contract-resource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser → product resource list, signed with the caller's staff role. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleContractResource({
    serviceId: url.searchParams.get("serviceId"),
    resourceId: url.searchParams.get("resourceId"),
  });
}
