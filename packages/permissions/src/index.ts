export {
  createPermissions,
  getPermissions,
  PermissionsManager,
  resetPermissions,
} from "./factory.js";
export {
  attachPermissionContext,
  type RequirePermissionOptions,
  requirePermission,
} from "./middleware.js";

export {
  buildAbilityFor,
  CASLProvider,
  createCASLProvider,
  createPrismaAbility,
  getPrismaQuery,
} from "./providers/casl.js";

export {
  createOpenFGAProvider,
  type OpenFGACheckRequest,
  type OpenFGACheckResponse,
  type OpenFGAListObjectsRequest,
  OpenFGAProvider,
  type OpenFGATuple,
  type OpenFGAWriteRequest,
} from "./providers/openfga.js";
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
} from "./react.js";
export {
  DEFAULT_ROLES,
  getDefaultRoles,
  getRoleDefinition,
  getRoleHierarchy,
} from "./roles.js";
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
} from "./types.js";
