import http from "node:http";

const PROXY_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const;

type ProxyAwareHttp = { setGlobalProxyFromEnv?: (env?: NodeJS.ProcessEnv) => unknown };

/**
 * Route fetch and http(s) through the proxy the shell already declares.
 *
 * Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set, while curl
 * honours it — so behind a proxy (most mainland-China networks) every CLI call
 * timed out with a bare "fetch failed" while curl to the same URL worked. NO_PROXY
 * is respected by Node's own implementation. Node versions without the API are
 * left untouched.
 */
export function applyProxyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  api: ProxyAwareHttp = http as ProxyAwareHttp,
): boolean {
  if (!PROXY_VARS.some((name) => env[name])) return false;
  if (typeof api.setGlobalProxyFromEnv !== "function") return false;
  api.setGlobalProxyFromEnv(env);
  return true;
}
