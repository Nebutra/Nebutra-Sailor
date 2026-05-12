// Package auth mirrors the HMAC service-token contract from
// packages/iam/auth/src/s2s.ts.
//
// Canonical format: "{userId}:{orgId}:{role}:{plan}"
// Algorithm:        HMAC-SHA256 hex, key = SERVICE_SECRET env var
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strings"
)

// VerifyServiceToken returns true when token matches the expected HMAC for
// the given tenant fields. Empty/missing fields are included as empty strings,
// matching the behaviour of canonicalizeServiceTokenContext in s2s.ts.
func VerifyServiceToken(token, userID, orgID, role, plan string) bool {
	secret := os.Getenv("SERVICE_SECRET")
	if secret == "" || token == "" {
		return false
	}
	canonical := strings.Join([]string{userID, orgID, role, plan}, ":")
	expected := signHMAC(canonical, secret)
	return hmac.Equal([]byte(token), []byte(expected))
}

func signHMAC(payload, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}
