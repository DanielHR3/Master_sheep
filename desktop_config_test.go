package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDesktopConfigSetsOnlyUnsetKeys(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.env")
	os.WriteFile(path, []byte("# comentario\n\nDATABASE_URL_TEST=\"postgres://x\"\nSM_ALREADY_SET=nuevo\nsin_igual\n"), 0600)
	t.Setenv("SM_ALREADY_SET", "original")
	t.Setenv("DATABASE_URL_TEST", "")

	if n := loadDesktopConfig(path); n != 1 {
		t.Fatalf("applied %d keys, want 1", n)
	}
	if got := os.Getenv("DATABASE_URL_TEST"); got != "postgres://x" {
		t.Errorf("DATABASE_URL_TEST = %q, want postgres://x (quotes stripped)", got)
	}
	if got := os.Getenv("SM_ALREADY_SET"); got != "original" {
		t.Errorf("existing env var was overwritten: %q", got)
	}
}

func TestLoadDesktopConfigMissingFileIsNoop(t *testing.T) {
	if n := loadDesktopConfig(filepath.Join(t.TempDir(), "nope.env")); n != 0 {
		t.Fatalf("applied %d keys from a missing file", n)
	}
}
