import { fetchAuthCenterSession } from "@nebutra/auth/auth-center-session";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeviceApprovalForm } from "@/components/device-approval-form";

export const dynamic = "force-dynamic";

/**
 * RFC 8628 verification page — where `nebutra login` sends the browser.
 * Not signed in: bounce to /sign-in and come straight back here (with the
 * user code preserved) once they've authenticated. Signed in: render the
 * confirm / approve / deny form. All device-code reads and writes happen
 * client-side against the Better Auth `/api/auth/device/*` endpoints
 * (DeviceApprovalForm) — this component's only job is the auth gate and the
 * `?user_code=` prefill.
 *
 * The session comes from the auth edge (`/api/auth/get-session`, cookies
 * forwarded), not from a Better Auth instance built here. In production this
 * page renders on the auth UI origin, which holds no database connection by
 * design — the edge Worker owns `/api/auth/*` and the auth tables. Building a
 * Prisma-backed instance here made every visit a 500, so `nebutra login` could
 * never be approved.
 */
export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const rawUserCode = typeof query.user_code === "string" ? query.user_code : "";

  const authBase = (process.env.BETTER_AUTH_URL || getBrandOrigin("auth")).replace(/\/$/, "");
  const center = await fetchAuthCenterSession(
    new Request(authBase, { headers: new Headers(await headers()) }),
    authBase,
  );

  if (!center) {
    // Absolute, not `/device?…`: sign-in resolves a bare path against the
    // product app (app.<apex>), which has no /device — the browser landed
    // there after login and the code could never be approved. This page
    // lives on the auth center, so the way back names it.
    const returnTo = `${authBase}/device${rawUserCode ? `?user_code=${encodeURIComponent(rawUserCode)}` : ""}`;
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <DeviceApprovalForm
          defaultUserCode={rawUserCode}
          signedInEmail={typeof center.user.email === "string" ? center.user.email : null}
        />
      </div>
    </div>
  );
}
