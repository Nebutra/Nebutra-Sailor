// @nebutra/preset — public API

export type {
  BillingSubject,
  CheckoutMode,
  NotificationChannelPreset,
  NotificationSurface,
  OnboardingFlow,
  ProductCapabilities,
  WorkspaceMode,
} from "./capabilities";
export { resolveProductCapabilities } from "./capabilities";
// Config schema and types
export {
  ApiProtocolId,
  AppId,
  AuthProviderId,
  defineConfig,
  FeatureId,
  type NebutraConfig,
  type NebutraConfigInput,
  NebutraConfigSchema,
  type ResolvedConfig,
  resolveConfig,
  ThemeId,
} from "./config";
// Deployment target selector
export {
  DEPLOYABLE_SERVICES,
  type DeployableService,
  type DeploySurface,
  type DeployTarget,
  type DeployTargetEnv,
  type DeployTargetMap,
  type DeployTargetOverrides,
  deployTargetEnvKey,
  getDefaultDeployTarget,
  getDefaultDeployTargets,
  getDeploySurface,
  isDeployableService,
  resolveDeployTarget,
  resolveDeployTargetConfig,
  resolveDeployTargets,
  TARGETS_BY_SURFACE,
} from "./deploy-target";
// Feature map
export {
  getActiveApps,
  getActivePackages,
  getFeatureEnvVars,
} from "./feature-map";
