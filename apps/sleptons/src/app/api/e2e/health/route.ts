export function GET() {
  return Response.json(
    {
      service: "sleptons",
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
