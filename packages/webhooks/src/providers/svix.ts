import { logger } from "@nebutra/logger";
import { type ApplicationIn, Svix } from "svix";
import { verifyPayload } from "../signing.js";
import type {
  WebhookDeliveryAttempt,
  WebhookEndpoint,
  WebhookMessage,
  WebhookProvider,
} from "../types.js";

// =============================================================================
// Svix Webhook Provider — Managed webhook infrastructure
// =============================================================================
// Svix handles all the hard parts: retry logic, rate-limiting, signing,
// delivery tracking, and multi-tenant application management.
//
// One Svix Application per tenant (isolated webhook namespaces).
// =============================================================================

interface SvixProviderOptions {
  apiKey?: string;
  serverUrl?: string;
}

export class SvixProvider implements WebhookProvider {
  readonly name = "svix" as const;
  private client: Svix;
  private applicationCache: Map<string, string> = new Map(); // tenantId -> appId

  constructor(options: SvixProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.SVIX_API_KEY;
    if (!apiKey) {
      throw new Error("Svix API key required: set SVIX_API_KEY or pass apiKey option");
    }

    this.client = new Svix(apiKey, {
      ...(options.serverUrl !== undefined ? { serverUrl: options.serverUrl } : {}),
    });

    logger.info("[webhooks:svix] Provider initialized");
  }

  /**
   * Get or create the Svix Application for a tenant.
   * Svix Applications provide isolated webhook namespaces.
   */
  private async getOrCreateApplication(tenantId: string): Promise<string> {
    // Check cache first
    const cached = this.applicationCache.get(tenantId);
    if (cached) {
      return cached;
    }

    try {
      // Try to find existing application by name (tenantId)
      // Note: Svix doesn't have a direct "get by name" API, so we create one
      // For production, you'd want a mapping table (Postgres, etc.)
      const app = await this.client.application.create({
        name: tenantId,
        rateLimit: 1000, // reasonable default
      } as ApplicationIn);

      this.applicationCache.set(tenantId, app.id);
      logger.info("[webhooks:svix] Created application for tenant", { tenantId, appId: app.id });
      return app.id;
    } catch (error) {
      if (
        (error as any)?.code === "conflict" ||
        (error as any)?.message?.includes("already exists")
      ) {
        // Application already exists, try to list and find it
        logger.debug("[webhooks:svix] Application already exists, searching by name...", {
          tenantId,
        });
        // This is a limitation: Svix doesn't expose list/search by name easily
        // For now, throw and let caller handle retry/cache logic
        throw error;
      }
      throw error;
    }
  }

  async createEndpoint(
    tenantId: string,
    endpoint: Omit<WebhookEndpoint, "id" | "secret" | "createdAt">,
  ): Promise<WebhookEndpoint> {
    const appId = await this.getOrCreateApplication(tenantId);

    // Filter events: if empty array, subscribe to all (null = all in Svix v1.x)
    const filterTypes = endpoint.eventTypes?.length ? endpoint.eventTypes : null;

    const svixEndpoint = await this.client.endpoint.create(appId, {
      url: endpoint.url,
      ...(filterTypes !== null ? { filterTypes } : {}),
      description: `Tenant: ${tenantId}`,
      disabled: !endpoint.active,
    });

    logger.info("[webhooks:svix] Created endpoint", {
      appId,
      endpointId: svixEndpoint.id,
      url: endpoint.url,
    });

    // Retrieve the signing secret for this endpoint
    const secretOut = await this.client.endpoint.getSecret(appId, svixEndpoint.id);

    return {
      id: svixEndpoint.id,
      url: svixEndpoint.url,
      tenantId,
      secret: secretOut.key,
      eventTypes: svixEndpoint.filterTypes ?? [],
      active: !svixEndpoint.disabled,
      createdAt: new Date(svixEndpoint.createdAt).toISOString(),
      metadata: endpoint.metadata,
    };
  }

  async updateEndpoint(
    _endpointId: string,
    _updates: Partial<Omit<WebhookEndpoint, "id" | "secret" | "tenantId" | "createdAt">>,
  ): Promise<WebhookEndpoint> {
    // Note: Svix API requires appId to update an endpoint
    // In a real implementation, you'd need to track appId per endpointId in your DB
    throw new Error(
      "[webhooks:svix] updateEndpoint requires tenant context. Use SvixProvider with pre-configured app mapping.",
    );
  }

  async deleteEndpoint(_endpointId: string): Promise<void> {
    throw new Error(
      "[webhooks:svix] deleteEndpoint requires tenant context. Use SvixProvider with pre-configured app mapping.",
    );
  }

  async listEndpoints(tenantId: string): Promise<WebhookEndpoint[]> {
    const appId = await this.getOrCreateApplication(tenantId);

    const endpoints = await this.client.endpoint.list(appId);

    return endpoints.data.map((ep: any) => ({
      id: ep.id,
      url: ep.url,
      tenantId,
      secret: "", // Secret not returned in list; use getSecret(appId, ep.id) if needed
      eventTypes: ep.filterTypes ?? [],
      active: !ep.disabled,
      createdAt: new Date(ep.createdAt).toISOString(),
    }));
  }

  async sendEvent(event: Omit<WebhookMessage, "id" | "timestamp">): Promise<string> {
    const appId = await this.getOrCreateApplication(event.tenantId);

    // Svix Message = our WebhookMessage
    const message = await this.client.message.create(appId, {
      eventType: event.eventType,
      payload: event.payload,
    });

    logger.info("[webhooks:svix] Event sent", {
      messageId: message.id,
      eventType: event.eventType,
    });
    return message.id;
  }

  async getDeliveryAttempts(_messageId: string): Promise<WebhookDeliveryAttempt[]> {
    throw new Error(
      "[webhooks:svix] getDeliveryAttempts requires app context. Use SvixProvider with pre-configured app mapping.",
    );
  }

  async retryMessage(_messageId: string, _endpointId: string): Promise<void> {
    throw new Error(
      "[webhooks:svix] retryMessage requires app context. Use SvixProvider with pre-configured app mapping.",
    );
  }

  async rotateSecret(_endpointId: string): Promise<string> {
    throw new Error(
      "[webhooks:svix] rotateSecret requires app context. Use SvixProvider with pre-configured app mapping.",
    );
  }

  async verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
    // Svix uses a specific signature format. For now, use standard HMAC verification.
    // In production, you'd use Svix's own verification (svix.message.verifyContent)
    try {
      const header = signature.startsWith("whsec_") ? signature : `whsec_${signature}`;
      const parts = header.split(".");

      if (parts.length !== 3) {
        return false;
      }

      const [, timestamp, sig] = parts as [string, string, string];

      // Use our signing module for verification
      return verifyPayload(payload, sig, secret, timestamp);
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    logger.info("[webhooks:svix] Closing provider");
    this.applicationCache.clear();
  }
}
