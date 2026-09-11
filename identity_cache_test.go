package main

import (
	"database/sql"
	"testing"

	"golang.org/x/crypto/bcrypt"

	_ "modernc.org/sqlite"
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

func TestLoginDesktopFallsBackWhenCloudUnreachable(t *testing.T) {
	a := newTestApp(t)
	// a.cloudDB is nil, simulating "no internet" / never configured.
	hash, _ := bcrypt.GenerateFromPassword([]byte("hunter2"), bcrypt.DefaultCost)
	user := &User{ID: "u1", Email: "rancher@example.com", Name: "Rancher", Role: "Admin", RanchoID: "rancho-1"}
	if err := a.cacheIdentity(user, string(hash)); err != nil {
		t.Fatalf("cacheIdentity: %v", err)
	}

	got, err := a.loginDesktop("rancher@example.com", "hunter2")
	if err != nil {
		t.Fatalf("loginDesktop should fall back to cache when cloudDB is nil: %v", err)
	}
	if got.ID != "u1" {
		t.Errorf("got ID %q, want u1", got.ID)
	}
}

func newFakeCloudUsersDB(t *testing.T, email, plaintextPassword string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open fake cloud users db: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, role TEXT, rancho_id TEXT, password TEXT)`); err != nil {
		t.Fatalf("create fake users table: %v", err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintextPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}
	_, err = db.Exec(`INSERT INTO users (id, email, name, role, rancho_id, password) VALUES ($1, $2, $3, $4, $5, $6)`,
		"cloud-u1", email, "Cloud User", "Admin", "cloud-rancho-1", string(hash))
	if err != nil {
		t.Fatalf("seed fake cloud user: %v", err)
	}
	return db
}

func TestAuthenticateCloudSuccess(t *testing.T) {
	cloud := newFakeCloudUsersDB(t, "cloud@example.com", "s3cret")
	user, err := authenticateCloud(cloud, "cloud@example.com", "s3cret")
	if err != nil {
		t.Fatalf("authenticateCloud: %v", err)
	}
	if user.RanchoID != "cloud-rancho-1" {
		t.Errorf("got RanchoID %q, want cloud-rancho-1", user.RanchoID)
	}

	if _, err := authenticateCloud(cloud, "cloud@example.com", "wrong"); err == nil {
		t.Error("expected an error for the wrong password, got nil")
	}
}

func TestLoginDesktopCachesIdentityWhenCloudReachable(t *testing.T) {
	a := newTestApp(t)
	a.cloudDB = newFakeCloudUsersDB(t, "cloud@example.com", "s3cret")

	user, err := a.loginDesktop("cloud@example.com", "s3cret")
	if err != nil {
		t.Fatalf("loginDesktop: %v", err)
	}
	if user.RanchoID != "cloud-rancho-1" {
		t.Errorf("got RanchoID %q, want cloud-rancho-1", user.RanchoID)
	}

	var cachedRancho string
	err = a.db.QueryRow("SELECT rancho_id FROM cached_identity WHERE email = ?", "cloud@example.com").Scan(&cachedRancho)
	if err != nil {
		t.Fatalf("expected identity to be cached locally after cloud login: %v", err)
	}
	if cachedRancho != "cloud-rancho-1" {
		t.Errorf("cached rancho_id %q, want cloud-rancho-1", cachedRancho)
	}
}

func TestLoginDesktopRejectsWrongPasswordWithoutFallingBackToCache(t *testing.T) {
	a := newTestApp(t)
	a.cloudDB = newFakeCloudUsersDB(t, "cloud@example.com", "s3cret")
	// Seed a DIFFERENT cached password to prove a wrong-password rejection
	// from a reachable cloud does not fall back and check the stale cache.
	hash, _ := bcrypt.GenerateFromPassword([]byte("stale-cached-password"), bcrypt.DefaultCost)
	_ = a.cacheIdentity(&User{ID: "cloud-u1", Email: "cloud@example.com", RanchoID: "cloud-rancho-1"}, string(hash))

	if _, err := a.loginDesktop("cloud@example.com", "stale-cached-password"); err == nil {
		t.Error("expected the cloud's rejection of this password to stand, not fall back to the stale cache")
	}
}
