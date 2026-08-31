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
        provider: "image2",
        model: process.env.IMAGE2_MODEL || "gpt-image-2",
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
