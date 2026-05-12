package handlers

import (
	"encoding/json"
	"net/http"
)

// IngestEvents handles POST /api/v1/events — batch usage event ingestion.
//
// Phase 1 (now):  accepts the payload, validates auth, returns 202 Accepted.
// Phase 2:        fan-out to ClickHouse via clickhouse-go batched inserts.
// Phase 3:        backpressure / DLQ for failed ClickHouse writes.
func IngestEvents(w http.ResponseWriter, r *http.Request) {
	// TODO(phase-2): decode []UsageEvent, batch-insert into ClickHouse events_bronze
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"accepted": 0,
		"status":   "stub — ClickHouse not wired yet",
	})
}
