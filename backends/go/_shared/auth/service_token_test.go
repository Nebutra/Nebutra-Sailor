package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
	"time"
)

const testSecret = "test-secret-for-s2s-jwt-go"

func b64url(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func mintJWT(t *testing.T, secret string, claims map[string]any) string {
	t.Helper()
	header, _ := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	payload, _ := json.Marshal(claims)
	h := b64url(header)
	p := b64url(payload)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(h + "." + p))
	return h + "." + p + "." + b64url(mac.Sum(nil))
}

func TestVerifyServiceToken_AcceptsShortLivedJWT(t *testing.T) {
	t.Setenv("SERVICE_SECRET", testSecret)
	now := time.Now().Unix()
	token := mintJWT(t, testSecret, map[string]any{
		"organizationId": "org_123",
		"plan":           "PRO",
		"iat":            now,
		"exp":            now + 300,
		"jti":            "jwt_go_1",
	})

	if !VerifyServiceToken(token, "", "org_123", "", "PRO") {
		t.Fatal("expected JWT service token to verify")
	}
}

func TestVerifyServiceToken_RejectsClaimMismatch(t *testing.T) {
	t.Setenv("SERVICE_SECRET", testSecret)
	now := time.Now().Unix()
	token := mintJWT(t, testSecret, map[string]any{
		"organizationId": "org_expected",
		"plan":           "PRO",
		"iat":            now,
		"exp":            now + 300,
		"jti":            "jwt_go_2",
	})

	if VerifyServiceToken(token, "", "org_spoofed", "", "PRO") {
		t.Fatal("expected claim mismatch to fail")
	}
}

func TestVerifyServiceToken_RejectsRetiredHexHMAC(t *testing.T) {
	t.Setenv("SERVICE_SECRET", testSecret)
	canonical := ":org_legacy::PRO"
	mac := hmac.New(sha256.New, []byte(testSecret))
	_, _ = mac.Write([]byte(canonical))
	legacy := hex.EncodeToString(mac.Sum(nil))

	if VerifyServiceToken(legacy, "", "org_legacy", "", "PRO") {
		t.Fatal("legacy hex-HMAC must be rejected (JWT-only)")
	}
}

func TestVerifyServiceToken_RejectsExpired(t *testing.T) {
	t.Setenv("SERVICE_SECRET", testSecret)
	now := time.Now().Unix()
	token := mintJWT(t, testSecret, map[string]any{
		"organizationId": "org_123",
		"plan":           "PRO",
		"iat":            now - 600,
		"exp":            now - 60,
		"jti":            "jwt_expired",
	})

	if VerifyServiceToken(token, "", "org_123", "", "PRO") {
		t.Fatal("expired JWT must be rejected")
	}
}

func TestVerifyServiceToken_MissingSecret(t *testing.T) {
	_ = os.Unsetenv("SERVICE_SECRET")
	now := time.Now().Unix()
	token := mintJWT(t, testSecret, map[string]any{
		"organizationId": "org_123",
		"plan":           "PRO",
		"iat":            now,
		"exp":            now + 300,
		"jti":            "jwt_no_secret",
	})
	if VerifyServiceToken(token, "", "org_123", "", "PRO") {
		t.Fatal("missing SERVICE_SECRET must fail closed")
	}
}
