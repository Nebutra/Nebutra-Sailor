import { useAuthContext } from "@nebutra/auth/react/context";
import { Avatar, Badge, Card } from "@nebutra/ui/primitives";

function formatRole(role: string): string {
  const lower = role.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function WorkspacePanel() {
  const { organization, membership } = useAuthContext();

  if (!organization) {
    return (
      <Card padding="md">
        <Card.Header>
          <Card.Title as="h2" className="text-base">
            Personal account
          </Card.Title>
          <Card.Description>
            You're working in your own account, outside any workspace. When you join one, its name
            and your role there show up here.
          </Card.Description>
        </Card.Header>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <Card.Header>
        <Card.Title as="h2" className="text-base">
          Current workspace
        </Card.Title>
        <Card.Description>The workspace everything you do here belongs to.</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="flex items-center gap-4">
          <Avatar size="md" title={organization.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-12">{organization.name}</p>
            <p className="truncate text-sm text-neutral-11">{organization.slug}</p>
          </div>
          {membership?.role ? <Badge variant="gray">{formatRole(membership.role)}</Badge> : null}
        </div>
      </Card.Content>
    </Card>
  );
}
