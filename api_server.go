package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// StartAPIServer inicia un servidor HTTP para peticiones móviles
func (a *App) StartAPIServer(port int) {
	mux := http.NewServeMux()

	// Middleware de CORS simplificado
	corsWrapper := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			if r.Method == "OPTIONS" {
				return
			}
			// Bloqueo de mutaciones en Modo Demo
			if a.IsDemoMode && (r.Method == "POST" || r.Method == "PUT" || r.Method == "DELETE") {
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]string{"error": "Modo Lectura Activo: No se permiten cambios en la base de datos."})
				return
			}
			h(w, r)
		}
	}

	// Endpoints
	mux.HandleFunc("/api/login", corsWrapper(a.handleLogin))
	mux.HandleFunc("/api/animals", corsWrapper(a.handleAnimals))
	mux.HandleFunc("/api/corrales", corsWrapper(a.handleCorrales))
	mux.HandleFunc("/api/stats", corsWrapper(a.handleStats))
	mux.HandleFunc("/api/reproduction", corsWrapper(a.handleReproduction))
	mux.HandleFunc("/api/treatments", corsWrapper(a.handleTreatments))
	mux.HandleFunc("/api/tasks", corsWrapper(a.handleTasks))
	mux.HandleFunc("/api/births", corsWrapper(a.handleBirths))
	mux.HandleFunc("/api/health", corsWrapper(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}))

	fmt.Printf("Servidor API iniciado en puerto %d\n", port)
	go http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
}

func (a *App) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	err := a.Login(creds.Email, creds.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    a.user,
	})
}

func (a *App) handleAnimals(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		animals, err := a.GetAnimales()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(animals)
	case http.MethodPost:
		var animal Animal
		if err := json.NewDecoder(r.Body).Decode(&animal); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.AddAnimal(animal)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleCorrales(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	corrales, err := a.GetCorrales()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(corrales)
}

func (a *App) handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	stats, err := a.GetStats()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(stats)
}

func (a *App) handleReproduction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	var event EventoReproductivo
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	err := a.RegistrarEventoReproductivo(event)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (a *App) handleTreatments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	var t Tratamiento
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	err := a.RegistrarTratamiento(t)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (a *App) handleTasks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		tasks, err := a.GetTareas()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(tasks)
	case http.MethodPost:
		var task Tarea
		if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.AddTarea(task)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleBirths(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	var p Parto
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	err := a.RegistrarParto(p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}
