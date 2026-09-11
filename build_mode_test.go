// build_mode_test.go
package main

import "testing"

func TestDefaultBuildIsDesktop(t *testing.T) {
	// This test file is compiled without the "server" tag by default,
	// so isServerBuild must be false unless -tags server is passed.
	if isServerBuild {
		t.Fatal("expected isServerBuild to be false in the default (desktop) build")
	}
}
