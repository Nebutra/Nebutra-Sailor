import type { AIProvider, PrismaClient, TenantProviderKey } from "@nebutra/db";

/**
 * Plaintext credential shape stored (encrypted at rest) in
 * `TenantProviderKey.credentials`. The @nebutra/db client extension transparently
 * encrypts on write and decrypts on read, so this repository always sees plaintext.
 */
export interface ProviderKeyCredentials {
  apiKey: string;
  /** Optional custom base URL (e.g. self-hosted / proxy / Azure endpoint). */
  baseUrl?: string;
}

export interface UpsertProviderKeyData {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  label?: string;
  /** "Always use this key" — never fall back to the platform key for this provider. */
  alwaysUse?: boolean;
}

/**
 * Resolved BYOK key for the AI layer — the decrypted secret plus the
 * fallback policy flag. `null` from `resolveForProvider` means "no tenant key,
 * use the platform key".
 */
export interface ResolvedProviderKey {
  apiKey: string;
  baseUrl?: string;
  /** When true, callers must NOT fall back to the platform key. */
  alwaysUse: boolean;
}

/**
 * Repository seam for customer-owned AI provider keys (BYOK).
 *
 * Provider keys are secrets in a core, multi-tenant domain, so they go through
 * the repository seam (per CLAUDE.md). Construct with a tenant-scoped client
 * (`getTenantDb(tenantId)`); RLS + the encrypt/decrypt client extension are
 * applied transparently. `getDecrypted` / `resolveForProvider` are the only
 * methods that expose plaintext — call them from the AI key-resolution path,
 * never to render the key back to the UI.
 */
export class TenantProviderKeyRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  /** All keys for the tenant, with credentials decrypted. Newest first. */
  async list(): Promise<TenantProviderKey[]> {
    return this.prisma.tenantProviderKey.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByProvider(provider: AIProvider): Promise<TenantProviderKey | null> {
    return this.prisma.tenantProviderKey.findUnique({
      where: { tenantId_provider: { tenantId: this.tenantId, provider } },
    });
  }

  /**
   * Create or replace the tenant's key for a provider (one key per provider).
   * The plaintext `apiKey`/`baseUrl` are encrypted on write by the db extension.
   */
  async upsert(data: UpsertProviderKeyData): Promise<TenantProviderKey> {
    const credentials: ProviderKeyCredentials = {
      apiKey: data.apiKey,
      ...(data.baseUrl ? { baseUrl: data.baseUrl } : {}),
    };
    const label = data.label ?? "";
    const alwaysUse = data.alwaysUse ?? false;

    return this.prisma.tenantProviderKey.upsert({
      where: { tenantId_provider: { tenantId: this.tenantId, provider: data.provider } },
      create: {
        tenantId: this.tenantId,
        provider: data.provider,
        label,
        alwaysUse,
        credentials: credentials as unknown as object,
      },
      update: {
        label,
        alwaysUse,
        isActive: true,
        credentials: credentials as unknown as object,
      },
    });
  }

  /** Toggle the per-key "Always use this key" flag. */
  async setAlwaysUse(provider: AIProvider, alwaysUse: boolean): Promise<TenantProviderKey> {
    return this.prisma.tenantProviderKey.update({
      where: { tenantId_provider: { tenantId: this.tenantId, provider } },
      data: { alwaysUse },
    });
  }

  async delete(provider: AIProvider): Promise<void> {
    await this.prisma.tenantProviderKey.delete({
      where: { tenantId_provider: { tenantId: this.tenantId, provider } },
    });
  }

  /**
   * Resolve the decrypted key for the AI layer. Returns `null` when the tenant
   * has no active key for the provider (→ caller falls back to the platform key,
   * unless a returned key sets `alwaysUse`). The plaintext never leaves the
   * server boundary.
   */
  async resolveForProvider(provider: AIProvider): Promise<ResolvedProviderKey | null> {
    const row = await this.findByProvider(provider);
    if (!row || !row.isActive) return null;

    const creds = row.credentials as unknown as ProviderKeyCredentials | null;
    if (!creds || typeof creds.apiKey !== "string" || creds.apiKey.length === 0) {
      // Decrypt failed (nulled by the extension) or empty — treat as no key.
      return null;
    }

    return {
      apiKey: creds.apiKey,
      ...(creds.baseUrl ? { baseUrl: creds.baseUrl } : {}),
      alwaysUse: row.alwaysUse,
    };
  }
}
