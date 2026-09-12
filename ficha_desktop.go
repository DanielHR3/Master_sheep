//go:build !server

package main

import (
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ExportFichaGenealogica (escritorio) genera la ficha y abre "Guardar como".
// Devuelve la ruta elegida ("" si el usuario canceló).
func (a *App) ExportFichaGenealogica(animalID string) (string, error) {
	pdf, name, err := a.fichaPDFBytes(animalID)
	if err != nil {
		return "", err
	}
	if a.ctx == nil {
		return "", fmt.Errorf("la app no ha terminado de iniciar")
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Guardar ficha genealógica",
		DefaultFilename: name,
		Filters:         []runtime.FileFilter{{DisplayName: "PDF (*.pdf)", Pattern: "*.pdf"}},
	})
	if err != nil || path == "" {
		return "", err
	}
	return path, os.WriteFile(path, pdf, 0o644)
}
