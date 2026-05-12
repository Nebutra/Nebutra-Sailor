package handlers

import (
	"encoding/json"
	"net/http"
	"time"
)

// Health handles GET /health — liveness probe.
func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "event-ingest",
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}
