"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import {
  Badge,
  Button,
  Checkbox,
  FilterPills,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { useMemo, useState } from "react";

const MEMBERS = [
  { id: "m1", name: "Mei Lin", email: "mei@acme.com", role: "Owner" },
  { id: "m2", name: "Tomás Ruiz", email: "tomas@acme.com", role: "Admin" },
  { id: "m3", name: "Aiko Tanaka", email: "aiko@acme.com", role: "Member" },
  { id: "m4", name: "Noor Rahman", email: "noor@acme.com", role: "Member" },
];

/** The toolbar answers two questions: which rows (search, filter) and what to do with them (the bulk bar replaces the filters once something is selected). */
export function TableToolbar() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      MEMBERS.filter(
        (m) =>
          (role === "all" || m.role === role) &&
          `${m.name} ${m.email}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query, role],
  );
  const allSelected = rows.length > 0 && rows.every((m) => selected.includes(m.id));

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => (on ? [...current, id] : current.filter((x) => x !== id)));

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex min-h-9 flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <Input
            aria-label="Search members"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            prefix={<MagnifyingGlass aria-hidden="true" />}
            type="search"
            value={query}
          />
        </div>
        {selected.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm tabular-nums">
              {selected.length} selected
            </span>
            <Button size="sm" variant="outline">
              Change role
            </Button>
            <Button size="sm" variant="destructive">
              Remove
            </Button>
          </div>
        ) : (
          <FilterPills
            onValueChange={setRole}
            options={[
              { value: "all", label: "All" },
              { value: "Admin", label: "Admin" },
              { value: "Member", label: "Member" },
            ]}
            size="sm"
            value={role}
          />
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all"
                checked={allSelected}
                indeterminate={selected.length > 0 && !allSelected}
                onCheckedChange={(on) => setSelected(on ? rows.map((m) => m.id) : [])}
              />
            </TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Checkbox
                  aria-label={`Select ${member.name}`}
                  checked={selected.includes(member.id)}
                  onCheckedChange={(on) => toggle(member.id, on)}
                />
              </TableCell>
              <TableCell>
                <span className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  <span className="text-muted-foreground text-xs">{member.email}</span>
                </span>
              </TableCell>
              <TableCell>
                <Badge size="sm" variant={member.role === "Owner" ? "outline" : "gray-subtle"}>
                  {member.role}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-muted-foreground" colSpan={3}>
                No members match.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
