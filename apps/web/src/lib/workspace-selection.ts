export interface WorkspaceSelectionOption {
  id: string;
}

interface ResolvePreferredWorkspaceIdInput {
  options: ReadonlyArray<WorkspaceSelectionOption>;
  sessionOrganizationId?: string | null;
  storedOrganizationId?: string | null;
}

export function resolvePreferredWorkspaceId({
  options,
  sessionOrganizationId,
  storedOrganizationId,
}: ResolvePreferredWorkspaceIdInput): string | null {
  if (sessionOrganizationId) {
    return sessionOrganizationId;
  }

  if (storedOrganizationId && options.some((option) => option.id === storedOrganizationId)) {
    return storedOrganizationId;
  }

  return options[0]?.id ?? null;
}
