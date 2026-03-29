import { logger } from "@nebutra/logger";
import { CASLProvider } from "./providers/casl.js";
import { OpenFGAProvider } from "./providers/openfga.js";
import { getDefaultRoles } from "./roles.js";
import type {
  Action,
  PermissionConfig,
  PermissionContext,
  PermissionProvider,
  PermissionProviderType,
  Resource,
  RoleDefinition,
} from "./types.js";

let permissionsInstance: PermissionsManager | null = null;

export class PermissionsManager {
  private provider: PermissionProvider;
  private providerType: PermissionProviderType;

  constructor(config?: PermissionConfig) {
    const detectedType = this.detectProvider(config?.provider);
    this.providerType = detectedType;

    const roles = config?.roles || getDefaultRoles();

    if (detectedType === "openfga") {
      this.provider = new OpenFGAProvider(config?.openFgaApiUrl, roles);
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

  can(context: PermissionContext, action: Action, resource: Resource, subject?: unknown): boolean {
    return this.provider.can(context, action, resource, subject);
  }

  cannot(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
  ): boolean {
    return this.provider.cannot(context, action, resource, subject);
  }

  getRulesForRole(role: string): any[] {
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
