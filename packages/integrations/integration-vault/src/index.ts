import { randomUUID } from "node:crypto";
import { CapabilityError } from "@nebutra/errors";
import { type EncryptedSecret, LocalProvider, type VaultProvider } from "@nebutra/vault";

export { CapabilityError } from "@nebutra/errors";

export interface OAuthStartRequest {
  readonly app: string;
  readonly tenantId: string;
  readonly scopes?: readonly string[];
}

export interface OAuthStartResult {
  readonly provider: string;
  readonly app: string;
  readonly url: string;
  readonly state: string;
  readonly scopes: readonly string[];
}

export interface ConnectTokenRequest {
  readonly tenantId: string;
  readonly app: string;
  readonly accessToken: string;
  readonly scopes: readonly string[];
  readonly provider?: string;
}

export interface InvokeRequest {
  readonly tenantId: string;
  readonly app: string;
  readonly action: string;
  readonly args: Record<string, unknown>;
}

export interface InvokeResult {
  readonly ok: boolean;
  readonly provider?: string;
  readonly result?: unknown;
  readonly suggestion?: string;
  readonly error?: string;
}

export interface IntegrationConnection {
  readonly id: string;
  readonly tenantId: string;
  readonly app: string;
  readonly provider: string;
  readonly tokenId: string;
  readonly scopes: readonly string[];
  readonly encrypted: EncryptedSecret;
  readonly connectedAt: string;
}

export interface ListedConnection {
  readonly id: string;
  readonly app: string;
  readonly provider: string;
  readonly tokenId: string;
  readonly scopes: readonly string[];
  readonly connectedAt: string;
}

export interface IntegrationProvider {
  readonly id: string;
  supports(app: string): boolean;
  startOAuth(request: OAuthStartRequest): Promise<OAuthStartResult>;
  invoke(request: InvokeRequest, token: string, scopes: readonly string[]): Promise<unknown>;
  doctor(): Promise<{ ok: boolean; provider: string; suggestion?: string }>;
}

export interface SaasConsentGrant {
  readonly tenantId: string;
  readonly app: string;
  readonly action: string;
  readonly scopes: readonly string[];
}

export interface SaasConsentStore {
  grant(grant: SaasConsentGrant): Promise<void>;
  hasConsent(grant: SaasConsentGrant): Promise<boolean>;
  list(tenantId?: string): Promise<SaasConsentGrant[]>;
}

export interface IntegrationVaultOptions {
  readonly vault?: VaultProvider;
  readonly providers?: readonly IntegrationProvider[];
  readonly consent?: SaasConsentStore;
}

function requireTenant(tenantId: string): void {
  if (!tenantId.trim()) {
    throw new CapabilityError("integration-vault", "Tenant context is required", {
      suggestion:
        "Pass tenantId from the Sailor tenant context before starting OAuth or invoking SaaS tools.",
      statusCode: 400,
    });
  }
}

function consentKey(grant: Omit<SaasConsentGrant, "scopes">): string {
  return [grant.tenantId, grant.app, grant.action].join(":");
}

export class InMemorySaasConsentStore implements SaasConsentStore {
  readonly #grants = new Map<string, SaasConsentGrant>();

  async grant(grant: SaasConsentGrant): Promise<void> {
    this.#grants.set(consentKey(grant), { ...grant, scopes: [...grant.scopes] });
  }

  async hasConsent(grant: SaasConsentGrant): Promise<boolean> {
    const existing = this.#grants.get(consentKey(grant));
    if (!existing) return false;
    const scopes = new Set(existing.scopes);
    return grant.scopes.every((scope) => scopes.has(scope));
  }

  async list(tenantId?: string): Promise<SaasConsentGrant[]> {
    return Array.from(this.#grants.values()).filter(
      (grant) => tenantId === undefined || grant.tenantId === tenantId,
    );
  }
}

export class InMemoryIntegrationProvider implements IntegrationProvider {
  readonly id: string;
  readonly #apps: ReadonlySet<string>;

  constructor(options: { id: string; apps: readonly string[] }) {
    this.id = options.id;
    this.#apps = new Set(options.apps);
  }

