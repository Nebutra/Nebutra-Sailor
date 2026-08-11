import { Check, Cross, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

type Allow = "yes" | "no";

type Row = {
  action: string;
  admin: Allow;
  member: Allow;
  viewer: Allow;
};

const ROWS: ReadonlyArray<Row> = [
  { action: "read", admin: "yes", member: "yes", viewer: "yes" },
  { action: "write", admin: "yes", member: "yes", viewer: "no" },
  { action: "delete", admin: "yes", member: "no", viewer: "no" },
];

const ROLES = ["admin", "member", "viewer"] as const;

function Cell({ allow }: { allow: Allow }) {
  return allow === "yes" ? (
    <Check className="h-3.5 w-3.5 text-success" aria-label="allow" />
  ) : (
    <Cross className="h-3.5 w-3.5 text-red-500" aria-label="deny" />
  );
}

export function PermissionsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
          <Shield className="h-3 w-3" />
          RBAC / ABAC
        </Badge>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          policy.matrix
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded border border-border bg-background">
        <div className="grid grid-cols-[64px_1fr_1fr_1fr] border-b border-border bg-muted font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <div className="px-2 py-1.5"> </div>
          {ROLES.map((role) => (
            <div key={role} className="border-l border-border px-2 py-1.5 text-center">
              {role}
            </div>
          ))}
        </div>

        {ROWS.map((row, i) => (
          <div
            key={row.action}
            className={`grid grid-cols-[64px_1fr_1fr_1fr] ${
              i < ROWS.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="px-2 py-1.5 font-mono text-[10px] text-foreground">{row.action}</div>
            <div className="flex items-center justify-center border-l border-border py-1.5">
              <Cell allow={row.admin} />
            </div>
            <div className="flex items-center justify-center border-l border-border py-1.5">
              <Cell allow={row.member} />
            </div>
            <div className="flex items-center justify-center border-l border-border py-1.5">
              <Cell allow={row.viewer} />
            </div>
          </div>
        ))}
      </div>

      <div className="font-mono text-[9px] text-muted-foreground">
        defineAbility() &middot; CASL
      </div>
    </div>
  );
}
