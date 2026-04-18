package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Iniciar servidor API para acceso móvil en puerto 8080
	port := 8080
	app.StartAPIServer(port)

	// Verificar si estamos en modo servidor (Docker/Cloud)
	if os.Getenv("SERVER_ONLY") == "true" {
		fmt.Printf("Modo SERVIDOR ACTIVO. API escuchando en puerto %d...\n", port)
		app.startup(context.Background())
		
		// Bloquear ejecución para mantener el contenedor vivo
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		return
	}

	// Modo Desktop (Wails)
	err := wails.Run(&options.App{
		Title:  "Master Sheep",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
