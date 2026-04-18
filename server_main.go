//go:build server

package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

// Punto de entrada para modo servidor cloud (Docker/Railway/Render).
// Se compila con: go build -tags server -o server .
// No importa Wails, compila en cualquier Linux sin pantalla gráfica.
func main() {
	app := NewApp()

	// Determinar puerto desde variable de entorno o usar 8080 por defecto
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		fmt.Sscanf(p, "%d", &port)
	}

	// Inicializar base de datos (PostgreSQL si hay DATABASE_URL, si no SQLite)
	if err := app.initDB(); err != nil {
		fmt.Printf("ERROR al inicializar la base de datos: %v\n", err)
		os.Exit(1)
	}
	app.ctx = context.Background()

	// Iniciar servidor HTTP (API REST + frontend estático)
	app.StartAPIServer(port)
	fmt.Printf("=== Master Sheep - Servidor activo en puerto %d ===\n", port)

	// Mantener el proceso vivo hasta señal de apagado
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan
	fmt.Println("Servidor detenido correctamente.")
}