  supports(app: string): boolean {
    return this.#apps.has(app) || this.#apps.has("*");
  }

  async startOAuth(request: OAuthStartRequest): Promise<OAuthStartResult> {
    return {
      provider: this.id,
      app: request.app,
      url: `http://127.0.0.1:8787/oauth/${request.app}?tenant=${request.tenantId}`,
      state: `state_${request.tenantId}_${request.app}`,
      scopes: request.scopes ?? [],
    };
  }

  async invoke(
    request: InvokeRequest,
    _token: string,
    _scopes: readonly string[],
  ): Promise<unknown> {
    return { app: request.app, action: request.action, ...request.args };
  }

  async doctor(): Promise<{ ok: boolean; provider: string }> {
    return { ok: true, provider: this.id };
  }
}

export class HttpIntegrationProvider implements IntegrationProvider {
  readonly id: string;
  readonly #baseUrl: string;
  readonly #apps: ReadonlySet<string>;
  readonly #fetch: typeof fetch;

  constructor(options: {
    id: string;
    baseUrl: string;
    apps?: readonly string[];
    fetch?: typeof fetch;
  }) {
    this.id = options.id;
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#apps = new Set(options.apps ?? ["*"]);
    this.#fetch = options.fetch ?? fetch;
  }

  supports(app: string): boolean {
    return this.#apps.has(app) || this.#apps.has("*");
  }

  async startOAuth(request: OAuthStartRequest): Promise<OAuthStartResult> {
    return {
      provider: this.id,
      app: request.app,
      url: `${this.#baseUrl}/oauth/${request.app}/start?tenant=${encodeURIComponent(request.tenantId)}`,
      state: `state_${request.tenantId}_${request.app}`,
      scopes: request.scopes ?? [],
    };
  }

  async invoke(request: InvokeRequest, token: string): Promise<unknown> {
    const response = await this.#fetch(`${this.#baseUrl}/invoke`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new CapabilityError(
        "integration-vault",
        `Provider ${this.id} returned ${response.status}`,
        {
          suggestion: "Run `pnpm vault:doctor` and refresh or reconnect this SaaS app.",
          metadata: { provider: this.id, app: request.app, status: response.status },
        },
      );
    }
    return response.json();
  }

  async doctor(): Promise<{ ok: boolean; provider: string; suggestion?: string }> {
    return {
      ok: true,
      provider: this.id,
      suggestion:
        "Network health is checked on invoke; configure provider API keys in the sidecar environment.",
    };
  }
}

class InMemoryConnectionStore {
  readonly #connections = new Map<string, IntegrationConnection>();

  upsert(connection: IntegrationConnection): IntegrationConnection {
    this.#connections.set(`${connection.tenantId}:${connection.app}`, connection);
    return connection;
  }

  get(tenantId: string, app: string): IntegrationConnection | undefined {
    return this.#connections.get(`${tenantId}:${app}`);
  }

  list(tenantId: string): ListedConnection[] {
    return Array.from(this.#connections.values())
      .filter((connection) => connection.tenantId === tenantId)
      .map((connection) => ({
        id: connection.id,
        app: connection.app,
        provider: connection.provider,
        tokenId: connection.tokenId,
        scopes: connection.scopes,
        connectedAt: connection.connectedAt,
      }));
  }
}

export class IntegrationVault {
  readonly #vault: VaultProvider;
  readonly #providers: IntegrationProvider[];
  readonly #connections = new InMemoryConnectionStore();
  readonly #consent: SaasConsentStore;

  constructor(options: IntegrationVaultOptions) {
    this.#vault =
      options.vault ??
      new LocalProvider({
        provider: "local",
        masterKey: process.env.VAULT_LOCAL_MASTER_KEY ?? "integration-vault-local-development-key",
      });
    this.#providers =
      options.providers && options.providers.length > 0
        ? [...options.providers]
        : [new InMemoryIntegrationProvider({ id: "local", apps: ["*"] })];
    this.#consent = options.consent ?? new InMemorySaasConsentStore();
  }

  static local(options: IntegrationVaultOptions = {}): IntegrationVault {
    return new IntegrationVault(options);
  }

