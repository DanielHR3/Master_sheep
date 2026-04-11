package main

import "time"

type Corral struct {
	ID        string    `json:"id"`
	Nombre    string    `json:"nombre"`
	Tipo      string    `json:"tipo"`
	Capacidad int       `json:"capacidad"`
}

type Animal struct {
	ID                string    `json:"id"`
	Arete             string    `json:"arete"`
	Raza              string    `json:"raza"`
	Sexo              string    `json:"sexo"`
	FechaNacimiento   string    `json:"fecha_nacimiento"`
	Estatus           string    `json:"estatus"`
	EstadoRepro       string    `json:"estado_reproductivo"`
	CorralID          string    `json:"corral_id"`
	ConteoFetos       int       `json:"conteo_fetos"`
	CondicionCorporal float64   `json:"condicion_corporal"`
	PesoNacer         float64   `json:"peso_nacer"`
	PesoDestete       float64   `json:"peso_destete"`
	PadreID           string    `json:"padre_id"`
	MadreID           string    `json:"madre_id"`
	Destino           string    `json:"destino"` // 'Cria', 'Engorda'
	FechaDefuncion    string    `json:"fecha_defuncion"`
	MotivoDefuncion   string    `json:"motivo_defuncion"`
}

type SeguimientoPeso struct {
	ID        string  `json:"id"`
	AnimalID  string  `json:"animal_id"`
	Fecha     string  `json:"fecha"`
	Peso      float64 `json:"peso"`
	Notas     string  `json:"notas"`
}

type EventoReproductivo struct {
	ID                 string    `json:"id"`
	AnimalID           string    `json:"animal_id"`
	Tipo               string    `json:"tipo"` // 'Monta Natural', 'Inseminación Artificial', 'Ultrasonido'
	FechaEvento        string    `json:"fecha_evento"`
	FechaFinMonta      string    `json:"fecha_fin_monta,omitempty"`
	IDMacho            string    `json:"id_macho"`
	LoteSemen          string    `json:"lote_semen,omitempty"`
	Tecnico            string    `json:"tecnico,omitempty"`
	Protocolo          string    `json:"protocolo,omitempty"`
	FechaProbableParto string    `json:"fecha_probable_parto"`
	ConteoFetos        int       `json:"conteo_fetos"`
	Resultado          string    `json:"resultado"`
	Notas              string    `json:"notas"`
}

type Insumo struct {
	ID               string    `json:"id"`
	Nombre           string    `json:"nombre"`
	Tipo             string    `json:"tipo"` // 'Medicina', 'Vacuna', 'Alimento', 'Herramienta'
	Unidad           string    `json:"unidad"` // 'ml', 'g', 'dose', 'kg'
	StockActual      float64   `json:"stock_actual"`
	StockMinimo      float64   `json:"stock_minimo"`
	CostoUnitario    float64   `json:"costo_unitario"`
	DiasRetiro       int       `json:"dias_retiro"` // Withdrawal period in days
	Lote             string    `json:"lote"`
	FechaVencimiento string    `json:"fecha_vencimiento"`
	Proveedor        string    `json:"proveedor"`
}

type MovimientoInsumo struct {
	ID        string    `json:"id"`
	InsumoID  string    `json:"insumo_id"`
	Tipo      string    `json:"tipo"` // 'Entrada', 'Salida'
	Cantidad  float64   `json:"cantidad"`
	Fecha     string    `json:"fecha"`
	Motivo    string    `json:"motivo"`
	AnimalID  string    `json:"animal_id,omitempty"`
}

type Tratamiento struct {
	ID               string    `json:"id"`
	AnimalID         string    `json:"animal_id"`
	InsumoID         string    `json:"insumo_id"`
	Dosis            float64   `json:"dosis"`
	ViaAdministracion string   `json:"via_administracion"`
	DuracionDias     int       `json:"duracion_dias"`
	Fecha            string    `json:"fecha"`
	FechaFinRetiro   string    `json:"fecha_fin_retiro"`
	Tecnico          string    `json:"tecnico"`
	Observaciones    string    `json:"observaciones"`
}

type Tarea struct {
	ID           string    `json:"id"`
	AsignadoA    string    `json:"asignado_a"` // UserID
	CreadoPor    string    `json:"creado_por"` // UserID
	Titulo       string    `json:"titulo"`
	Descripcion  string    `json:"descripcion"`
	Estatus      string    `json:"estatus"` // 'Pendiente', 'Completada', 'Cancelada'
	FechaVenc    string    `json:"fecha_vencimiento"`
	AnimalID     string    `json:"animal_id,omitempty"`
	InsumoID     string    `json:"insumo_id,omitempty"`
	Prioridad    string    `json:"prioridad"` // 'Baja', 'Media', 'Alta'
}

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Password  string    `json:"password,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type DiagnosticoGestacion struct {
	ID                string    `json:"id"`
	AnimalID          string    `json:"animal_id"`
	Fecha             string    `json:"fecha"`
	CondicionCorporal float64   `json:"condicion_corporal"`
	Resultado         int       `json:"resultado"` // 0: No gestante, 1: Gestante
	ConteoFetos       int       `json:"conteo_fetos"`
	Observaciones     string    `json:"observaciones"`
}

type Parto struct {
	ID            string    `json:"id"`
	AnimalID      string    `json:"animal_id"` // Madre
	Fecha         string    `json:"fecha"`
	CantidadCrias int       `json:"cantidad_crias"`
	TipoParto     string    `json:"tipo_parto"` // Simple, Doble, Triple
	Observaciones string    `json:"observaciones"`
}

type RecetaVeterinaria struct {
	ID            string    `json:"id"`
	AnimalID      string    `json:"animal_id"`
	MVZ           string    `json:"mvz"`
	Productor     string    `json:"productor"`
	Fecha         string    `json:"fecha"`
	Peso          float64   `json:"peso"`
	Diagnostico   string    `json:"diagnostico"`
	Tratamiento   string    `json:"tratamiento"`
}
