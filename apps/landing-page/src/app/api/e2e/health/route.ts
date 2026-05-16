export function GET() {
  return Response.json(
    {
      service: "landing-page",
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
