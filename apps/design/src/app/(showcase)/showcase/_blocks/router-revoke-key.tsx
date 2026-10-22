"use client";

import { Key } from "@nebutra/icons";
import {
  Badge,
  Button,
  ConfirmDialog,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@nebutra/ui/primitives";
import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string;
  revoked: boolean;
}

const INITIAL: ApiKey[] = [
  {
    id: "key_1",
    name: "Production gateway",
    prefix: "sk-rt-8f3a",
    lastUsed: "2 min ago",
    revoked: false,
  },
  { id: "key_2", name: "CI evals", prefix: "sk-rt-41c9", lastUsed: "Yesterday", revoked: false },
  {
    id: "key_3",
    name: "Laptop (Mei)",
    prefix: "sk-rt-b07e",
    lastUsed: "12 days ago",
    revoked: false,
  },
];

/** Revoking a key is destructive and immediate, so it asks once, names the key, and says what breaks. */
export function RouterRevokeKey() {
  const [keys, setKeys] = useState(INITIAL);
  const [target, setTarget] = useState<ApiKey | null>(null);

  async function revoke(key: ApiKey) {
    // Stand-in for the request; ConfirmDialog shows its own pending state while this runs.
    await new Promise((resolve) => setTimeout(resolve, 700));
    setKeys((current) => current.map((k) => (k.id === key.id ? { ...k, revoked: true } : k)));
    toast.success(`Revoked ${key.name}`, {
      description: "Requests signed with it now fail with 401.",
    });
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <Key aria-hidden="true" className="text-muted-foreground" size={14} />
                  {key.name}
                </span>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">{key.prefix}…</TableCell>
              <TableCell className="text-muted-foreground">{key.lastUsed}</TableCell>
              <TableCell className="text-right">
                {key.revoked ? (
                  <Badge size="sm" variant="gray-subtle">
                    Revoked
                  </Badge>
                ) : (
                  <Button onClick={() => setTarget(key)} size="sm" variant="outline">
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        confirmText="Revoke key"
        description="Requests signed with this key start failing immediately. Services using it need a new key."
        onConfirm={() => (target ? revoke(target) : undefined)}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        open={target !== null}
        title={target ? `Revoke ${target.name}?` : "Revoke key?"}
        variant="destructive"
      />
    </div>
  );
}
