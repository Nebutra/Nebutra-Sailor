package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/nebutra/sailor/backends/go/event-ingest/handlers"
)

func newRouter(store handlers.EventStore) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(httpMetricsMiddleware)

	// Probes
	r.Get("/health", handlers.Health)
	r.Get("/ready", handlers.Health) // same check for now
	r.Handle("/metrics", promhttp.Handler())

	// API
	r.Post("/api/v1/events", handlers.NewIngestEventsHandler(store, nil).ServeHTTP)

	return r
}

func main() {
	store := handlers.NewClickHouseStoreFromEnv()
	r := newRouter(store)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8010"
	}

	slog.Info("event-ingest starting", "port", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}
