import { isImage2Configured } from "@/lib/image2";
import { isR2Configured } from "@/lib/resources";

export function GET() {
  return Response.json(
    {
      service: "kuanlan",
      status: "ok",
      storage: {
        provider: "r2",
        configured: isR2Configured(),
      },
      consume: {
        provider: "router",
        model: process.env.IMAGE2_MODEL || "gpt-image-2",
        base: process.env.IMAGE2_BASE_URL || "https://router.nebutra.com/v1",
        configured: isImage2Configured(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
