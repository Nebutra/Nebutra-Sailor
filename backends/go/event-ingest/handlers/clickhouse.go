package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

const defaultClickHouseDatabase = "nebutra"

var clickHouseIdentifierPattern = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

// ClickHouseStore persists normalized events through ClickHouse's HTTP API.
type ClickHouseStore struct {
	url      string
	username string
	password string
	database string
	client   *http.Client
}

type clickHouseEventRow struct {
	EventID         string  `json:"event_id"`
	EventName       string  `json:"event_name"`
	TenantID        string  `json:"tenant_id"`
	UserID          *string `json:"user_id"`
	SessionID       *string `json:"session_id"`
	UTMSource       *string `json:"utm_source"`
	UTMMedium       *string `json:"utm_medium"`
	UTMCampaign     *string `json:"utm_campaign"`
	ExperimentID    *string `json:"experiment_id"`
	RequestID       *string `json:"request_id"`
	TraceID         *string `json:"trace_id"`
	Source          string  `json:"source"`
	ContractVersion string  `json:"contract_version"`
	EventTime       string  `json:"event_time"`
	ReceivedAt      string  `json:"received_at"`
	EventProperties string  `json:"event_properties"`
}

// NewClickHouseStoreFromEnv builds the production ClickHouse adapter from env.
func NewClickHouseStoreFromEnv() *ClickHouseStore {
	username := firstEnv("CLICKHOUSE_USERNAME", "CLICKHOUSE_USER")
	if username == "" {
		username = "default"
	}

	return &ClickHouseStore{
		url:      clickHouseHTTPURLFromEnv(),
		username: username,
		password: os.Getenv("CLICKHOUSE_PASSWORD"),
		database: sanitizeClickHouseIdentifier(envOr("CLICKHOUSE_DATABASE", defaultClickHouseDatabase)),
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Ensure creates the target database/table idempotently.
func (s *ClickHouseStore) Ensure(ctx context.Context) error {
	if err := s.exec(ctx, fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", s.database), nil); err != nil {
		return err
	}
	return s.exec(ctx, fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s.events_bronze (
			event_id String,
			event_name LowCardinality(String),
			tenant_id String,
			user_id Nullable(String),
			session_id Nullable(String),
			utm_source Nullable(String),
			utm_medium Nullable(String),
			utm_campaign Nullable(String),
			experiment_id Nullable(String),
			request_id Nullable(String),
			trace_id Nullable(String),
			source LowCardinality(String),
			contract_version LowCardinality(String),
			event_time DateTime64(3, 'UTC'),
			received_at DateTime64(3, 'UTC'),
			event_properties String
		)
		ENGINE = ReplacingMergeTree(received_at)
		PARTITION BY toYYYYMM(event_time)
		ORDER BY (tenant_id, event_time, event_id)
	`, s.database), nil)
}

// Insert writes a batch with JSONEachRow.
func (s *ClickHouseStore) Insert(ctx context.Context, rows []EventRow) error {
	if len(rows) == 0 {
		return nil
	}

	var body bytes.Buffer
	writer := bufio.NewWriter(&body)
	encoder := json.NewEncoder(writer)
	for _, row := range rows {
		if err := encoder.Encode(toClickHouseEventRow(row)); err != nil {
			return fmt.Errorf("encode clickhouse row: %w", err)
		}
	}
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("flush clickhouse body: %w", err)
	}

	return s.exec(ctx, fmt.Sprintf(`
		INSERT INTO %s.events_bronze (
			event_id,
			event_name,
			tenant_id,
			user_id,
			session_id,
			utm_source,
			utm_medium,
			utm_campaign,
			experiment_id,
			request_id,
			trace_id,
			source,
			contract_version,
			event_time,
			received_at,
			event_properties
		) FORMAT JSONEachRow
	`, s.database), &body)
}

func (s *ClickHouseStore) exec(ctx context.Context, query string, body io.Reader) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.url, body)
	if err != nil {
		return err
	}
	values := req.URL.Query()
	values.Set("query", query)
	req.URL.RawQuery = values.Encode()
	if s.username != "" {
		req.SetBasicAuth(s.username, s.password)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		data, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("clickhouse returned %s: %s", resp.Status, strings.TrimSpace(string(data)))
	}
	return nil
}

func toClickHouseEventRow(row EventRow) clickHouseEventRow {
	return clickHouseEventRow{
		EventID:         row.EventID,
		EventName:       row.EventName,
		TenantID:        row.TenantID,
		UserID:          row.UserID,
		SessionID:       row.SessionID,
		UTMSource:       row.UTMSource,
		UTMMedium:       row.UTMMedium,
		UTMCampaign:     row.UTMCampaign,
		ExperimentID:    row.ExperimentID,
		RequestID:       row.RequestID,
		TraceID:         row.TraceID,
		Source:          row.Source,
		ContractVersion: row.ContractVersion,
		EventTime:       clickHouseDateTime64(row.EventTime),
		ReceivedAt:      clickHouseDateTime64(row.ReceivedAt),
		EventProperties: row.EventProperties,
	}
}

func clickHouseDateTime64(value time.Time) string {
	return value.UTC().Format("2006-01-02 15:04:05.000")
}

func clickHouseHTTPURLFromEnv() string {
	if value := firstEnv("CLICKHOUSE_URL", "CLICKHOUSE_HTTP_URL"); value != "" {
		return withHTTPProtocol(strings.TrimRight(value, "/"))
	}
	host := envOr("CLICKHOUSE_HOST", "localhost")
	port := envOr("CLICKHOUSE_PORT", "8123")
	return withHTTPProtocol(fmt.Sprintf("%s:%s", host, port))
}

func withHTTPProtocol(value string) string {
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	return "http://" + value
}

func envOr(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func firstEnv(names ...string) string {
	for _, name := range names {
		if value := os.Getenv(name); value != "" {
			return value
		}
	}
	return ""
}

func sanitizeClickHouseIdentifier(value string) string {
	if clickHouseIdentifierPattern.MatchString(value) {
		return value
	}
	return defaultClickHouseDatabase
}
