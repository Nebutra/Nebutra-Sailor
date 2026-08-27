// Package auth mirrors the jose HS256 service-token contract from
// packages/iam/auth/src/s2s.ts.
//
// Token: short-lived JWT (alg=HS256) with claims userId / organizationId /
// role / plan plus required iat, exp, and jti. Legacy hex-HMAC digests are
// no longer accepted.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"os"
	"strings"
	"time"
)

// VerifyServiceToken returns true when token is a valid HS256 JWT whose
// tenant claims match the expected header fields (same semantics as
// verifyServiceToken in s2s.ts). Empty expected fields must be absent
// (or empty) on the JWT.
func VerifyServiceToken(token, userID, orgID, role, plan string) bool {
	secret := os.Getenv("SERVICE_SECRET")
	if secret == "" || token == "" {
		return false
	}

	payload, ok := verifyHS256JWT(token, secret)
	if !ok {
		return false
	}

	return claimMatches(payload, "userId", userID) &&
		claimMatches(payload, "organizationId", orgID) &&
		claimMatches(payload, "role", role) &&
		claimMatches(payload, "plan", plan)
}

func claimMatches(payload map[string]any, name, expected string) bool {
	raw, exists := payload[name]
	if expected == "" {
		// TS compares (payload.X ?? undefined) === expected.X when expected
		// field is omitted — empty string expected means claim must be absent
		// or empty.
		if !exists || raw == nil {
			return true
		}
		s, ok := raw.(string)
		return ok && s == ""
	}
	s, ok := raw.(string)
	return ok && s == expected
}

func verifyHS256JWT(token, secret string) (map[string]any, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, false
	}
	headerB64, payloadB64, sigB64 := parts[0], parts[1], parts[2]

	signingInput := headerB64 + "." + payloadB64
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)

	got, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil || !hmac.Equal(got, expected) {
		return nil, false
	}

	headerJSON, err := base64.RawURLEncoding.DecodeString(headerB64)
	if err != nil {
		return nil, false
	}
	var header map[string]any
	if err := json.Unmarshal(headerJSON, &header); err != nil {
		return nil, false
	}
	if alg, _ := header["alg"].(string); alg != "HS256" {
		return nil, false
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, false
	}
	var payload map[string]any
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, false
	}

	// Require iat, exp, jti (matches jose options.require in s2s.ts / Python).
	if _, ok := asNumber(payload["iat"]); !ok {
		return nil, false
	}
	exp, ok := asNumber(payload["exp"])
	if !ok {
		return nil, false
	}
	if jti, _ := payload["jti"].(string); jti == "" {
		return nil, false
	}
	if float64(time.Now().Unix()) > exp {
		return nil, false
	}

	return payload, true
}

func asNumber(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	case int64:
		return float64(n), true
	case int:
		return float64(n), true
	default:
		return 0, false
	}
}
