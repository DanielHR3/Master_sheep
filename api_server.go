package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
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

	// Endpoints API
	mux.HandleFunc("/api/login", corsWrapper(a.handleLogin))
	mux.HandleFunc("/api/me", corsWrapper(a.handleMe))
	mux.HandleFunc("/api/animals", corsWrapper(a.handleAnimals))
	mux.HandleFunc("/api/insumos", corsWrapper(a.handleInsumos))
	mux.HandleFunc("/api/corrales", corsWrapper(a.handleCorrales))
	mux.HandleFunc("/api/stats", corsWrapper(a.handleStats))
	mux.HandleFunc("/api/reproduction", corsWrapper(a.handleReproduction))
	mux.HandleFunc("/api/treatments", corsWrapper(a.handleTreatments))
	mux.HandleFunc("/api/tasks", corsWrapper(a.handleTasks))
	mux.HandleFunc("/api/births", corsWrapper(a.handleBirths))
	mux.HandleFunc("/api/history", corsWrapper(a.handleHistory))
	mux.HandleFunc("/api/weights", corsWrapper(a.handleWeights))
	mux.HandleFunc("/api/users", corsWrapper(a.handleUsers))
	mux.HandleFunc("/api/change-password", corsWrapper(a.handleChangePasswordAPI))
	mux.HandleFunc("/api/demo-mode", corsWrapper(a.handleDemoMode))
	mux.HandleFunc("/api/import-excel", corsWrapper(a.handleImportExcelAPI))
	mux.HandleFunc("/api/confirm-ultrasound", corsWrapper(a.handleConfirmUltrasound))
	mux.HandleFunc("/api/health", corsWrapper(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}))

	// Servir archivos estáticos del frontend (PWA)
	staticDir := "./frontend/dist"
	
	// Handler para archivos estáticos con SPA Fallback
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Si la ruta no es /api, intentar servir archivo estático
		path := filepath.Join(staticDir, r.URL.Path)
		info, err := os.Stat(path)
		
		// Si el archivo no existe o es un directorio, servir index.html (SPA Fallback)
		if os.IsNotExist(err) || info.IsDir() {
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}

		http.ServeFile(w, r, path)
	})

	fmt.Printf("Servidor API y Web iniciado en puerto %d\n", port)
	go func() {
		err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", port), mux)
		if err != nil {
			fmt.Printf("ERROR iniciando servidor API: %v\n", err)
		}
	}()
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
	switch r.Method {
	case http.MethodGet:
		corrales, err := a.GetCorrales()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(corrales)
	case http.MethodPost:
		var c Corral
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.AddCorral(c)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleInsumos(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		insumos, err := a.GetInsumos()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(insumos)
	case http.MethodPost:
		var i Insumo
		if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.AddInsumo(i)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleMe(w http.ResponseWriter, r *http.Request) {
	if a.user == nil {
		http.Error(w, "No autenticado", http.StatusUnauthorized)
		return
	}
	json.NewEncoder(w).Encode(a.user)
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
func (a *App) handleImportExcelAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	// Limite de 10MB
	r.ParseMultipartForm(10 << 20)

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error recuperando el archivo", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Error leyendo el archivo", http.StatusInternalServerError)
		return
	}

	count, err := a.ImportAnimalsExcelData(data)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   count,
	})
}

func (a *App) handleWeights(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		animalID := r.URL.Query().Get("animal_id")
		weights, err := a.GetSeguimientosPeso(animalID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(weights)
	case http.MethodPost:
		var s SeguimientoPeso
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.AddSeguimientoPeso(s)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		users, err := a.GetUsers()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(users)
	case http.MethodPost:
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.AddUser(u)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		err := a.DeleteUser(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleHistory(w http.ResponseWriter, r *http.Request) {
	animalID := r.URL.Query().Get("animal_id")
	history, err := a.GetHistorialClinico(animalID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(history)
}

func (a *App) handleChangePasswordAPI(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Old string `json:"old"`
		New string `json:"new"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	err := a.ChangePassword(data.Old, data.New)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (a *App) handleDemoMode(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		json.NewEncoder(w).Encode(map[string]bool{"enabled": a.IsDemoMode})
		return
	}
	http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
}

func (a *App) handleConfirmUltrasound(w http.ResponseWriter, r *http.Request) {
	var data struct {
		AnimalID string `json:"animal_id"`
		Preñada  bool   `json:"preñada"`
		Fetos    int    `json:"fetos"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	err := a.ConfirmarUltrasonido(data.AnimalID, data.Preñada, data.Fetos)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
