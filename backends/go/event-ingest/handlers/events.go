package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

const (
	defaultMaxBatchSize = 1000
	maxRequestBytes     = 4 << 20
)

// EventStore is the durable sink for normalized analytics events.
type EventStore interface {
	Ensure(context.Context) error
	Insert(context.Context, []EventRow) error
}

// EventRow mirrors infra/data/clickhouse/init/001_bootstrap.sql.
type EventRow struct {
	EventID         string
	EventName       string
	TenantID        string
	UserID          *string
	SessionID       *string
	UTMSource       *string
	UTMMedium       *string
	UTMCampaign     *string
	ExperimentID    *string
	RequestID       *string
	TraceID         *string
	Source          string
	ContractVersion string
	EventTime       time.Time
	ReceivedAt      time.Time
	EventProperties string
}

// IngestResponse is returned for accepted batches.
type IngestResponse struct {
	Accepted   int `json:"accepted"`
	Duplicated int `json:"duplicated"`
}

type errorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type clock func() time.Time

type ingestEventsHandler struct {
	store    EventStore
	now      clock
	maxBatch int
}

// NewIngestEventsHandler returns a testable HTTP handler for POST /api/v1/events.
func NewIngestEventsHandler(store EventStore, now clock) http.Handler {
	if now == nil {
		now = time.Now
	}
	return &ingestEventsHandler{
		store:    store,
		now:      now,
		maxBatch: defaultMaxBatchSize,
	}
}

// IngestEvents handles POST /api/v1/events using the default ClickHouse store.
func IngestEvents(w http.ResponseWriter, r *http.Request) {
	NewIngestEventsHandler(NewClickHouseStoreFromEnv(), time.Now).ServeHTTP(w, r)
}

func (h *ingestEventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rawEvents, err := decodeEventBatch(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "Invalid event batch",
			Message: err.Error(),
		})
		return
	}
	if len(rawEvents) == 0 {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "Invalid event batch",
			Message: "events must contain at least one item",
		})
		return
	}
	if len(rawEvents) > h.maxBatch {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "Invalid event batch",
			Message: fmt.Sprintf("events must contain at most %d items", h.maxBatch),
		})
		return
	}

	rows := make([]EventRow, 0, len(rawEvents))
	receivedAt := h.now().UTC()
	for index, raw := range rawEvents {
		row, err := normalizeEvent(raw, receivedAt)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{
				Error:   "Invalid event",
				Message: fmt.Sprintf("events[%d]: %s", index, err.Error()),
			})
			return
		}
		rows = append(rows, row)
	}

	if err := h.store.Ensure(r.Context()); err != nil {
		slog.Error("event-ingest ensure failed", "err", err)
		writeJSON(w, http.StatusBadGateway, errorResponse{
			Error:   "Event ingest service unavailable",
			Message: "event ingest store unavailable",
		})
		return
	}
	if err := h.store.Insert(r.Context(), rows); err != nil {
		slog.Error("event-ingest insert failed", "err", err, "batch_size", len(rows))
		writeJSON(w, http.StatusBadGateway, errorResponse{
			Error:   "Event ingest service unavailable",
			Message: "event ingest store unavailable",
		})
		return
	}

	writeJSON(w, http.StatusAccepted, IngestResponse{
		Accepted:   len(rows),
		Duplicated: 0,
	})
}

func decodeEventBatch(r io.Reader) ([]json.RawMessage, error) {
	limited := io.LimitReader(r, maxRequestBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("read request body: %w", err)
	}
	if len(body) > maxRequestBytes {
		return nil, fmt.Errorf("request body exceeds %d bytes", maxRequestBytes)
	}

	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return nil, fmt.Errorf("request body is empty")
	}

	switch body[0] {
	case '[':
		var events []json.RawMessage
		if err := json.Unmarshal(body, &events); err != nil {
			return nil, fmt.Errorf("decode events array: %w", err)
		}
		return events, nil
	case '{':
		var batch struct {
			Events []json.RawMessage `json:"events"`
		}
		if err := json.Unmarshal(body, &batch); err != nil {
			return nil, fmt.Errorf("decode event envelope: %w", err)
		}
		return batch.Events, nil
	default:
		return nil, fmt.Errorf("expected JSON array or object with events")
	}
}

type gatewayEvent struct {
	EventName string                 `json:"eventName"`
	EventID   string                 `json:"eventId"`
	Source    string                 `json:"source"`
	Context   gatewayEventContext    `json:"context"`
	Payload   map[string]interface{} `json:"payload"`
}

type gatewayEventContext struct {
	TenantID        string `json:"tenantId"`
	UserID          string `json:"userId"`
	SessionID       string `json:"sessionId"`
	UTMSource       string `json:"utmSource"`
	UTMMedium       string `json:"utmMedium"`
	UTMCampaign     string `json:"utmCampaign"`
	ExperimentID    string `json:"experimentId"`
	RequestID       string `json:"requestId"`
	TraceID         string `json:"traceId"`
	OccurredAt      string `json:"occurredAt"`
	ContractVersion string `json:"contractVersion"`
}

