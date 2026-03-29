"use client";

import { ErrorState, LoadingState } from "@nebutra/ui/layout";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  role: string;
}

interface Props {
  orgId: string;
}

export function TeamMemberList({ orgId }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}/members`);
        if (!res.ok) throw new Error("Failed to load members");
        const data = await res.json();
        setMembers(data.members ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setIsLoaded(true);
      }
    };

    fetchMembers();
  }, [orgId]);

  if (!isLoaded) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this organization?`)) return;

    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  return (
    <ul className="divide-y divide-[var(--neutral-6)]">
      {members.map((m) => (
        <li key={m.id} className="py-3 flex items-center justify-between">
          <div className="gap-3 flex items-center">
            {m.user.image && (
              <Image
                src={m.user.image}
                alt=""
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-sm font-medium text-[var(--neutral-12)]">{m.user.name}</p>
              <p className="text-xs text-[var(--neutral-11)]">{m.user.email}</p>
            </div>
          </div>

          <div className="gap-3 flex items-center">
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--neutral-3)] text-[var(--neutral-11)] capitalize">
              {m.role}
            </span>

            <PermissionGate require="team:remove">
              <button
                type="button"
                onClick={() => handleRemoveMember(m.id, m.user.name)}
                className="text-xs text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded px-1"
                aria-label={`Remove ${m.user.name}`}
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
