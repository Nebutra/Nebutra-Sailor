import { Badge, Button, Card } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authRequest } from "./auth-api";
import { describeDevice } from "./devices";

interface AuthSession {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface SessionsView {
  sessions: AuthSession[];
  currentToken: string | null;
}

const SESSIONS_KEY = ["settings", "sessions"] as const;

async function loadSessions(): Promise<SessionsView> {
  const [sessions, current] = await Promise.all([
    authRequest<AuthSession[]>("list-sessions"),
    authRequest<{ session?: { token?: string } } | null>("get-session"),
  ]);
  const currentToken = current?.session?.token ?? null;
  // This device first, then the most recently active.
  const sorted = [...sessions].sort((a, b) => {
    if (a.token === currentToken) return -1;
    if (b.token === currentToken) return 1;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
  return { sessions: sorted, currentToken };
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function formatDate(value: string): string {
  const time = Date.parse(value);
  return Number.isNaN(time) ? "" : dateFormat.format(time);
}

export function SecurityPanel() {
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: SESSIONS_KEY, queryFn: loadSessions });

  const revokeOne = useMutation({
    mutationFn: (token: string) =>
      authRequest("revoke-session", { method: "POST", body: { token } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
  const revokeOthers = useMutation({
    mutationFn: () => authRequest("revoke-other-sessions", { method: "POST", body: {} }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });

  const others =
    sessions.data?.sessions.filter((session) => session.token !== sessions.data?.currentToken) ??
    [];
  const failure = revokeOne.error ?? revokeOthers.error;

  return (
    <Card padding="md">
      <Card.Header className="sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="space-y-1.5">
          <Card.Title as="h2" className="text-base">
            Where you're signed in
          </Card.Title>
          <Card.Description>
            Sign out anywhere you don't recognise, or anywhere you've stopped using.
          </Card.Description>
        </div>
        {others.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
          >
            {revokeOthers.isPending ? "Signing out…" : "Sign out everywhere else"}
          </Button>
        ) : null}
      </Card.Header>
      <Card.Content>
        {sessions.isPending ? <p className="text-sm text-neutral-11">Loading…</p> : null}
        {sessions.isError ? (
          <p role="alert" className="text-sm text-destructive-strong">
            Your sessions didn't load. {sessions.error.message}
          </p>
        ) : null}
        {sessions.data ? (
          <ul className="divide-y divide-neutral-6 rounded-[var(--radius-md)] border border-neutral-6">
            {sessions.data.sessions.map((session) => {
              const current = session.token === sessions.data.currentToken;
              return (
                <li key={session.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-neutral-12">
                      <span className="truncate">{describeDevice(session.userAgent)}</span>
                      {current ? <Badge variant="gray">This device</Badge> : null}
                    </p>
                    <p className="truncate text-sm text-neutral-11">
                      {[session.ipAddress, `Signed in ${formatDate(session.createdAt)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {current ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={revokeOne.isPending && revokeOne.variables === session.token}
                      onClick={() => revokeOne.mutate(session.token)}
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {failure ? (
          <p role="alert" className="mt-3 text-sm text-destructive-strong">
            That session is still signed in. {failure.message}
          </p>
        ) : null}
        {revokeOthers.isSuccess && others.length === 0 ? (
          <p role="status" className="mt-3 text-sm text-neutral-11">
            Signed out everywhere else.
          </p>
        ) : null}
      </Card.Content>
    </Card>
  );
}
