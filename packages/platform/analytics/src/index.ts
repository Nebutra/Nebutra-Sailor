// Legacy Dub-based link attribution client
export {
  AnalyticsClient,
  analytics,
  analytics as default,
  createAnalyticsClient,
  getAnalyticsClient,
} from "./client";
// Product analytics — typed event contracts (PostHog CE / Umami)
export * from "./events";
export {
  type AnalyticsClientOptions,
  createProductAnalyticsClient,
  type ProductAnalyticsClient,
  type TrackResult,
} from "./track";
export * from "./types";
export {
  createUmamiProxyHandler,
  type UmamiProxyConfig,
  type UmamiProxyHandler,
} from "./umami-proxy";
