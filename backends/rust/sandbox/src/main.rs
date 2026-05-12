//! Nebutra code execution sandbox service.
//!
//! Phase 1 (now):  HTTP harness — /health returns 200, /execute returns 501.
//! Phase 2:        Wasmtime runner — WASI preview2, per-request memory limits.
//! Phase 3:        Firecracker microVM runner — full OS-level isolation.
//!
//! Activation condition: E2B monthly cost > $200.
//! Until then, python/ai delegates to E2B directly.

use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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
        "phase": "stub — Wasmtime not yet wired"
    }))
}

/// Stub execute endpoint — returns 501 until Phase 2 lands.
///
/// Expected request body (Phase 2 contract):
/// ```json
/// { "code": "print('hello')", "language": "python", "timeout_ms": 5000 }
/// ```
async fn execute_stub() -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "error": "not_implemented",
            "detail": "Sandbox Phase 2 (Wasmtime) not yet active. Use E2B via python/ai."
        })),
    )
}
