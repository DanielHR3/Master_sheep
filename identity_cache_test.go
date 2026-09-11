package main

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestCacheIdentityThenAuthenticateOffline(t *testing.T) {
	a := newTestApp(t)
	hash, err := bcrypt.GenerateFromPassword([]byte("hunter2"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}
	user := &User{ID: "u1", Email: "rancher@example.com", Name: "Rancher", Role: "Admin", RanchoID: "rancho-1"}

	if err := a.cacheIdentity(user, string(hash)); err != nil {
		t.Fatalf("cacheIdentity: %v", err)
	}

	got, err := a.authenticateOffline("rancher@example.com", "hunter2")
	if err != nil {
		t.Fatalf("authenticateOffline with correct password: %v", err)
	}
	if got.ID != "u1" || got.RanchoID != "rancho-1" {
		t.Errorf("got %+v, want ID=u1 RanchoID=rancho-1", got)
	}

	if _, err := a.authenticateOffline("rancher@example.com", "wrong-password"); err == nil {
		t.Error("expected an error for the wrong password, got nil")
	}

	if _, err := a.authenticateOffline("nobody@example.com", "hunter2"); err == nil {
		t.Error("expected an error for an email with no cached identity, got nil")
	}
}
