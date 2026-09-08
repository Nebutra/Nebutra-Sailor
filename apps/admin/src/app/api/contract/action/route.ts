import { handleContractAction } from "@/lib/contract-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser → product action (plan or apply), signed with the caller's staff role. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  return handleContractAction(body);
}
