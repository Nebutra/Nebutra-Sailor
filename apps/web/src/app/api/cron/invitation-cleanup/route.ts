import { runCronRoute } from "../_lib";

export async function GET(request: Request): Promise<Response> {
  return runCronRoute(request, "invitation-cleanup");
}
