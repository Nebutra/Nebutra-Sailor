#!/usr/bin/env node
/**
 * forge-dns-leak — authoritative zone + localhost control API.
 *
 * Env:
 *   FORGE_DNS_LEAK_ZONE       default leak.nebutra.com
 *   FORGE_DNS_LEAK_NS         default ns1.leak.nebutra.com
 *   FORGE_DNS_LEAK_ANSWER_IP  A rdata for probes (default 127.0.0.1)
 *   FORGE_DNS_LEAK_DNS_HOST   bind for DNS (default 0.0.0.0)
 *   FORGE_DNS_LEAK_DNS_PORT   default 5353 (use 53 in prod with CAP_NET_BIND_SERVICE)
 *   FORGE_DNS_LEAK_API_HOST   default 127.0.0.1
 *   FORGE_DNS_LEAK_API_PORT   default 3953
 */
import { startAuthority } from "./authority";
import { startControlApi } from "./control-api";
import { SessionStore } from "./sessions";

const zone = (process.env.FORGE_DNS_LEAK_ZONE ?? "leak.nebutra.com").toLowerCase();
const nsHostname = (process.env.FORGE_DNS_LEAK_NS ?? `ns1.${zone}`).toLowerCase();
const answerIp = process.env.FORGE_DNS_LEAK_ANSWER_IP ?? "127.0.0.1";
const dnsHost = process.env.FORGE_DNS_LEAK_DNS_HOST ?? "0.0.0.0";
const dnsPort = Number(process.env.FORGE_DNS_LEAK_DNS_PORT ?? "5353");
const apiHost = process.env.FORGE_DNS_LEAK_API_HOST ?? "127.0.0.1";
const apiPort = Number(process.env.FORGE_DNS_LEAK_API_PORT ?? "3953");

const store = new SessionStore({ zone, answerIp });

const authority = await startAuthority(store, {
  host: dnsHost,
  port: dnsPort,
  nsHostname,
});
const api = await startControlApi(store, {
  host: apiHost,
  port: apiPort,
  nsHostname,
  dnsPort,
});

process.stdout.write(
  `${JSON.stringify({
    event: "forge-dns-leak.started",
    zone,
    nsHostname,
    answerIp,
    dns: `${dnsHost}:${dnsPort}`,
    api: `${apiHost}:${apiPort}`,
  })}\n`,
);

const shutdown = async () => {
  await authority.close();
  await new Promise<void>((r) => api.close(() => r()));
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
