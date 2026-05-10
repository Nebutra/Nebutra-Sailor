# Nebutra Nginx — VM Deployment Guide

Nginx reverse proxy configuration for Nebutra on VM-based infrastructure
(Alibaba Cloud ECS, Tencent Cloud CVM, or any Linux VM).

---

## Directory layout

```
infra/runtime/nginx/
  nginx.conf          -- Main config (global deployment)
  nginx-china.conf    -- China variant (no HSTS, domestic DNS, CDN IP passthrough)
  conf.d/
    security.conf     -- Security headers fragment (http{} context)
    proxy_params.conf -- Common proxy headers (location{} context)
    docs.nebutra.com.conf -- HTTP bootstrap reverse proxy for Sailor docs
```

---

## 1. VM Prerequisites

Tested on Ubuntu 22.04 LTS. Install Nginx:

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
```

Verify version (Nginx 1.20+ required):

```bash
nginx -v
```

Open firewall ports:

```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Alibaba Cloud / Tencent Cloud security groups: allow inbound TCP 80 and 443
```

---

## 2. Install this Nginx config

Copy the config files to the system Nginx directory:

```bash
sudo cp infra/runtime/nginx/nginx.conf /etc/nginx/nginx.conf
sudo mkdir -p /etc/nginx/conf.d
sudo cp infra/runtime/nginx/conf.d/security.conf     /etc/nginx/conf.d/security.conf
sudo cp infra/runtime/nginx/conf.d/proxy_params.conf /etc/nginx/conf.d/proxy_params.conf
sudo cp infra/runtime/nginx/conf.d/docs.nebutra.com.conf /etc/nginx/conf.d/docs.nebutra.com.conf
```

Test the configuration:

```bash
sudo nginx -t
```

Apply without downtime:

```bash
sudo nginx -s reload
# or
sudo systemctl reload nginx
```

### Docker Compose deployment

If using Docker Compose (recommended), Nginx runs as a container and mounts
the config files directly from the repo. No manual copy step is needed:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
```

The container mounts:
- `./infra/runtime/nginx/nginx.conf` → `/etc/nginx/nginx.conf` (read-only)
- `./infra/runtime/nginx/conf.d`     → `/etc/nginx/conf.d`     (read-only)
- `/etc/ssl/nebutra`         → `/etc/ssl/nebutra`       (read-only)

---

## 3. SSL setup

### Option A: Let's Encrypt (free, auto-renewable)

**Step 1 — Ensure port 80 is reachable and Nginx is running** (for webroot challenge).

**Step 2 — Initial certificate** (run once; uses the certbot Docker service):

```bash
# Create the webroot directory on the host
sudo mkdir -p /var/www/certbot

# Issue certificate (replace email and domains)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile ssl-renew run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d nebutra.com -d www.nebutra.com \
  -d app.nebutra.com -d api.nebutra.com \
  --email ops@nebutra.com --agree-tos --no-eff-email

# Certificates will be at /etc/letsencrypt/live/nebutra.com/
# Symlink to the path Nginx expects:
sudo mkdir -p /etc/ssl/nebutra
sudo ln -sf /etc/letsencrypt/live/nebutra.com/fullchain.pem /etc/ssl/nebutra/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/nebutra.com/privkey.pem   /etc/ssl/nebutra/privkey.pem
```

**Step 3 — Auto-renewal via cron** (add to root crontab with `sudo crontab -e`):

```cron
# Renew certificates every 12 hours; reload Nginx after success
0 */12 * * * docker compose -f /opt/nebutra/docker-compose.yml \
              -f /opt/nebutra/docker-compose.prod.yml \
              --profile ssl-renew run --rm certbot renew --quiet \
              && docker compose -f /opt/nebutra/docker-compose.yml \
                 -f /opt/nebutra/docker-compose.prod.yml \
                 exec nginx nginx -s reload
```

### Option B: Commercial certificate

Place your certificate files at:

```
/etc/ssl/nebutra/fullchain.pem   -- Certificate chain (cert + intermediates)
/etc/ssl/nebutra/privkey.pem     -- Private key (keep permissions 600)
```

```bash
sudo chmod 600 /etc/ssl/nebutra/privkey.pem
sudo chmod 644 /etc/ssl/nebutra/fullchain.pem
```

---

## 4. Reload Nginx after config changes

```bash
# Bare VM (systemd)
sudo nginx -t && sudo nginx -s reload

# Docker Compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec nginx nginx -s reload
```

---

## 5. Upstream addresses

The `nginx.conf` uses `127.0.0.1:<port>` as upstream addresses (bare-VM model).

