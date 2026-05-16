export function GET() {
  return Response.json(
    {
      service: "web",
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
