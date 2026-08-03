export type ResolverHit = {
  ip: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Last query names that hit this recursive (capped). */
  sampleNames: string[];
};

export type LeakSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  /** Fully-qualified probe names the browser should resolve via system DNS. */
  probeNames: string[];
  zone: string;
  answerIp: string;
  hits: Map<string, ResolverHit>;
  queryCount: number;
};

export type LeakSessionPublic = {
  id: string;
  createdAt: string;
  expiresAt: string;
  probeNames: string[];
  zone: string;
  answerIp: string;
  queryCount: number;
  resolvers: ResolverHit[];
  /** True when at least one recursive has been observed. */
  ready: boolean;
  infrastructure: true;
};

export type CreateSessionOptions = {
  probeCount?: number;
  ttlSec?: number;
};
