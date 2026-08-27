package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nebutra/sailor/backends/go/event-ingest/handlers"
)

type noopStore struct{}

func (noopStore) Ensure(context.Context) error {
	return nil
}

func (noopStore) Insert(context.Context, []handlers.EventRow) error {
	return nil
}

func TestRouterExposesPrometheusMetrics(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	res := httptest.NewRecorder()

	newRouter(noopStore{}).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected /metrics status %d, got %d", http.StatusOK, res.Code)
	}
	if !strings.Contains(res.Body.String(), "go_goroutines") {
		t.Fatalf("expected default Go runtime metrics, got body: %s", res.Body.String())
	}
}

func TestRouterRecordsHTTPMetrics(t *testing.T) {
	router := newRouter(noopStore{})

	healthReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	healthRes := httptest.NewRecorder()
	router.ServeHTTP(healthRes, healthReq)

	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	metricsRes := httptest.NewRecorder()
	router.ServeHTTP(metricsRes, metricsReq)

	body := metricsRes.Body.String()
	if !strings.Contains(body, `http_requests_total{method="GET",path="/health",status="200"}`) {
		t.Fatalf("expected HTTP request counter for /health, got body: %s", body)
	}
	if !strings.Contains(body, `http_request_duration_seconds_bucket{method="GET",path="/health",status="200"`) {
		t.Fatalf("expected HTTP request duration histogram for /health, got body: %s", body)
	}
}
