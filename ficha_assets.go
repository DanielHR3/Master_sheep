package main

import (
	_ "embed"
	"strings"
)

// Escudos que van en la cabecera de la ficha, embebidos para que el PDF se
// genere igual en escritorio y en el servidor.
var (
	//go:embed frontend/public/logo_bugambilias.png
	logoBugambilias []byte
	//go:embed frontend/public/logo_donpablito.png
	logoDonPablito []byte
	//go:embed frontend/public/logo.png
	logoSheepMaster []byte
)

// ranchoBranding decide nombre y escudo del rancho para la ficha. El nombre
// del perfil manda; si no hay, se deduce del correo como hace la UI.
func ranchoBranding(email, perfilNombre string) (nombre string, logo []byte, tipo string) {
	e := strings.ToLower(email)
	switch {
	case strings.Contains(e, "bugambilias"):
		nombre, logo, tipo = "Rancho Las Bugambilias", logoBugambilias, "PNG"
	case strings.Contains(e, "pablito"):
		nombre, logo, tipo = "Rancho Don Pablito", logoDonPablito, "PNG"
	default:
		nombre, logo, tipo = "SheepMaster", logoSheepMaster, "PNG"
	}
	if strings.TrimSpace(perfilNombre) != "" {
		nombre = strings.TrimSpace(perfilNombre)
	}
	return
}
