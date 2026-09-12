//go:build !server

package main

import (
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ExportImportTemplate (escritorio) abre un diálogo "Guardar como" y escribe
// la plantilla .xlsx de carga masiva. Devuelve la ruta elegida ("" si canceló).
func (a *App) ExportImportTemplate() (string, error) {
	data, err := buildImportTemplate()
	if err != nil {
		return "", err
	}
	if a.ctx == nil {
		return "", fmt.Errorf("la app no ha terminado de iniciar")
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Guardar plantilla de carga masiva",
		DefaultFilename: "plantilla_animales_sheepmaster.xlsx",
		Filters:         []runtime.FileFilter{{DisplayName: "Excel (*.xlsx)", Pattern: "*.xlsx"}},
	})
	if err != nil || path == "" {
		return "", err
	}
	return path, os.WriteFile(path, data, 0o644)
}
