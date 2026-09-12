package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// desktopConfigPath es donde la app de escritorio busca su configuración
// (misma carpeta que la base de datos local). Formato: líneas KEY=VALUE,
// comentarios con '#'. Hoy la única llave relevante es DATABASE_URL.
func desktopConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, "Documents", "SheepMaster", "config.env")
}

// loadDesktopConfig vuelca las llaves de `path` al entorno del proceso, sin
// pisar variables que ya vengan definidas. La app de escritorio se lanza
// desde Finder/Explorador sin entorno de shell, así que sin esto nunca
// vería DATABASE_URL y no podría ni hacer login en nube ni sincronizar.
// Devuelve cuántas llaves aplicó; un archivo inexistente no es error.
func loadDesktopConfig(path string) int {
	f, err := os.Open(path)
	if err != nil {
		return 0
	}
	defer f.Close()

	applied := 0
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		if os.Setenv(key, value) == nil {
			applied++
		}
	}
	return applied
}
