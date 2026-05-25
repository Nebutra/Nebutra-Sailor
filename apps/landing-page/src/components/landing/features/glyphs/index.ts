/**
 * Sub-package glyph registry — 104 bespoke ~160px thumbnails.
 *
 * Coverage: 100% of the slugs that appear as children of any group on
 * `/[lang]/features/[group]`. Each glyph is a custom mini-visual hinting
 * at what its sub-package does, rendered as the hero band of the
 * sub-package card on the parent group's detail page.
 *
 * Lookup: `getSubpackageGlyph(slug)` → component or null.
 */

import { ThreeDPipelineGlyph } from "./3d-pipeline-glyph";
import { AccessGateGlyph } from "./access-gate-glyph";
import { AdminToolingGlyph } from "./admin-tooling-glyph";
import { AgentRuntimeGlyph } from "./agent-runtime-glyph";
import { AgentsGlyph } from "./agents-glyph";
import { AiPrimitivesGlyph } from "./ai-primitives-glyph";
import { AiProvidersGlyph } from "./ai-providers-glyph";
import { AlertingGlyph } from "./alerting-glyph";
import { AnalyticsGlyph } from "./analytics-glyph";
import { AtelierCanvasGlyph } from "./atelier-canvas-glyph";
import { AudioPipelineGlyph } from "./audio-pipeline-glyph";
import { AuditGlyph } from "./audit-glyph";
import { AuthGlyph } from "./auth-glyph";
import { BillingGlyph } from "./billing-glyph";
import { BrandGenesisGlyph } from "./brand-genesis-glyph";
import { BrandGlyph } from "./brand-glyph";
import { BrowserControlGlyph } from "./browser-control-glyph";
import { CacheGlyph } from "./cache-glyph";
import { CapabilityKitGlyph } from "./capability-kit-glyph";
import { CaptchaGlyph } from "./captcha-glyph";
import { ChinaComplianceGlyph } from "./china-compliance-glyph";
import { CinemaGlyph } from "./cinema-glyph";
import { CliGlyph } from "./cli-glyph";
import { CodeExecutionGlyph } from "./code-execution-glyph";
import { CodeIndexGlyph } from "./code-index-glyph";
import { CofounderMatchGlyph } from "./cofounder-match-glyph";
import { CollabGlyph } from "./collab-glyph";
import { ConfigGlyph } from "./config-glyph";
import { ContentStoreGlyph } from "./content-store-glyph";
import { ContractsGlyph } from "./contracts-glyph";
import { CreateSailorGlyph } from "./create-sailor-glyph";
import { DbGlyph } from "./db-glyph";
import { DesignSyncGlyph } from "./design-sync-glyph";
import { DesignTokensGlyph } from "./design-tokens-glyph";
import { DocumentPipelineGlyph } from "./document-pipeline-glyph";
import { EcosystemSafetyGlyph } from "./ecosystem-safety-glyph";
import { EmailGlyph } from "./email-glyph";
import { ErrorsGlyph } from "./errors-glyph";
import { EventBusGlyph } from "./event-bus-glyph";
import { EventLogGlyph } from "./event-log-glyph";
import { ExecutionPolicyGlyph } from "./execution-policy-glyph";
import { FeatureFlagsGlyph } from "./feature-flags-glyph";
import { FounderCemeteryGlyph } from "./founder-cemetery-glyph";
import { GatewayCoreGlyph } from "./gateway-core-glyph";
import { GenerationContextGlyph } from "./generation-context-glyph";
import { GraphModelGlyph } from "./graph-model-glyph";
import { HealthGlyph } from "./health-glyph";
import { I18nGlyph } from "./i18n-glyph";
import { IconsGlyph } from "./icons-glyph";
import { IdeaPlazaGlyph } from "./idea-plaza-glyph";
import { IdentityGlyph } from "./identity-glyph";
import { ImagePipelineGlyph } from "./image-pipeline-glyph";
import { IntegrationVaultGlyph } from "./integration-vault-glyph";
import { KnowledgeBaseGlyph } from "./knowledge-base-glyph";
import { KnowledgeGraphGlyph } from "./knowledge-graph-glyph";
import { KnowledgeRagGlyph } from "./knowledge-rag-glyph";
import { LandingBuilderGlyph } from "./landing-builder-glyph";
import { LegalGlyph } from "./legal-glyph";
import { LicenseGlyph } from "./license-glyph";
import { LlmGatewayGlyph } from "./llm-gateway-glyph";
import { LocalEmbeddingGlyph } from "./local-embedding-glyph";
import { LoggerGlyph } from "./logger-glyph";
import { MarketingGlyph } from "./marketing-glyph";
import { McpGlyph } from "./mcp-glyph";
import { MeteringGlyph } from "./metering-glyph";
import { NotificationsGlyph } from "./notifications-glyph";
import { OauthServerGlyph } from "./oauth-server-glyph";
import { OnboardingGlyph } from "./onboarding-glyph";
import { OutreachEngineGlyph } from "./outreach-engine-glyph";
import { PermissionsGlyph } from "./permissions-glyph";
import { PlayLoaderGlyph } from "./play-loader-glyph";
import { PlayMarketplaceGlyph } from "./play-marketplace-glyph";
import { PresetGlyph } from "./preset-glyph";
import { ProviderFactoryGlyph } from "./provider-factory-glyph";
import { ProviderRegistryGlyph } from "./provider-registry-glyph";
import { QueueGlyph } from "./queue-glyph";
import { RateLimitGlyph } from "./rate-limit-glyph";
import { ReelGlyph } from "./reel-glyph";
import { RepositoriesGlyph } from "./repositories-glyph";
import { SagaGlyph } from "./saga-glyph";
import { SandboxRuntimeGlyph } from "./sandbox-runtime-glyph";
import { SanityGlyph } from "./sanity-glyph";
import { SearchGlyph } from "./search-glyph";
import { SmsGlyph } from "./sms-glyph";
import { StatusGlyph } from "./status-glyph";
import { StorageGlyph } from "./storage-glyph";
import { SupabaseGlyph } from "./supabase-glyph";
import { SupportDeflectorGlyph } from "./support-deflector-glyph";
import { TenantGlyph } from "./tenant-glyph";
import { TenantStoreGlyph } from "./tenant-store-glyph";
import { ThemeGlyph } from "./theme-glyph";
import { TimeMachineGlyph } from "./time-machine-glyph";
import { TokensGlyph } from "./tokens-glyph";
import { ToolRegistryGlyph } from "./tool-registry-glyph";
import { TraceStoreGlyph } from "./trace-store-glyph";
import { TtsGlyph } from "./tts-glyph";
import type { SubpackageGlyph } from "./types";
import { UiGlyph } from "./ui-glyph";
import { UploadsGlyph } from "./uploads-glyph";
import { VaultGlyph } from "./vault-glyph";
import { VideoComposeGlyph } from "./video-compose-glyph";
import { VideoPipelineGlyph } from "./video-pipeline-glyph";
import { VoiceRealtimeGlyph } from "./voice-realtime-glyph";
import { WaitlistGlyph } from "./waitlist-glyph";
import { WebhooksGlyph } from "./webhooks-glyph";

