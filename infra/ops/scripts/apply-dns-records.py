#!/usr/bin/env python3
"""Upsert a declared set of DNS records into a Cloudflare zone.

Usage: apply-dns-records.py <records.json>
Env:   CLOUDFLARE_API_TOKEN (Zone DNS Edit)

Each record is matched on (type, name); an existing record with different
content is updated, a missing one created, anything else left alone. Records
are DNS-only (never proxied): mail records cannot sit behind the proxy.
"""
import json
import os
import sys
import urllib.request

API = "https://api.cloudflare.com/client/v4"
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]


def call(method, path, body=None):
    req = urllib.request.Request(
        f"{API}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        payload = json.load(res)
    if not payload.get("success"):
        raise SystemExit(f"{method} {path} failed: {payload.get('errors')}")
    return payload["result"]


spec = json.load(open(sys.argv[1]))
zone = spec["zone"]
zones = call("GET", f"/zones?name={zone}")
if not zones:
    raise SystemExit(f"zone {zone} not visible to this token")
zone_id = zones[0]["id"]

for record in spec["records"]:
    fqdn = f"{record['name']}.{zone}"
    body = {
        "type": record["type"],
        "name": fqdn,
        "content": record["content"],
        "ttl": 1,
        "proxied": False,
    }
    if "priority" in record:
        body["priority"] = record["priority"]
    existing = call("GET", f"/zones/{zone_id}/dns_records?type={record['type']}&name={fqdn}")
    if not existing:
        call("POST", f"/zones/{zone_id}/dns_records", body)
        print(f"created {record['type']} {fqdn}")
    elif existing[0]["content"].strip('"') != record["content"]:
        call("PUT", f"/zones/{zone_id}/dns_records/{existing[0]['id']}", body)
        print(f"updated {record['type']} {fqdn}")
    else:
        print(f"ok      {record['type']} {fqdn}")
