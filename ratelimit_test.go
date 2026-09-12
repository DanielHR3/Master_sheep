package main

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestAttemptLimiterBlocksAfterMax(t *testing.T) {
	l := newAttemptLimiter(2, time.Hour)
	if !l.allowed("k") {
		t.Fatal("first attempt should be allowed")
	}
	l.record("k")
	l.record("k")
	if l.allowed("k") {
		t.Fatal("third attempt should be blocked")
	}
	if !l.allowed("other") {
		t.Fatal("other key must be independent")
	}
	l.clear("k")
	if !l.allowed("k") {
		t.Fatal("clear should reset the key")
	}
}

func TestAttemptLimiterForgetsOldAttempts(t *testing.T) {
	l := newAttemptLimiter(1, time.Millisecond)
	l.record("k")
	time.Sleep(5 * time.Millisecond)
	if !l.allowed("k") {
		t.Fatal("attempts outside the window must not count")
	}
}

func TestClientIPPrefersForwardedFor(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/contact", nil)
	r.RemoteAddr = "10.0.0.1:5555"
	if got := clientIP(r); got != "10.0.0.1" {
		t.Errorf("RemoteAddr host = %q", got)
	}
	r.Header.Set("X-Forwarded-For", "203.0.113.9, 10.0.0.2")
	if got := clientIP(r); got != "203.0.113.9" {
		t.Errorf("first X-Forwarded-For = %q", got)
	}
}

func TestContactAttemptsLimit(t *testing.T) {
	if contactAttempts.max != 5 || contactAttempts.window != time.Hour {
		t.Errorf("contactAttempts = %d/%v, want 5/1h", contactAttempts.max, contactAttempts.window)
	}
	if loginAttempts.max != 5 || loginAttempts.window != 15*time.Minute {
		t.Errorf("loginAttempts = %d/%v, want 5/15m", loginAttempts.max, loginAttempts.window)
	}
}
