import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { email } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // In development, just log and return success
    process.stderr.write(`[newsletter] Subscribed: ${email}\n`);
    return NextResponse.json({ success: true });
  }

  // Add contact to Resend audience
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      process.stderr.write(`[newsletter] Resend error: ${errorBody}\n`);
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
