import { useAuthContext } from "@nebutra/auth/react/context";
import { Avatar, Button, Card, Field, Input } from "@nebutra/ui/primitives";
import { type FormEvent, useEffect, useState } from "react";
import { useReloadSession } from "@/vite-app/auth-provider";
import { authRequest } from "./auth-api";

const NAME_MAX = 64;

type Status = { kind: "saved" } | { kind: "error"; message: string } | null;

export function ProfilePanel() {
  const { user } = useAuthContext();
  const reloadSession = useReloadSession();
  const savedName = user?.name ?? "";
  const [name, setName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Follow the session when it changes underneath the form (another tab, a reload).
  useEffect(() => {
    setName(savedName);
  }, [savedName]);

  const trimmed = name.trim();
  const invalid = trimmed.length === 0 ? "Enter a name." : null;
  const unchanged = trimmed === savedName;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid || unchanged || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      await authRequest("update-user", { method: "POST", body: { name: trimmed } });
      await reloadSession();
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: `Your name wasn't saved. ${error instanceof Error ? error.message : ""}`.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  const displayName = savedName || user?.email || "Your account";

  return (
    <div className="space-y-6">
      <Card padding="md">
        <div className="flex items-center gap-4">
          <Avatar
            size="lg"
            title={displayName}
            {...(user?.imageUrl ? { src: user.imageUrl } : {})}
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-neutral-12">{displayName}</p>
            {user?.email ? <p className="truncate text-sm text-neutral-11">{user.email}</p> : null}
          </div>
        </div>
      </Card>

      <Card padding="md">
        <form onSubmit={onSubmit} noValidate>
          <Card.Header>
            <Card.Title as="h2" className="text-base">
              Display name
            </Card.Title>
            <Card.Description>
              How you appear across the app and to people you work with.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <Field
              label="Name"
              htmlFor="profile-name"
              {...(!unchanged && invalid ? { error: invalid } : {})}
            >
              <Input
                id="profile-name"
                name="name"
                autoComplete="name"
                maxLength={NAME_MAX}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setStatus(null);
                }}
                className="max-w-sm"
              />
            </Field>
          </Card.Content>
          <Card.Footer className="justify-between gap-4">
            <div className="min-h-5 text-sm">
              {status?.kind === "saved" ? (
                <p role="status" className="text-neutral-11">
                  Saved.
                </p>
              ) : null}
              {status?.kind === "error" ? (
                <p role="alert" className="text-destructive-strong">
                  {status.message}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              variant="ink"
              size="sm"
              disabled={saving || unchanged || Boolean(invalid)}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </Card.Footer>
        </form>
      </Card>

      <Card padding="md">
        <Card.Header>
          <Card.Title as="h2" className="text-base">
            Email
          </Card.Title>
          <Card.Description>The address you sign in with.</Card.Description>
        </Card.Header>
        <Card.Content>
          <p className="text-sm font-medium text-neutral-12">{user?.email ?? "—"}</p>
        </Card.Content>
      </Card>
    </div>
  );
}
