package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeEventStore struct {
	rows      []EventRow
	ensureErr error
	insertErr error
}

func (s *fakeEventStore) Ensure(context.Context) error {
	return s.ensureErr
}

func (s *fakeEventStore) Insert(_ context.Context, rows []EventRow) error {
	if s.insertErr != nil {
		return s.insertErr
	}
	s.rows = append(s.rows, rows...)
	return nil
}

func TestIngestEventsAcceptsGatewayEnvelope(t *testing.T) {
	store := &fakeEventStore{}
	handler := NewIngestEventsHandler(store, func() time.Time {
		return time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	})

	body := `{
		"events": [{
			"eventName": "user.signed_up",
			"eventId": "evt_1",
			"source": "gateway",
			"context": {
				"tenantId": "org_1",
				"userId": "user_1",
				"occurredAt": "2026-06-01T11:59:00Z",
				"contractVersion": "v1"
			},
			"payload": { "plan": "pro" }
		}]
	}`

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(body))

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body.String())
	}
	var payload IngestResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Accepted != 1 || payload.Duplicated != 0 {
		t.Fatalf("unexpected response: %+v", payload)
	}
	if len(store.rows) != 1 {
		t.Fatalf("expected one inserted row, got %d", len(store.rows))
	}

	row := store.rows[0]
	if row.EventID != "evt_1" || row.EventName != "user.signed_up" || row.TenantID != "org_1" {
		t.Fatalf("unexpected row identity: %+v", row)
	}
	if row.UserID == nil || *row.UserID != "user_1" {
		t.Fatalf("expected user_id to be preserved: %+v", row.UserID)
	}
	if row.Source != "gateway" || row.ContractVersion != "v1" {
		t.Fatalf("unexpected source/version: %+v", row)
	}
	if !strings.Contains(row.EventProperties, `"plan":"pro"`) {
		t.Fatalf("payload was not persisted as JSON properties: %s", row.EventProperties)
	}
}

func TestIngestEventsAcceptsPythonUsageArray(t *testing.T) {
	store := &fakeEventStore{}
	handler := NewIngestEventsHandler(store, func() time.Time {
		return time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	})

	body := `[{
		"tenant_id": "org_1",
		"user_id": "user_1",
		"request_id": "req_1",
		"trace_id": "trace_1",
		"event_name": "llm.completion",
		"source": "python-ai",
		"contract_version": "v1",
		"provider": "openai",
		"model": "gpt-5-mini",
		"prompt_tokens": 100,
		"completion_tokens": 50,
		"total_tokens": 150,
		"duration_ms": 321.5,
		"occurred_at": "2026-06-01T11:59:00Z"
	}]`

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(body))

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body.String())
	}
	if len(store.rows) != 1 {
		t.Fatalf("expected one inserted row, got %d", len(store.rows))
	}

	row := store.rows[0]
	if row.EventID == "" {
		t.Fatal("expected deterministic event_id to be generated")
	}
	if row.EventName != "llm.completion" || row.TenantID != "org_1" {
		t.Fatalf("unexpected usage row: %+v", row)
	}
	if row.RequestID == nil || *row.RequestID != "req_1" {
		t.Fatalf("expected request_id to be preserved: %+v", row.RequestID)
	}
	if !strings.Contains(row.EventProperties, `"total_tokens":150`) {
		t.Fatalf("usage fields were not persisted as JSON properties: %s", row.EventProperties)
	}
}

func TestIngestEventsRejectsInvalidBatch(t *testing.T) {
	store := &fakeEventStore{}
	handler := NewIngestEventsHandler(store, time.Now)

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(`{"events":[]}`))

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", res.Code, res.Body.String())
	}
	if len(store.rows) != 0 {
		t.Fatalf("invalid batches must not be inserted: %+v", store.rows)
	}
}

func TestIngestEventsSurfacesStoreFailure(t *testing.T) {
	store := &fakeEventStore{insertErr: errors.New("clickhouse unavailable")}
	handler := NewIngestEventsHandler(store, time.Now)

	body := `{"events":[{"eventName":"user.signed_up","context":{"tenantId":"org_1","occurredAt":"2026-06-01T11:59:00Z"}}]}`
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(body))

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d: %s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), "event ingest store unavailable") {
		t.Fatalf("unexpected error response: %s", res.Body.String())
	}
}
