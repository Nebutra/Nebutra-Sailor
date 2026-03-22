"use client";

import { useOrganization } from "@clerk/nextjs";
import { ErrorState, LoadingState } from "@nebutra/ui/layout";
import Image from "next/image";
import { PermissionGate } from "@/components/PermissionGate";

interface Props {
  orgId: string;
}

export function TeamMemberList({ orgId: _orgId }: Props) {
  const { memberships, isLoaded } = useOrganization({
    memberships: { pageSize: 50, keepPreviousData: true },
  });

  if (!isLoaded) return <LoadingState />;
  if (!memberships) return <ErrorState message="Failed to load members." />;

  const members = memberships.data ?? [];

  return (
    <ul className="divide-y divide-[var(--neutral-6)]">
      {members.map((m) => (
        <li key={m.id} className="py-3 flex items-center justify-between">
          <div className="gap-3 flex items-center">
            {m.publicUserData?.imageUrl && (
              <Image
                src={m.publicUserData.imageUrl}
                alt=""
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-sm font-medium text-[var(--neutral-12)]">
                {m.publicUserData?.firstName} {m.publicUserData?.lastName}
              </p>
              <p className="text-xs text-[var(--neutral-11)]">{m.publicUserData?.identifier}</p>
            </div>
          </div>

          <div className="gap-3 flex items-center">
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--neutral-3)] text-[var(--neutral-11)] capitalize">
              {m.role.replace("org:", "")}
            </span>

            <PermissionGate require="team:remove">
              <button
                type="button"
                onClick={() => m.destroy()}
                className="text-xs text-red-500 hover:text-red-700 focus:outline-none"
                aria-label={`Remove ${m.publicUserData?.firstName}`}
              >
                Remove
              </button>
            </PermissionGate>
          </div>
        </li>
      ))}

      {members.length === 0 && (
        <li className="py-6 text-sm text-center text-[var(--neutral-11)]">No members yet.</li>
      )}
    </ul>
  );
}