export type { SubpackageGlyph, SubpackageGlyphProps } from "./types";

export const SUBPACKAGE_GLYPHS: Record<string, SubpackageGlyph> = {
  "3d-pipeline": ThreeDPipelineGlyph,
  "access-gate": AccessGateGlyph,
  "admin-tooling": AdminToolingGlyph,
  "agent-runtime": AgentRuntimeGlyph,
  agents: AgentsGlyph,
  "ai-primitives": AiPrimitivesGlyph,
  "ai-providers": AiProvidersGlyph,
  alerting: AlertingGlyph,
  analytics: AnalyticsGlyph,
  "atelier-canvas": AtelierCanvasGlyph,
  "audio-pipeline": AudioPipelineGlyph,
  audit: AuditGlyph,
  auth: AuthGlyph,
  billing: BillingGlyph,
  brand: BrandGlyph,
  "brand-genesis": BrandGenesisGlyph,
  "browser-control": BrowserControlGlyph,
  cache: CacheGlyph,
  "capability-kit": CapabilityKitGlyph,
  captcha: CaptchaGlyph,
  "china-compliance": ChinaComplianceGlyph,
  cinema: CinemaGlyph,
  cli: CliGlyph,
  "code-execution": CodeExecutionGlyph,
  "code-index": CodeIndexGlyph,
  "cofounder-match": CofounderMatchGlyph,
  collab: CollabGlyph,
  config: ConfigGlyph,
  "content-store": ContentStoreGlyph,
  contracts: ContractsGlyph,
  "create-sailor": CreateSailorGlyph,
  db: DbGlyph,
  "design-sync": DesignSyncGlyph,
  "design-tokens": DesignTokensGlyph,
  "document-pipeline": DocumentPipelineGlyph,
  "ecosystem-safety": EcosystemSafetyGlyph,
  email: EmailGlyph,
  errors: ErrorsGlyph,
  "event-bus": EventBusGlyph,
  "event-log": EventLogGlyph,
  "execution-policy": ExecutionPolicyGlyph,
  "feature-flags": FeatureFlagsGlyph,
  "founder-cemetery": FounderCemeteryGlyph,
  "gateway-core": GatewayCoreGlyph,
  "generation-context": GenerationContextGlyph,
  "graph-model": GraphModelGlyph,
  health: HealthGlyph,
  i18n: I18nGlyph,
  icons: IconsGlyph,
  "idea-plaza": IdeaPlazaGlyph,
  identity: IdentityGlyph,
  "image-pipeline": ImagePipelineGlyph,
  "integration-vault": IntegrationVaultGlyph,
  "knowledge-base": KnowledgeBaseGlyph,
  "knowledge-graph": KnowledgeGraphGlyph,
  "knowledge-rag": KnowledgeRagGlyph,
  "landing-builder": LandingBuilderGlyph,
  legal: LegalGlyph,
  license: LicenseGlyph,
  "llm-gateway": LlmGatewayGlyph,
  "local-embedding": LocalEmbeddingGlyph,
  logger: LoggerGlyph,
  marketing: MarketingGlyph,
  mcp: McpGlyph,
  metering: MeteringGlyph,
  notifications: NotificationsGlyph,
  "oauth-server": OauthServerGlyph,
  onboarding: OnboardingGlyph,
  "outreach-engine": OutreachEngineGlyph,
  permissions: PermissionsGlyph,
  "play-loader": PlayLoaderGlyph,
  "play-marketplace": PlayMarketplaceGlyph,
  preset: PresetGlyph,
  "provider-factory": ProviderFactoryGlyph,
  "provider-registry": ProviderRegistryGlyph,
  queue: QueueGlyph,
  "rate-limit": RateLimitGlyph,
  reel: ReelGlyph,
  repositories: RepositoriesGlyph,
  saga: SagaGlyph,
  "sandbox-runtime": SandboxRuntimeGlyph,
  sanity: SanityGlyph,
  search: SearchGlyph,
  sms: SmsGlyph,
  status: StatusGlyph,
  storage: StorageGlyph,
  supabase: SupabaseGlyph,
  "support-deflector": SupportDeflectorGlyph,
  tenant: TenantGlyph,
  "tenant-store": TenantStoreGlyph,
  theme: ThemeGlyph,
  "time-machine": TimeMachineGlyph,
  tokens: TokensGlyph,
  "tool-registry": ToolRegistryGlyph,
  "trace-store": TraceStoreGlyph,
  tts: TtsGlyph,
  ui: UiGlyph,
  uploads: UploadsGlyph,
  vault: VaultGlyph,
  "video-compose": VideoComposeGlyph,
  "video-pipeline": VideoPipelineGlyph,
  "voice-realtime": VoiceRealtimeGlyph,
  waitlist: WaitlistGlyph,
  webhooks: WebhooksGlyph,
};

export function getSubpackageGlyph(slug: string): SubpackageGlyph | null {
  return SUBPACKAGE_GLYPHS[slug] ?? null;
}
