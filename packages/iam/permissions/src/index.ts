export {
  createPermissions,
  getPermissions,
  PermissionsManager,
  resetPermissions,
} from "./factory";
export {
  attachPermissionContext,
  type RequirePermissionOptions,
  requirePermission,
} from "./middleware";

export {
  buildAbilityFor,
  CASLProvider,
  createCASLProvider,
  createPrismaAbility,
  getPrismaQuery,
} from "./providers/casl";

export {
  createOpenFGAProvider,
  type OpenFGACheckRequest,
  type OpenFGACheckResponse,
  type OpenFGAListObjectsRequest,
  OpenFGAProvider,
  type OpenFGAProviderConfig,
  type OpenFGATuple,
  type OpenFGAWriteRequest,
} from "./providers/openfga";
export {
  Can,
  Cannot,
  type CannotProps,
  type CanProps,
  PermissionProvider as PermissionProviderComponent,
  type PermissionProviderProps,
  type UsePermissionOptions,
  usePermission,
  usePermissionContext,
} from "./react";
export {
  DEFAULT_ROLES,
  getDefaultRoles,
  getRoleDefinition,
  getRoleHierarchy,
} from "./roles";
export {
  type AbilityOptions,
  type Action,
  ForbiddenError,
  type PermissionConfig,
  type PermissionContext,
  type PermissionProvider,
  type PermissionProviderType,
  type PermissionRule,
  type Resource,
  type Role,
  type RoleDefinition,
} from "./types";
