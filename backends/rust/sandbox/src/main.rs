//! Nebutra code execution sandbox service.
//!
//! Phase 1 (now):  HTTP harness — /health 200, /execute 501, protocol-aligned
//!                 `/api/v1/sandbox/exec` that is FAIL-CLOSED for arbitrary
//!                 code and exposes one isolated built-in hello-world path.
//! Phase 2:        Wasmtime runner — WASI preview2, per-request memory limits.
//! Phase 3:        Firecracker microVM runner — full OS-level isolation.
//!
//! This service is the Track-B isolator for the dual-track agent-runtime
//! absorption. Track A (`@nebutra/agent-runtime`, TypeScript) describes the
//! capability *policy*; this service *enforces* isolation. The two are coupled
//! ONLY by the JSON contract below — mirroring the `ExternalSandbox` /
//! `SandboxExecRequest` / `SandboxExecResult` shapes in
//! `packages/ai/agent-runtime/src/sandbox.ts` (camelCase on the wire).
//!
//! ExternalSandbox posture: until a real isolation backend (Wasmtime /
//! Firecracker) is wired, arbitrary exec requests are refused. The only Phase-1
//! success path is an in-process built-in command with no shell or OS process.

use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Capability policy — mirrors `CapabilityPolicy` in agent-runtime/policy.ts.
/// Tagged by `kind` to match the TS discriminated union on the wire.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum CapabilityPolicy {
    DangerFullAccess,
    ReadOnly {
        #[serde(default)]
        #[serde(alias = "networkAccess")]
        network_access: bool,
    },
    ExternalSandbox {
        #[serde(default)]
        #[serde(alias = "networkAccess")]
        network_access: bool,
    },
    WorkspaceWrite {
        #[serde(default)]
        #[serde(alias = "networkAccess")]
        network_access: bool,
    },
}

/// Mirrors `SandboxExecRequest` in agent-runtime/sandbox.ts.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SandboxExecRequest {
    /// Mandatory tenant scope — every delegated exec is tenant-bound.
    tenant_id: String,
    thread_id: String,
    #[allow(dead_code)]
    command: String,
    capability_policy: CapabilityPolicy,
}

/// Mirrors `SandboxExecResult` in agent-runtime/sandbox.ts.
/// Reserved for the Phase-2 success path; constructed only once isolation is
/// wired (and in the contract-shape test).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct SandboxExecResult {
    exit_code: i32,
    aggregated_output: String,
    executed_on: String,
}

/// Decision for an incoming exec request before any execution is attempted.
enum Admission {
    /// Allowed only for built-in commands that do not spawn a shell/process.
    BuiltinEcho(&'static str),
    /// Refused outright (fail-closed); carries an opaque reason.
    Refused(&'static str),
}

/// Fail-closed admission: tenant scope must be present, the most dangerous
/// posture is rejected, arbitrary commands are refused, and the hello-world
/// doctor path is handled by a built-in executor that does not spawn a shell.
fn admit(req: &SandboxExecRequest) -> Admission {
    if req.tenant_id.trim().is_empty() || req.thread_id.trim().is_empty() {
        return Admission::Refused("missing tenant/thread scope");
    }
    if let CapabilityPolicy::DangerFullAccess = req.capability_policy {
        return Admission::Refused("danger_full_access refused for multi-tenant delegation");
    }
    match req.command.trim() {
        "echo sandbox ok" | "echo 'sandbox ok'" | "echo \"sandbox ok\"" => {
            Admission::BuiltinEcho("sandbox ok\n")
        }
        _ => Admission::Refused("arbitrary execution requires an isolation backend"),
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = Router::new()
        .route("/health", get(health))
        .route("/ready", get(health))
        .route("/api/v1/sandbox/execute", post(execute_stub))
        .route("/api/v1/sandbox/exec", post(exec))
        .layer(TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8020);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("sandbox service listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "service": "sandbox",
        "phase": "builtin-checks — arbitrary exec fail-closed"
    }))
}

/// Legacy stub endpoint — kept for backward compatibility.
async fn execute_stub() -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "error": "not_implemented",
            "detail": "Sandbox Phase 2 (Wasmtime) not yet active. Use E2B via python/ai."
        })),
    )
}

/// Track-A `ExternalSandbox` delegation endpoint.
///
/// Honors the agent-runtime contract. Fail-closed: returns 403 with a
/// structured refusal until a real isolation backend is wired. It never
/// returns a fabricated [`SandboxExecResult`] for unexecuted code.
async fn exec(Json(req): Json<SandboxExecRequest>) -> impl IntoResponse {
    match admit(&req) {
        Admission::BuiltinEcho(output) => (
            StatusCode::OK,
            Json(json!({
                "exitCode": 0,
                "aggregatedOutput": output,
                "executedOn": "local_builtin",
            })),
        ),
        Admission::Refused(reason) => (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "execution_refused",
                "reason": reason,
                "tenantId": req.tenant_id,
                "threadId": req.thread_id,
                "executedOn": "none",
            })),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(policy: CapabilityPolicy, tenant: &str) -> SandboxExecRequest {
        SandboxExecRequest {
            tenant_id: tenant.into(),
            thread_id: "th_1".into(),
            command: "rm -rf /".into(),
            capability_policy: policy,
        }
    }

    #[test]
    fn refuses_danger_full_access() {
        assert!(matches!(
            admit(&req(CapabilityPolicy::DangerFullAccess, "org_a")),
            Admission::Refused(_)
        ));
    }

    #[test]
    fn refuses_missing_tenant_scope() {
        assert!(matches!(
            admit(&req(
                CapabilityPolicy::ExternalSandbox {
                    network_access: false
                },
                "  "
            )),
            Admission::Refused(_)
        ));
    }

    #[test]
    fn refuses_arbitrary_command_even_for_safe_posture() {
        // No isolation backend wired -> arbitrary commands are still refused.
        assert!(matches!(
            admit(&req(
                CapabilityPolicy::ExternalSandbox {
                    network_access: false
                },
                "org_a"
            )),
            Admission::Refused(_)
        ));
    }

    #[test]
    fn allows_builtin_echo_without_shell() {
        let mut r = req(
            CapabilityPolicy::ExternalSandbox {
                network_access: false,
            },
            "org_a",
        );
        r.command = "echo sandbox ok".into();
        assert!(matches!(admit(&r), Admission::BuiltinEcho("sandbox ok\n")));
    }

    #[test]
    fn result_shape_serializes_camel_case() {
        let r = SandboxExecResult {
            exit_code: 0,
            aggregated_output: "ok".into(),
            executed_on: "wasmtime".into(),
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("exitCode").is_some());
        assert!(v.get("aggregatedOutput").is_some());
        assert!(v.get("executedOn").is_some());
    }
}
