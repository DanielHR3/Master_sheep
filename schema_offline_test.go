package main

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func newTestApp(t *testing.T) *App {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	// Una sola conexión: cada conexión nueva a ":memory:" sería una base
	// vacía distinta, y las goroutines (p. ej. el aviso por correo) verían
	// "no such table".
	db.SetMaxOpenConns(1)
	a := &App{db: db, driverName: "sqlite"}
	if err := a.createSchema(); err != nil {
		t.Fatalf("createSchema: %v", err)
	}
	a.runMigrations()
	return a
}

func tableExists(t *testing.T, a *App, name string) bool {
	t.Helper()
	var got string
	err := a.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", name).Scan(&got)
	return err == nil && got == name
}

func TestOfflineSchemaTablesExist(t *testing.T) {
	a := newTestApp(t)
	if !tableExists(t, a, "cached_identity") {
		t.Error("expected cached_identity table to exist")
	}
	if !tableExists(t, a, "sync_outbox") {
		t.Error("expected sync_outbox table to exist")
	}
}