When running via Docker Compose, the services communicate over the Docker
network `nebutra-network`. Replace upstream server addresses with Docker
service names:

```nginx
# Docker Compose networking variant
upstream nebutra_web     { server web:3000;        keepalive 32; }
upstream nebutra_landing { server landing-page:3001; keepalive 32; }
upstream nebutra_api     { server api-gateway:3002; keepalive 32; }
upstream nebutra_docs    { server sailor-docs:3004; keepalive 16; }
# Python services use internal container port 8000
upstream nebutra_ai      { server ai-service:8000;  keepalive 16; }
```

A helper script can patch the addresses automatically:

```bash
sed -i 's/127.0.0.1:3000/web:3000/g; \
        s/127.0.0.1:3001/landing-page:3001/g; \
        s/127.0.0.1:3002/api-gateway:3002/g; \
        s/127.0.0.1:8001/ai-service:8000/g; \
        s/127.0.0.1:8002/content-service:8000/g; \
        s/127.0.0.1:8003/recsys-service:8000/g; \
        s/127.0.0.1:8004/ecommerce-service:8000/g; \
        s/127.0.0.1:8005/web3-service:8000/g; \
        s/127.0.0.1:8006/billing-service:8000/g; \
        s/127.0.0.1:8008/event-ingest-service:8000/g' \
  /etc/nginx/nginx.conf
```

---

## 6. Sailor docs on ECS

`docs.nebutra.com` is not a Vercel hostname. Keep its Cloudflare DNS record
pointing at the ECS public IP and run `@nebutra/sailor-docs` on localhost port
`3004`.

Cloudflare DNS bootstrap:

```txt
Type: A
Name: docs
IPv4 address: 106.15.4.31
Proxy status: DNS only
TTL: Auto
```

Deploy from a local machine so the small ECS origin does not compile Next.js:

```bash
REMOTE_HOST=root@106.15.4.31 bash infra/ops/scripts/deploy-sailor-docs-ecs.sh
```

Install the HTTP bootstrap proxy and reload Nginx:

```bash
sudo cp infra/runtime/nginx/conf.d/docs.nebutra.com.conf /etc/nginx/conf.d/docs.nebutra.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

Verify before enabling Cloudflare proxy or HTTPS:

```bash
dig +short docs.nebutra.com A
curl -I http://docs.nebutra.com/
```

After HTTP returns `200`, issue a certificate:

```bash
sudo certbot --nginx -d docs.nebutra.com
curl -I https://docs.nebutra.com/
```

---

## 7. China deployment (ICP 备案 / CDN)

Use `nginx-china.conf` instead of `nginx.conf`:

```bash
sudo cp infra/runtime/nginx/nginx-china.conf /etc/nginx/nginx.conf
```

Key differences from the global config:

| Feature | Global (nginx.conf) | China (nginx-china.conf) |
|---|---|---|
| HSTS | Enabled (max-age 2y) | Disabled |
| DNS resolver | 8.8.8.8, 8.8.4.4 | 223.5.5.5 (AliDNS), 119.29.29.29 (DNSPod) |
| CDN real-IP | Not configured | Placeholder for Alibaba/Tencent CDN ranges |

### ICP 备案 requirement

All domain names serving mainland China users MUST have an active ICP filing
(ICP备案). Without it your cloud provider will block ports 80 and 443.

- Alibaba Cloud guide: https://help.aliyun.com/product/35468.html
- Tencent Cloud guide: https://cloud.tencent.com/document/product/243
- MIIT filing portal: https://beian.miit.gov.cn/
- PSB (公安) filing (within 30 days of ICP approval): https://www.beian.gov.cn/

### CDN real-IP configuration

Edit the commented `set_real_ip_from` blocks in `nginx-china.conf` with the
current egress CIDR ranges from your CDN provider:

- Alibaba Cloud CDN IPs: https://help.aliyun.com/document_detail/40205.html
- Tencent Cloud CDN IPs: https://cloud.tencent.com/document/product/228/6927

Then uncomment `real_ip_header X-Forwarded-For;` and `real_ip_recursive on;`.

---

## 8. Useful diagnostics

```bash
# View live access log
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f nginx

# Check rate limit rejections
grep "limiting requests" /var/log/nginx/error.log

# Test SSL configuration
curl -I https://app.nebutra.com
openssl s_client -connect app.nebutra.com:443 -servername app.nebutra.com

# Check SSL Labs score
# https://www.ssllabs.com/ssltest/analyze.html?d=app.nebutra.com
```
