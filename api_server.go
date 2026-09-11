package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// allowedOrigins lee la lista blanca de orígenes CORS desde la variable de
// entorno ALLOWED_ORIGINS (separada por comas). Si no está configurada,
// devuelve nil y se mantiene el comportamiento previo (permitir cualquier
// origen) para no romper despliegues existentes sin esta variable.
func allowedOrigins() []string {
	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// authenticateRequest valida el header "Authorization: Bearer <token>" de una
// petición y devuelve el usuario correspondiente. No toca a.user (el estado
// compartido de la instancia): cada petición resuelve su propio usuario.
func (a *App) authenticateRequest(r *http.Request) (*User, error) {
	authHeader := r.Header.Get("Authorization")
	token, ok := strings.CutPrefix(authHeader, "Bearer ")
	if !ok || token == "" {
		return nil, fmt.Errorf("no autenticado")
	}
	userID, ok := sessions.get(token)
	if !ok {
		return nil, fmt.Errorf("no autenticado")
	}
	user, err := a.loadUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("no autenticado")
	}
	return user, nil
}

// withAuth exige una sesión válida y despacha el handler sobre una copia
// superficial de App con `user` fijado al usuario de ESTA petición — así los
// ~44 métodos de negocio que leen a.user/a.tenantID() siguen funcionando sin
// cambios, pero cada petición HTTP ve su propio usuario en vez de un estado
// global compartido entre todos los clientes concurrentes.
func (a *App) withAuth(fn func(*App, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := a.authenticateRequest(r)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "no autenticado"})
			return
		}
		reqApp := *a
		reqApp.user = user
		fn(&reqApp, w, r)
	}
}

// StartAPIServer inicia un servidor HTTP para peticiones móviles
func (a *App) StartAPIServer(port int) {
	mux := http.NewServeMux()
	sessions.startCleanup()

	origins := allowedOrigins()
	if origins == nil {
		fmt.Println("ADVERTENCIA: ALLOWED_ORIGINS no configurada — CORS permite cualquier origen. Configúrala en producción.")
	}

	// Middleware de CORS
	corsWrapper := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origins == nil {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if origin != "" && slices.Contains(origins, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			if r.Method == "OPTIONS" {
				return
			}
			// Bloqueo de mutaciones en Modo Demo
			if a.IsDemoMode && r.URL.Path != "/api/demo-mode" && (r.Method == "POST" || r.Method == "PUT" || r.Method == "DELETE") {
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]string{"error": "Modo Lectura Activo: No se permiten cambios en la base de datos."})
				return
			}
			h(w, r)
		}
	}

	// Endpoints públicos (sin sesión)
	mux.HandleFunc("/api/login", corsWrapper(a.handleLogin))
	mux.HandleFunc("/api/health", corsWrapper(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}))
	mux.HandleFunc("/api/demo-mode", corsWrapper(a.handleDemoMode))

	// Endpoints autenticados: cada uno se despacha sobre una copia de App
	// con el usuario de la sesión de ESA petición (ver withAuth).
	mux.HandleFunc("/api/logout", corsWrapper(a.withAuth((*App).handleLogout)))
	mux.HandleFunc("/api/me", corsWrapper(a.withAuth((*App).handleMe)))
	mux.HandleFunc("/api/animals", corsWrapper(a.withAuth((*App).handleAnimals)))
	mux.HandleFunc("/api/insumos", corsWrapper(a.withAuth((*App).handleInsumos)))
	mux.HandleFunc("/api/corrales", corsWrapper(a.withAuth((*App).handleCorrales)))
	mux.HandleFunc("/api/stats", corsWrapper(a.withAuth((*App).handleStats)))
	mux.HandleFunc("/api/reproduction", corsWrapper(a.withAuth((*App).handleReproduction)))
	mux.HandleFunc("/api/reproduction-events", corsWrapper(a.withAuth((*App).handleReproductionEvents)))
	mux.HandleFunc("/api/treatments", corsWrapper(a.withAuth((*App).handleTreatments)))
	mux.HandleFunc("/api/tasks", corsWrapper(a.withAuth((*App).handleTasks)))
	mux.HandleFunc("/api/births", corsWrapper(a.withAuth((*App).handleBirths)))
	mux.HandleFunc("/api/history", corsWrapper(a.withAuth((*App).handleHistory)))
	mux.HandleFunc("/api/weights", corsWrapper(a.withAuth((*App).handleWeights)))
	mux.HandleFunc("/api/users", corsWrapper(a.withAuth((*App).handleUsers)))
	mux.HandleFunc("/api/change-password", corsWrapper(a.withAuth((*App).handleChangePasswordAPI)))
	mux.HandleFunc("/api/import-excel", corsWrapper(a.withAuth((*App).handleImportExcelAPI)))
	mux.HandleFunc("/api/confirm-ultrasound", corsWrapper(a.withAuth((*App).handleConfirmUltrasound)))

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

	if !loginAttempts.allowed(creds.Email) {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": "demasiados intentos fallidos, intenta de nuevo en unos minutos"})
		return
	}

	user, err := a.authenticate(creds.Email, creds.Password)
	if err != nil {
		loginAttempts.recordFailure(creds.Email)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	loginAttempts.clear(creds.Email)

	token, err := sessions.create(user.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "no se pudo iniciar sesión"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"token":   token,
		"user":    user,
	})
}

// handleLogout revoca el token de sesión de la petición actual.
func (a *App) handleLogout(w http.ResponseWriter, r *http.Request) {
	if token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok {
		sessions.delete(token)
	}
	w.WriteHeader(http.StatusOK)
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
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Falta id", http.StatusBadRequest)
			return
		}
		err := a.DeleteAnimal(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
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
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "ID requerido", http.StatusBadRequest)
			return
		}
		if err := a.DeleteCorral(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
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
	switch r.Method {
	case http.MethodGet:
		partos, err := a.GetPartos("")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(partos)
	case http.MethodPost:
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
	default:
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleReproductionEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	events, err := a.GetEventosReproductivos()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
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
	case http.MethodPut:
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		err := a.UpdateUser(u)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
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

	// Cambiar la contraseña invalida todas las sesiones de este usuario
	// (incluida la actual) para forzar re-login en otros dispositivos;
	// se emite un token nuevo de inmediato para no cerrar la sesión actual.
	sessions.deleteAllForUser(a.user.ID)
	newToken, err := sessions.create(a.user.ID)
	if err != nil {
		http.Error(w, "contraseña actualizada, pero no se pudo renovar la sesión", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"token": newToken})
}

// handleDemoMode: la lectura del estado es pública (solo informativa), pero
// cambiarlo requiere una sesión autenticada.
func (a *App) handleDemoMode(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		json.NewEncoder(w).Encode(map[string]bool{"enabled": a.IsDemoMode})
		return
	}
	if r.Method == http.MethodPost {
		user, err := a.authenticateRequest(r)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "no autenticado"})
			return
		}
		reqApp := *a
		reqApp.user = user

		var data struct {
			Enabled bool `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}
		if err := reqApp.ToggleDemoMode(data.Enabled); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		a.IsDemoMode = data.Enabled // ToggleDemoMode mutó la copia; propagar a la instancia compartida
		w.WriteHeader(http.StatusOK)
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
