export function GET() {
  return Response.json(
    {
      service: "landing",
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
