//go:build server

package main

import "fmt"

// En el servidor la plantilla se descarga por HTTP (/api/import-template).
func (a *App) ExportImportTemplate() (string, error) {
	return "", fmt.Errorf("usa /api/import-template en la versión web")
}