type pythonUsageEvent struct {
	TenantID         string  `json:"tenant_id"`
	UserID           string  `json:"user_id"`
	RequestID        string  `json:"request_id"`
	TraceID          string  `json:"trace_id"`
	EventName        string  `json:"event_name"`
	Source           string  `json:"source"`
	ContractVersion  string  `json:"contract_version"`
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	PromptTokens     int     `json:"prompt_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	TotalTokens      int     `json:"total_tokens"`
	DurationMillis   float64 `json:"duration_ms"`
	OccurredAt       string  `json:"occurred_at"`
}

func normalizeEvent(raw json.RawMessage, receivedAt time.Time) (EventRow, error) {
	var event gatewayEvent
	if err := json.Unmarshal(raw, &event); err == nil && looksLikeGatewayEvent(event) {
		return normalizeGatewayEvent(event, receivedAt)
	}

	var usage pythonUsageEvent
	if err := json.Unmarshal(raw, &usage); err != nil {
		return EventRow{}, fmt.Errorf("decode usage event: %w", err)
	}
	return normalizePythonUsageEvent(usage, receivedAt)
}

func looksLikeGatewayEvent(event gatewayEvent) bool {
	return event.EventName != "" || event.Context.TenantID != "" || event.Context.OccurredAt != ""
}

func normalizeGatewayEvent(event gatewayEvent, receivedAt time.Time) (EventRow, error) {
	if event.EventName == "" {
		return EventRow{}, fmt.Errorf("eventName is required")
	}
	if event.Context.TenantID == "" {
		return EventRow{}, fmt.Errorf("context.tenantId is required")
	}
	if event.Context.OccurredAt == "" {
		return EventRow{}, fmt.Errorf("context.occurredAt is required")
	}

	eventTime, err := parseEventTime(event.Context.OccurredAt)
	if err != nil {
		return EventRow{}, err
	}

	properties := event.Payload
	if properties == nil {
		properties = map[string]interface{}{}
	}
	propertiesJSON, err := canonicalJSON(properties)
	if err != nil {
		return EventRow{}, fmt.Errorf("encode payload: %w", err)
	}

	source := defaultString(event.Source, "web")
	version := defaultString(event.Context.ContractVersion, "v1")
	eventID := event.EventID
	if eventID == "" {
		eventID = generatedEventID(event.EventName, event.Context.TenantID, eventTime, propertiesJSON)
	}

	return EventRow{
		EventID:         eventID,
		EventName:       event.EventName,
		TenantID:        event.Context.TenantID,
		UserID:          stringPtr(event.Context.UserID),
		SessionID:       stringPtr(event.Context.SessionID),
		UTMSource:       stringPtr(event.Context.UTMSource),
		UTMMedium:       stringPtr(event.Context.UTMMedium),
		UTMCampaign:     stringPtr(event.Context.UTMCampaign),
		ExperimentID:    stringPtr(event.Context.ExperimentID),
		RequestID:       stringPtr(event.Context.RequestID),
		TraceID:         stringPtr(event.Context.TraceID),
		Source:          source,
		ContractVersion: version,
		EventTime:       eventTime,
		ReceivedAt:      receivedAt,
		EventProperties: propertiesJSON,
	}, nil
}

func normalizePythonUsageEvent(event pythonUsageEvent, receivedAt time.Time) (EventRow, error) {
	if event.EventName == "" {
		return EventRow{}, fmt.Errorf("event_name is required")
	}
	if event.TenantID == "" {
		return EventRow{}, fmt.Errorf("tenant_id is required")
	}
	if event.OccurredAt == "" {
		return EventRow{}, fmt.Errorf("occurred_at is required")
	}

	eventTime, err := parseEventTime(event.OccurredAt)
	if err != nil {
		return EventRow{}, err
	}

	properties := map[string]interface{}{
		"provider":          event.Provider,
		"model":             event.Model,
		"prompt_tokens":     event.PromptTokens,
		"completion_tokens": event.CompletionTokens,
		"total_tokens":      event.TotalTokens,
		"duration_ms":       event.DurationMillis,
	}
	propertiesJSON, err := canonicalJSON(properties)
	if err != nil {
		return EventRow{}, fmt.Errorf("encode usage payload: %w", err)
	}

	return EventRow{
		EventID:         generatedEventID(event.EventName, event.TenantID, eventTime, propertiesJSON),
		EventName:       event.EventName,
		TenantID:        event.TenantID,
		UserID:          stringPtr(event.UserID),
		RequestID:       stringPtr(event.RequestID),
		TraceID:         stringPtr(event.TraceID),
		Source:          defaultString(event.Source, "python-ai"),
		ContractVersion: defaultString(event.ContractVersion, "v1"),
		EventTime:       eventTime,
		ReceivedAt:      receivedAt,
		EventProperties: propertiesJSON,
	}, nil
}

func parseEventTime(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("occurred_at must be RFC3339: %w", err)
	}
	return parsed.UTC(), nil
}

func canonicalJSON(value interface{}) (string, error) {
	bytes, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func generatedEventID(eventName string, tenantID string, eventTime time.Time, propertiesJSON string) string {
	hash := sha256.Sum256([]byte(eventName + ":" + tenantID + ":" + eventTime.Format(time.RFC3339Nano) + ":" + propertiesJSON))
	return hex.EncodeToString(hash[:])
}

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func defaultString(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func writeJSON(w http.ResponseWriter, status int, value interface{}) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("event-ingest response encode failed", "err", err)
	}
}
