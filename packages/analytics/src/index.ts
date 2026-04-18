// Legacy Dub-based link attribution client
export {
  AnalyticsClient,
  analytics,
  analytics as default,
  createAnalyticsClient,
  getAnalyticsClient,
} from "./client";
export * from "./types";

// Product analytics — typed event contracts (PostHog CE / Umami)
export * from "./events";
export {
  createProductAnalyticsClient,
  type AnalyticsClientOptions,
  type ProductAnalyticsClient,
  type TrackResult,
} from "./track";
export {
  createUmamiProxyHandler,
  type UmamiProxyConfig,
  type UmamiProxyHandler,
} from "./umami-proxy";
