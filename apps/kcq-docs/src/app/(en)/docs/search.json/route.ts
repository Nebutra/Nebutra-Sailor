import { searchIndex } from "@/lib/search";

export const dynamic = "force-static";
export async function GET() {
  return Response.json(await searchIndex("en"));
}
