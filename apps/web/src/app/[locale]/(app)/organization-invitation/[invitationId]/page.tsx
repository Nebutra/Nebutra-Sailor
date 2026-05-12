import { getSystemDb } from "@nebutra/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OrganizationInvitationModal } from "@/components/organizations/organization-invitation-modal";
import { getAuth, getUser } from "@/lib/auth";
import { findInvitationById, type NormalizedInvitation } from "@/lib/invitations";

type InvitationRecord = NormalizedInvitation;

interface OrganizationInvitationPageProps {
  params: Promise<{ locale: string; invitationId: string }>;
}

interface InvitationStatusViewProps {
  title: string;
  description: string;
}

function InvitationStatusView({ title, description }: InvitationStatusViewProps) {
  return (
    <section
      aria-labelledby="invitation-status-heading"
      className="mx-auto w-full max-w-md rounded-2xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6 text-center shadow-sm"
    >
      <h2 id="invitation-status-heading" className="text-lg font-semibold text-[var(--neutral-12)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--neutral-11)]">{description}</p>
    </section>
  );
}

export default async function OrganizationInvitationPage({
  params,
}: OrganizationInvitationPageProps) {
  const { locale, invitationId } = await params;
  const t = await getTranslations({ locale, namespace: "organizations.invitation" });

  const auth = await getAuth();
  if (!auth.userId) {
    const target = `/organization-invitation/${invitationId}`;
    redirect(`/sign-in?redirect=${encodeURIComponent(target)}`);
  }

  const db = getSystemDb();
  // ADR-12 Phase 3b — dual-read: auth.invitation (BA) first, legacy fallback.
  const invitation = await findInvitationById(invitationId, db);

  return (
    <main
      aria-label={t("title")}
      className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-10"
    >
      {
        await renderInvitationView({
          invitation,
          invitationId,
          t,
        })
      }
    </main>
  );
}

async function renderInvitationView(args: {
  invitation: InvitationRecord | null;
  invitationId: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const { invitation, invitationId, t } = args;

  if (!invitation) {
    return (
      <InvitationStatusView title={t("errorNotFound")} description={t("errorNotFoundDetail")} />
    );
  }

  if (invitation.status === "declined" || invitation.status === "accepted") {
    return (
      <InvitationStatusView
        title={t("errorNotAvailable")}
        description={t("errorNotAvailableDetail")}
      />
    );
  }

  if (invitation.expiresAt.getTime() <= Date.now() || invitation.status === "expired") {
    return <InvitationStatusView title={t("errorExpired")} description={t("errorExpiredDetail")} />;
  }

  const user = await getUser().catch(() => null);
  const userEmail = user?.email ?? null;
  if (!userEmail || userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InvitationStatusView
        title={t("errorEmailMismatch")}
        description={t("errorEmailMismatchDetail")}
      />
    );
  }

  const db = getSystemDb();
  const organization = await db.organization.findUnique({
    where: { id: invitation.organizationId },
    select: { name: true, id: true },
  });

  return (
    <OrganizationInvitationModal
      invitationId={invitationId}
      organizationName={organization?.name ?? "Organization"}
      roleLabel={invitation.role}
    />
  );
}
