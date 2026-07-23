import Link from "next/link";
import { TierBadge } from "./TierBadge";

type Tier = "V0" | "V1" | "V2" | "V_INFINITY";

interface MemberCardProps {
  member: {
    member_number: number;
    slug: string;
    display_name: string;
    bio?: string | null;
    avatar_url?: string | null;
    product_name?: string | null;
    product_tagline?: string | null;
    tech_stack: string[];
    looking_for: string[];
    tier: Tier;
    github_handle?: string | null;
    created_at: Date;
    products: { name: string; tagline: string }[];
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const initials = member.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/members/${member.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-5 transition-[border-color,box-shadow] hover:border-[hsl(var(--primary))] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--blue-3)] text-sm font-bold text-[hsl(var(--primary))]">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">{member.display_name}</p>
            <p className="text-xs text-muted-foreground">#{member.member_number}</p>
          </div>
        </div>
        <TierBadge tier={member.tier} />
      </div>

      {member.product_tagline && (
        <p className="text-sm text-muted-foreground">{member.product_tagline}</p>
      )}

      {member.looking_for.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.looking_for.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
