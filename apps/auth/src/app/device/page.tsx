import { redirect } from "next/navigation";
import { DeviceApprovalForm } from "@/components/device-approval-form";
import { buildServerRequest, getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * RFC 8628 verification page — where `nebutra login` sends the browser.
 * Not signed in: bounce to /sign-in and come straight back here (with the
 * user code preserved) once they've authenticated. Signed in: render the
 * confirm / approve / deny form. All device-code reads and writes happen
 * client-side against the Better Auth `/api/auth/device/*` endpoints
 * (DeviceApprovalForm) — this component's only job is the auth gate and the
 * `?user_code=` prefill.
 */
export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const rawUserCode = typeof query.user_code === "string" ? query.user_code : "";

  const auth = await getAuth();
  const request = await buildServerRequest();
  const session = await auth.getSession(request);

  if (!session) {
    const returnTo = `/device${rawUserCode ? `?user_code=${encodeURIComponent(rawUserCode)}` : ""}`;
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <DeviceApprovalForm defaultUserCode={rawUserCode} signedInEmail={session.email ?? null} />
      </div>
    </div>
  );
}
