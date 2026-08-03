# `@nebutra/forge-dns-leak`

Authoritative DNS zone for **true** DNS-leak detection (dnsleaktest-style).

Recursive resolvers that query unique probe names under the zone are logged by
source IP. Forge’s browser page triggers **system DNS** (not DoH) via
`Image`/`link` prefetch; the control API returns the captured recursive list.

## Architecture

```
Browser system DNS  →  recursive (ISP/VPN/DoH-off)  →  ns1.leak.nebutra.com:53
                                                      (this process, UDP/TCP)
Forge Next.js       →  http://127.0.0.1:3953          (control API, localhost only)
```

## Zone (Cloudflare — DNS only, never orange-cloud NS)

| Record | Name | Content | Proxy |
|--------|------|---------|-------|
| A | `ns1.leak` | ECS public IP (`106.15.4.31`) | **DNS only** |
| NS | `leak` | `ns1.leak.nebutra.com` | n/a |

Optional glue if registrar requires it. After delegation, dig:

```bash
dig NS leak.nebutra.com +short
dig @ns1.leak.nebutra.com SOA leak.nebutra.com +norecurse
```

## Run (dev)

```bash
pnpm --filter @nebutra/forge-dns-leak start
# DNS :5353  API :3953
```

Production prefers `FORGE_DNS_LEAK_DNS_PORT=53` with:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(which node)"
# or run under systemd AmbientCapabilities=CAP_NET_BIND_SERVICE
```

## Env

| Variable | Default |
|----------|---------|
| `FORGE_DNS_LEAK_ZONE` | `leak.nebutra.com` |
| `FORGE_DNS_LEAK_NS` | `ns1.leak.nebutra.com` |
| `FORGE_DNS_LEAK_ANSWER_IP` | `127.0.0.1` |
| `FORGE_DNS_LEAK_DNS_PORT` | `5353` |
| `FORGE_DNS_LEAK_API_PORT` | `3953` |

Forge app env: `FORGE_DNS_LEAK_URL=http://127.0.0.1:3953`

## Security

- Control API **must** stay on localhost (or mTLS). Session create is unauthenticated by design for the public tool surface — rate-limit at Forge edge.
- DNS answers are public A records; value is the **querier log**, not the rdata.
