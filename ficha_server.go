//go:build server

package main

import "fmt"

// En el servidor la ficha se descarga por HTTP (GET /api/animals/{id}/ficha).
func (a *App) ExportFichaGenealogica(animalID string) (string, error) {
	return "", fmt.Errorf("usa /api/animals/{id}/ficha en la versión web")
}
