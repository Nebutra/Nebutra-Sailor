import { listPublicSkus, toPublicSku } from "@/catalog/skus";

export function GET() {
  return Response.json(
    {
      skus: listPublicSkus().map(toPublicSku),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