  async startOAuth(request: OAuthStartRequest): Promise<OAuthStartResult> {
    requireTenant(request.tenantId);
    return this.#providerFor(request.app).startOAuth(request);
  }

  async connectToken(request: ConnectTokenRequest): Promise<ListedConnection> {
    requireTenant(request.tenantId);
    const provider = request.provider
      ? this.#providers.find((candidate) => candidate.id === request.provider)
      : this.#providerFor(request.app);
    if (!provider) {
      throw new CapabilityError("integration-vault", "Integration provider not found", {
        suggestion: "Configure a provider adapter before connecting this app.",
        metadata: { app: request.app, provider: request.provider },
        statusCode: 404,
      });
    }
    const tokenId = `tok_${randomUUID()}`;
    const encrypted = await this.#vault.encrypt(request.accessToken, {
      id: tokenId,
      tenantId: request.tenantId,
      metadata: { name: `${request.app}:access-token`, type: "oauth_token" },
    });
    const connection = this.#connections.upsert({
      id: `conn_${randomUUID()}`,
      tenantId: request.tenantId,
      app: request.app,
      provider: provider.id,
      tokenId,
      scopes: [...request.scopes],
      encrypted,
      connectedAt: new Date().toISOString(),
    });
    return this.#redact(connection);
  }

  async grantConsent(grant: SaasConsentGrant): Promise<void> {
    requireTenant(grant.tenantId);
    await this.#consent.grant(grant);
  }

  async invoke(request: InvokeRequest): Promise<InvokeResult> {
    requireTenant(request.tenantId);
    const connection = this.#connections.get(request.tenantId, request.app);
    if (!connection) {
      return {
        ok: false,
        error: "App is not connected",
        suggestion: `Run \`pnpm vault:connect ${request.app}\` before invoking ${request.app}.${request.action}.`,
      };
    }
    const hasConsent = await this.#consent.hasConsent({
      tenantId: request.tenantId,
      app: request.app,
      action: request.action,
      scopes: connection.scopes,
    });
    if (!hasConsent) {
      return {
        ok: false,
        error: "SaaS action is not authorized",
        suggestion: `Run \`pnpm vault:connect ${request.app}\` and grant ${request.app}.${request.action} for this tenant.`,
      };
    }
    try {
      const token = await this.#vault.decrypt(connection.encrypted, { tenantId: request.tenantId });
      const provider = this.#providerById(connection.provider);
      const result = await provider.invoke(request, token, connection.scopes);
      return { ok: true, provider: provider.id, result };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Refresh the connection or inspect provider health with `pnpm vault:doctor`.",
      };
    }
  }

  async list(tenantId: string): Promise<ListedConnection[]> {
    requireTenant(tenantId);
    return this.#connections.list(tenantId);
  }

  async doctor(): Promise<{
    ok: boolean;
    providers: Array<{ ok: boolean; provider: string; suggestion?: string }>;
  }> {
    const providers = await Promise.all(this.#providers.map((provider) => provider.doctor()));
    return { ok: providers.some((provider) => provider.ok), providers };
  }

  async close(): Promise<void> {
    await this.#vault.close();
  }

  #providerFor(app: string): IntegrationProvider {
    const provider = this.#providers.find((candidate) => candidate.supports(app));
    if (!provider) {
      throw new CapabilityError("integration-vault", "No provider supports this app", {
        suggestion: "Configure a provider adapter or local connector for this SaaS app.",
        metadata: { app },
        statusCode: 404,
      });
    }
    return provider;
  }

  #providerById(id: string): IntegrationProvider {
    const provider = this.#providers.find((candidate) => candidate.id === id);
    if (!provider) {
      throw new CapabilityError("integration-vault", "Connection provider is unavailable", {
        suggestion: "Reconnect this app or enable the provider adapter.",
        metadata: { provider: id },
        statusCode: 404,
      });
    }
    return provider;
  }

  #redact(connection: IntegrationConnection): ListedConnection {
    return {
      id: connection.id,
      app: connection.app,
      provider: connection.provider,
      tokenId: connection.tokenId,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt,
    };
  }
}

export const vault = IntegrationVault.local();
