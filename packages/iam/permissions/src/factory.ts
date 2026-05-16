import { logger } from "@nebutra/logger";
import { CASLProvider } from "./providers/casl";
import { OpenFGAProvider } from "./providers/openfga";
import { getDefaultRoles } from "./roles";
import type {
  Action,
  PermissionConfig,
  PermissionContext,
  PermissionProvider,
  PermissionProviderType,
  PermissionRule,
  Resource,
  RoleDefinition,
} from "./types";

let permissionsInstance: PermissionsManager | null = null;

export class PermissionsManager {
  private provider: PermissionProvider;
  private providerType: PermissionProviderType;

  constructor(config?: PermissionConfig) {
    const detectedType = this.detectProvider(config?.provider);
    this.providerType = detectedType;

    const roles = config?.roles || getDefaultRoles();

    if (detectedType === "openfga") {
      // exactOptionalPropertyTypes: only set keys that have defined values so
      // the optional `?:` modifier on OpenFGAProviderConfig stays satisfied.
      const openFgaConfig: {
        apiUrl?: string;
        authToken?: string;
        storeId?: string;
      } = {};
      if (config?.openFgaApiUrl !== undefined) openFgaConfig.apiUrl = config.openFgaApiUrl;
      if (config?.openFgaAuthToken !== undefined) openFgaConfig.authToken = config.openFgaAuthToken;
      if (config?.openFgaStoreId !== undefined) openFgaConfig.storeId = config.openFgaStoreId;
      this.provider = new OpenFGAProvider(openFgaConfig, roles);
      logger.info("Initialized OpenFGA permissions provider");
    } else {
      this.provider = new CASLProvider(roles);
      logger.info("Initialized CASL permissions provider");
    }
  }

  private detectProvider(explicit?: PermissionProviderType): PermissionProviderType {
    if (explicit) {
      return explicit;
    }

    if (process.env.PERMISSIONS_PROVIDER) {
      const provider = process.env.PERMISSIONS_PROVIDER as PermissionProviderType;
      if (["casl", "openfga"].includes(provider)) {
        return provider;
      }
    }

    if (process.env.OPENFGA_API_URL) {
      return "openfga";
    }

    return "casl";
  }

  getProviderType(): PermissionProviderType {
    return this.providerType;
  }

  can(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
    field?: string,
  ): boolean {
    return this.provider.can(context, action, resource, subject, field);
  }

  cannot(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
    field?: string,
  ): boolean {
    return this.provider.cannot(context, action, resource, subject, field);
  }

  getRulesForRole(role: string): PermissionRule[] {
    return this.provider.getRulesForRole(role);
  }

  defineRole(definition: RoleDefinition): void {
    this.provider.defineRole(definition);
  }

  buildAbilityFor(context: PermissionContext): unknown {
    return this.provider.buildAbilityFor(context);
  }

  getProvider(): PermissionProvider {
    return this.provider;
  }
}

export function createPermissions(config?: PermissionConfig): PermissionsManager {
  permissionsInstance = new PermissionsManager(config);
  return permissionsInstance;
}

export function getPermissions(): PermissionsManager {
  if (!permissionsInstance) {
    permissionsInstance = new PermissionsManager();
  }
  return permissionsInstance;
}

export function resetPermissions(): void {
  permissionsInstance = null;
}
