export interface ToolConsentGrant {
  readonly tenantId: string;
  readonly userId?: string;
  readonly serverId: string;
  readonly toolName: string;
  readonly scopes: readonly string[];
}

export interface ToolConsentStore {
  grant(grant: ToolConsentGrant): Promise<void>;
  hasConsent(grant: ToolConsentGrant): Promise<boolean>;
  list(tenantId?: string): Promise<ToolConsentGrant[]>;
}

function consentKey(grant: Omit<ToolConsentGrant, "scopes">): string {
  return [grant.tenantId, grant.userId ?? "*", grant.serverId, grant.toolName].join(":");
}

export class InMemoryToolConsentStore implements ToolConsentStore {
  readonly #grants = new Map<string, ToolConsentGrant>();

  async grant(grant: ToolConsentGrant): Promise<void> {
    this.#grants.set(consentKey(grant), { ...grant, scopes: [...grant.scopes] });
  }

  async hasConsent(grant: ToolConsentGrant): Promise<boolean> {
    const exact = this.#grants.get(consentKey(grant));
    const wildcard = this.#grants.get(
      consentKey({
        tenantId: grant.tenantId,
        serverId: grant.serverId,
        toolName: grant.toolName,
      }),
    );
    const existing = exact ?? wildcard;
    if (!existing) return false;
    const scopes = new Set(existing.scopes);
    return grant.scopes.every((scope) => scopes.has(scope));
  }

  async list(tenantId?: string): Promise<ToolConsentGrant[]> {
    return Array.from(this.#grants.values()).filter(
      (grant) => tenantId === undefined || grant.tenantId === tenantId,
    );
  }
}
