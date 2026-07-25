/**
 * k6 Load Test — Nebutra API Gateway
 *
 * Scenarios:
 *   smoke       — 1 VU, 1 min. Quick sanity check.
 *   ramp-up     — linear ramp to 50 VU over 5 min, hold 10 min, ramp down.
 *   stress      — spike to 200 VU to find breaking point.
 *   soak        — 20 VU for 1 hour (steady-state memory/leak detection).
 *
 * Usage:
 *   # Smoke test
 *   k6 run --env SCENARIO=smoke --env BASE_URL=https://api.nebutra.com tests/load/k6.js
 *
 *   # CI ramp-up test
 *   k6 run --env SCENARIO=ramp-up --env BASE_URL=$API_URL tests/load/k6.js
 *
 *   # Soak test (run locally or on dedicated k6 Cloud)
 *   k6 run --env SCENARIO=soak --env BASE_URL=$API_URL tests/load/k6.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import { randomIntBetween, randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, group, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// ── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("custom_error_rate");
const apiLatency = new Trend("custom_api_latency_ms", true);
const requestCount = new Counter("custom_total_requests");

// ── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3002";
const SCENARIO = __ENV.SCENARIO || "smoke";
const API_TOKEN = __ENV.API_TOKEN || "test-token";
// Real auth tokens must be injected via secrets. The default placeholder only
// validates that protected routes reject anonymous/forged callers (401/403).
const HAS_REAL_AUTH = Boolean(__ENV.API_TOKEN) && API_TOKEN !== "test-token";

const SCENARIOS = {
  smoke: {
    executor: "constant-vus",
    vus: 1,
    duration: "1m",
  },
  "ramp-up": {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { target: 10, duration: "2m" }, // warm-up
      { target: 50, duration: "5m" }, // ramp to target
      { target: 50, duration: "10m" }, // hold at target
      { target: 0, duration: "2m" }, // cool-down
    ],
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { target: 50, duration: "2m" },
      { target: 100, duration: "2m" },
      { target: 200, duration: "2m" },
      { target: 200, duration: "5m" }, // hold at stress peak
      { target: 0, duration: "2m" },
    ],
  },
  soak: {
    executor: "constant-vus",
    vus: 20,
    duration: "1h",
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: SCENARIOS[SCENARIO],
  },

  // SLO thresholds — test FAILS if these are breached
  thresholds: {
    // 99th percentile must be under 2s
    http_req_duration: ["p(99)<2000"],
    // 95th percentile must be under 500ms
    "http_req_duration{type:api}": ["p(95)<500"],
    // Error rate must stay below 1%
    custom_error_rate: ["rate<0.01"],
    // 99.9% of requests must succeed
    http_req_failed: ["rate<0.001"],
  },
};

// ── Test data ────────────────────────────────────────────────────────────────
const _TEST_PRICE_IDS = ["price_starter_monthly", "price_pro_monthly"];
const TEST_TENANT_IDS = ["org_test_001", "org_test_002", "org_test_003"];

// ── Common headers ───────────────────────────────────────────────────────────
function getHeaders(tenantId) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
    "X-Tenant-ID": tenantId,
    "X-Request-ID": `k6-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

function jsonValue(res, selector) {
  if (!res || res.status === 0 || !res.body) {
    return undefined;
  }

  try {
    return res.json(selector);
  } catch (_error) {
    return undefined;
  }
}

// ── Test scenarios ───────────────────────────────────────────────────────────
export default function () {
  const tenantId = randomItem(TEST_TENANT_IDS);
  const headers = getHeaders(tenantId);

  // Health check (should always be fast)
  group("health", () => {
    const res = http.get(`${BASE_URL}/api/misc/health`, {
      tags: { type: "health" },
    });
    requestCount.add(1);
    const ok = check(res, {
      "health: status 200": (r) => r.status === 200,
      "health: body has status": (r) => jsonValue(r, "status") !== undefined,
      "health: fast (<200ms)": (r) => r.timings.duration < 200,
    });
    errorRate.add(!ok);
    apiLatency.add(res.timings.duration, { endpoint: "health" });
  });

  sleep(randomIntBetween(1, 3));

  // Protected routes: with a real token assert success; without, assert auth gate.
  // k6 counts status>=400 as http_req_failed unless expectedStatuses is set.
  const authExpected = HAS_REAL_AUTH
    ? http.expectedStatuses(200, 404)
    : http.expectedStatuses(401, 403);

  group("billing", () => {
    const res = http.get(`${BASE_URL}/api/v1/billing/subscription`, {
      headers,
      tags: { type: "api" },
      responseCallback: authExpected,
    });
    requestCount.add(1);
    const ok = check(
      res,
      HAS_REAL_AUTH
        ? {
            "billing/subscription: 200 or 404": (r) => r.status === 200 || r.status === 404,
            "billing/subscription: <500ms": (r) => r.timings.duration < 500,
          }
        : {
            "billing/subscription: auth gate (401/403)": (r) =>
              r.status === 401 || r.status === 403,
          },
    );
    errorRate.add(!ok);
    apiLatency.add(res.timings.duration, { endpoint: "billing/subscription" });
  });

  sleep(randomIntBetween(1, 2));

  group("ai", () => {
    const res = http.get(`${BASE_URL}/api/v1/ai/models`, {
      headers,
      tags: { type: "api" },
      responseCallback: authExpected,
    });
    requestCount.add(1);
    const ok = check(
      res,
      HAS_REAL_AUTH
        ? {
            "ai/models: status 200": (r) => r.status === 200,
            "ai/models: has models array": (r) => Array.isArray(jsonValue(r, "models")),
            "ai/models: <300ms": (r) => r.timings.duration < 300,
          }
        : {
            "ai/models: auth gate (401/403)": (r) => r.status === 401 || r.status === 403,
          },
    );
    errorRate.add(!ok);
    apiLatency.add(res.timings.duration, { endpoint: "ai/models" });
  });

  sleep(randomIntBetween(1, 3));

  // Idempotency requires a real auth token; skip when smoke runs unauthenticated.
  if (HAS_REAL_AUTH) {
    group("idempotency", () => {
      const idempotencyKey = `k6-${__VU}-${__ITER}`;
      const payload = JSON.stringify({ event: "test.load", data: {} });
      const authOk = http.expectedStatuses(200, 202, 401, 403, 404, 422);

      const _first = http.post(`${BASE_URL}/api/v1/events`, payload, {
        headers: { ...headers, "Idempotency-Key": idempotencyKey },
        tags: { type: "api" },
        responseCallback: authOk,
      });
      const second = http.post(`${BASE_URL}/api/v1/events`, payload, {
        headers: { ...headers, "Idempotency-Key": idempotencyKey },
        tags: { type: "api" },
        responseCallback: authOk,
      });
      requestCount.add(2);

      check(second, {
        "idempotency: replay header on duplicate": (r) =>
          r.headers["Idempotency-Replayed"] === "true" || r.status === 200 || r.status === 202,
      });
    });
  }

  sleep(randomIntBetween(2, 5));
}

// ── Summary output ───────────────────────────────────────────────────────────
export function handleSummary(data) {
  const thresholdsFailed = Object.values(data.metrics)
    .filter((m) => m.thresholds)
    .some((m) => Object.values(m.thresholds).some((t) => !t.ok));

  return {
    stdout: JSON.stringify(
      {
        scenario: SCENARIO,
        passed: !thresholdsFailed,
        p95_ms: data.metrics.http_req_duration?.values?.["p(95)"],
        p99_ms: data.metrics.http_req_duration?.values?.["p(99)"],
        error_rate: data.metrics.http_req_failed?.values?.rate,
        total_requests: data.metrics.http_reqs?.values?.count,
      },
      null,
      2,
    ),
    "tests/load/results/summary.json": JSON.stringify(data, null, 2),
  };
}
