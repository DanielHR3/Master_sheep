package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

// Punto de entrada limpio para modo servidor (Docker/Cloud).
// No importa Wails, por lo que compila sin dependencias de pantalla gráfica.
func main() {
	app := NewApp()

	// Determinar puerto
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		fmt.Sscanf(p, "%d", &port)
	}

	// Inicializar base de datos
	if err := app.initDB(); err != nil {
		fmt.Printf("Error al inicializar la base de datos: %v\n", err)
		os.Exit(1)
	}
	app.ctx = context.Background()

	// Iniciar servidor API + frontend estático
	app.StartAPIServer(port)
	fmt.Printf("=== Master Sheep - Servidor activo en puerto %d ===\n", port)

	// Mantener el proceso vivo hasta señal de apagado
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan
	fmt.Println("Servidor detenido.")
}
