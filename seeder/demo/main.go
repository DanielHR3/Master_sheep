// Siembra un hato demo con marca neutra para las capturas de la landing.
//
// Existe porque las imágenes y videos de la landing se habían tomado de la
// cuenta de un cliente real, con su logo y su nombre a la vista. Este hato no
// pertenece a nadie: sirve para volver a capturar la landing cuantas veces
// haga falta sin exponer a ningún rancho.
//
// Uso:
//
//	go run ./seeder/demo -db /ruta/a/sheepmaster.db
//
// La base debe existir y traer las migraciones aplicadas (basta con haber
// arrancado el servidor una vez apuntando a ella). El seeder borra y rehace
// solamente los datos del usuario demo; no toca ningún otro rancho.
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

const (
	demoEmail    = "demo@sheepmaster.com"
	demoPassword = "demo-landing-2026"
	demoNombre   = "Demo SheepMaster"

	// Deben coincidir con las metas del semáforo (semaforo.go) para que los
	// colores de las capturas signifiquen lo mismo que en la app real.
	metaPesoVenta = 42.0
	metaEdadVenta = 120
)

// hoy queda fijo para que el hato sea reproducible: mismas edades y mismos
// colores de semáforo cada vez que se siembra.
var hoy = time.Date(2026, 9, 15, 0, 0, 0, 0, time.UTC)

type corral struct {
	id, nombre, tipo string
	capacidad        int
}

type animal struct {
	id, arete, raza, sexo string
	nacimiento            time.Time
	corralID              string
	destino               string
	estadoRepro           string
	// Parentesco por ARETE, no por id: la captura en la app pide "Arete Padre"
	// y BuildPedigree resuelve por id o por arete. Guardar el uuid aquí hace
	// que la tarjeta del animal muestre el uuid crudo en el renglón LINAJE.
	padreID, madreID     string
	abueloPat, abuelaPat string
	abueloMat, abuelaMat string
	esReferencia         bool
	pesoNacer            float64
	// pesoObjetivo es el peso del último pesaje; el historial se construye
	// hacia atrás desde ahí con la GDP indicada.
	pesoObjetivo float64
	gdp          float64
}

func main() {
	dbPath := flag.String("db", "", "ruta al archivo sheepmaster.db (requerido)")
	flag.Parse()
	if *dbPath == "" {
		log.Fatal("falta -db: ruta al archivo sheepmaster.db")
	}

	db, err := sql.Open("sqlite", *dbPath)
	if err != nil {
		log.Fatalf("abriendo la base: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("la base no responde: %v", err)
	}

	userID, err := ensureDemoUser(db)
	if err != nil {
		log.Fatalf("creando el usuario demo: %v", err)
	}
	fmt.Printf("Usuario demo: %s (rancho %s)\n", demoEmail, userID)

	if err := limpiar(db, userID); err != nil {
		log.Fatalf("limpiando el hato anterior: %v", err)
	}

	corrales := construirCorrales(userID)
	if err := insertarCorrales(db, userID, corrales); err != nil {
		log.Fatalf("insertando corrales: %v", err)
	}
	fmt.Printf("Corrales: %d\n", len(corrales))

	animales := construirHato(corrales)
	if err := insertarAnimales(db, userID, animales); err != nil {
		log.Fatalf("insertando animales: %v", err)
	}

	pesajes, err := insertarPesajes(db, userID, animales)
	if err != nil {
		log.Fatalf("insertando pesajes: %v", err)
	}

	if err := insertarTareas(db, userID); err != nil {
		log.Fatalf("insertando tareas: %v", err)
	}

	salud, err := insertarSalud(db, userID, animales)
	if err != nil {
		log.Fatalf("insertando salud: %v", err)
	}
	repro, err := insertarReproduccion(db, userID, animales)
	if err != nil {
		log.Fatalf("insertando reproducción: %v", err)
	}
	movs, err := insertarMovimientos(db, userID, animales, corrales)
	if err != nil {
		log.Fatalf("insertando movimientos: %v", err)
	}

	resumen(animales)
	fmt.Printf("Pesajes: %d\n", pesajes)
	fmt.Printf("Salud: %d insumos, %d recetas con su tratamiento\n", salud.insumos, salud.recetas)
	fmt.Printf("Reproducción: %d montas, %d diagnósticos (%d positivos), %d partos\n", repro.montas, repro.diagnosticos, repro.positivos, repro.partos)
	fmt.Printf("Movimientos de corral: %d\n", movs)
	fmt.Println("Listo. Entra con", demoEmail, "/", demoPassword)
}

func ensureDemoUser(db *sql.DB) (string, error) {
	var id string
	err := db.QueryRow("SELECT id FROM users WHERE email = ?", demoEmail).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return "", err
	}

	id = uuid.New().String()
	hash, err := bcrypt.GenerateFromPassword([]byte(demoPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	// rancho_id = id propio: el tenant del demo es él mismo, igual que las
	// cuentas semilla del servidor.
	_, err = db.Exec(
		"INSERT INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?)",
		id, demoEmail, string(hash), demoNombre, "Admin", id,
	)
	return id, err
}

// limpiar borra solo lo que pertenece al tenant demo, para poder re-sembrar
// sin duplicar y sin rozar los datos de ningún otro rancho.
func limpiar(db *sql.DB, userID string) error {
	// Solo se borran FILAS del usuario demo (WHERE user_id = ?); las tablas y los
	// datos de cualquier otro rancho quedan intactos.
	for _, tabla := range []string{
		"recetas_veterinarias", "tratamientos", "movimientos_insumo", "insumos",
		"diagnostico_gestacion", "partos", "eventos_reproductivos", "movimientos",
		"seguimientos_peso", "tareas", "animales", "corrales",
	} {
		if _, err := db.Exec("DELETE FROM "+tabla+" WHERE user_id = ?", userID); err != nil {
			return fmt.Errorf("%s: %w", tabla, err)
		}
	}
	return nil
}

func construirCorrales(userID string) []corral {
	return []corral{
		{uuid.New().String(), "Engorda Norte", "Engorda", 30},
		{uuid.New().String(), "Engorda Sur", "Engorda", 30},
		{uuid.New().String(), "Hembras Gestantes", "Maternidad", 20},
		{uuid.New().String(), "Destete", "Destete", 25},
		{uuid.New().String(), "Sementales", "Mantenimiento", 10},
	}
}

func insertarCorrales(db *sql.DB, userID string, cs []corral) error {
	for _, c := range cs {
		_, err := db.Exec(
			"INSERT INTO corrales (id, user_id, nombre, tipo, capacidad) VALUES (?, ?, ?, ?, ?)",
			c.id, userID, c.nombre, c.tipo, c.capacidad,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// construirHato arma 60 animales: 45 de engorda repartidos entre los tres
// colores del semáforo, 12 vientres y 3 sementales. SM-100 lleva pedigrí
// completo de tres generaciones para la captura de la ficha genealógica.
func construirHato(cs []corral) []animal {
	rnd := rand.New(rand.NewSource(20260915)) // semilla fija: hato reproducible

	norte, sur := cs[0].id, cs[1].id
	gestantes, destete, sementales := cs[2].id, cs[3].id, cs[4].id

	razas := []string{"Dorper", "Katahdin", "Pelibuey"}
	var out []animal

	// --- Referencias de pedigrí: no cuentan en el inventario ---
	// Dos escalones (abuelos y bisabuelos) para que la ficha genealógica se
	// vea llena hasta la tercera columna, que es lo que se está vendiendo.
	referencia := func(arete, padre, madre string) animal {
		sexo := "Macho"
		if arete[0] == 'M' {
			sexo = "Hembra"
		}
		return animal{
			id: uuid.New().String(), arete: arete, raza: "Dorper", sexo: sexo,
			nacimiento: hoy.AddDate(-5, 0, 0), destino: "Pie de Cría",
			esReferencia: true, pesoNacer: 4.2,
			padreID: padre, madreID: madre,
		}
	}
	// Bisabuelos (sin padres capturados: cierran el árbol).
	for _, arete := range []string{"SEM-81", "MAD-81", "SEM-82", "MAD-82", "SEM-83", "MAD-83", "SEM-84", "MAD-84"} {
		out = append(out, referencia(arete, "", ""))
	}
	// Abuelos, cada uno colgando de su pareja de bisabuelos.
	out = append(out,
		referencia("SEM-91", "SEM-81", "MAD-81"),
		referencia("MAD-91", "SEM-82", "MAD-82"),
		referencia("SEM-92", "SEM-83", "MAD-83"),
		referencia("MAD-92", "SEM-84", "MAD-84"),
	)

	// --- Sementales activos ---
	for i, arete := range []string{"SEM-01", "SEM-02", "SEM-03"} {
		out = append(out, animal{
			id: uuid.New().String(), arete: arete, raza: razas[i%len(razas)], sexo: "Macho",
			nacimiento: hoy.AddDate(-3, 0, 0), corralID: sementales,
			destino: "Pie de Cría", estadoRepro: "Activo",
			// Padres reales (las referencias de pedigrí), para que el árbol de
			// SM-100 salga completo y sin nodos vacíos.
			padreID: "SEM-91", madreID: "MAD-91",
			pesoNacer: 4.5, pesoObjetivo: 92, gdp: 0,
		})
	}

	// --- Vientres MAD-01..MAD-12 ---
	for i := 1; i <= 12; i++ {
		arete := fmt.Sprintf("MAD-%02d", i)
		repro := "Gestante"
		if i%4 == 0 {
			repro = "Vacía"
		}
		out = append(out, animal{
			id: uuid.New().String(), arete: arete, raza: razas[i%len(razas)], sexo: "Hembra",
			nacimiento: hoy.AddDate(0, -(25 + i), 0), corralID: gestantes,
			destino: "Pie de Cría", estadoRepro: repro,
			// Alternando abuelos para que el inventario no se vea clonado.
			// MAD-01 (i = 1) cuelga de SEM-92/MAD-92, que es el árbol que
			// muestra la ficha genealógica de SM-100.
			padreID:   fmt.Sprintf("SEM-9%d", (i%2)+1),
			madreID:   fmt.Sprintf("MAD-9%d", (i%2)+1),
			pesoNacer: 3.9, pesoObjetivo: 58, gdp: 0,
		})
	}

	// --- SM-100: el animal con pedigrí para la ficha genealógica ---
	out = append(out, animal{
		id: uuid.New().String(), arete: "SM-100", raza: "Dorper", sexo: "Macho",
		nacimiento: hoy.AddDate(0, 0, -168), corralID: norte, destino: "Engorda",
		padreID: "SEM-01", madreID: "MAD-01",
		abueloPat: "SEM-91", abuelaPat: "MAD-91",
		abueloMat: "SEM-92", abuelaMat: "MAD-92",
		pesoNacer: 4.1, pesoObjetivo: 52.4, gdp: 0.290,
	})

	// --- Engorda SM-101..SM-144, repartidos por color de semáforo ---
	// El color lo decide el peso y la edad frente a la meta (42 kg / 120 días):
	// rojo desde 43 kg y 121 días, amarillo si llega en menos de 30 días.
	type perfil struct {
		dias      int     // edad
		peso      float64 // último pesaje
		gdp       float64
		corral    string
		repeticio int // cuántos animales con este perfil
	}
	perfiles := []perfil{
		// Rojos: ya pasaron la meta en peso y edad.
		{190, 58.9, 0.305, sur, 4},
		{175, 54.8, 0.310, norte, 4},
		{158, 51.8, 0.320, sur, 3},
		{131, 44.3, 0.330, norte, 3},
		// Amarillos: les falta poco para la meta.
		{112, 38.6, 0.340, norte, 4},
		{104, 35.8, 0.345, sur, 3},
		{97, 33.9, 0.350, destete, 3},
		// Verdes: todavía lejos, creciendo bien.
		{74, 26.4, 0.330, destete, 5},
		{61, 21.7, 0.320, destete, 5},
		{48, 17.7, 0.310, destete, 5},
		{35, 13.2, 0.300, destete, 5},
	}

	n := 101
	for _, p := range perfiles {
		for r := 0; r < p.repeticio; r++ {
			// Pequeña variación para que el hato no se vea clonado.
			jitter := (rnd.Float64() - 0.5) * 2.0
			out = append(out, animal{
				id: uuid.New().String(), arete: fmt.Sprintf("SM-%d", n),
				raza: razas[n%len(razas)], sexo: map[bool]string{true: "Macho", false: "Hembra"}[n%2 == 0],
				nacimiento: hoy.AddDate(0, 0, -p.dias), corralID: p.corral,
				destino:   "Engorda",
				padreID:   fmt.Sprintf("SEM-%02d", (n%3)+1),
				madreID:   fmt.Sprintf("MAD-%02d", (n%12)+1),
				pesoNacer: 3.8 + rnd.Float64()*0.6,
				// El peso no baja de 5 kg aunque el jitter sea negativo.
				pesoObjetivo: maxFloat(p.peso+jitter, 5),
				gdp:          p.gdp,
			})
			n++
		}
	}

	return out
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func insertarAnimales(db *sql.DB, userID string, as []animal) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO animales
		(id, user_id, arete, raza, sexo, fecha_nacimiento, estatus, estado_reproductivo,
		 corral_id, peso_nacer, padre_id, madre_id,
		 abuelo_paterno_id, abuela_paterna_id, abuelo_materno_id, abuela_materna_id,
		 tipo_parto, metodo_concepcion, destino, es_referencia, especie, created_at)
		VALUES (?, ?, ?, ?, ?, ?, 'Activo', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Simple', 'Monta Natural', ?, ?, 'Ovino', ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, a := range as {
		ref := 0
		if a.esReferencia {
			ref = 1
		}
		corralID := any(nil)
		if a.corralID != "" {
			corralID = a.corralID
		}
		_, err := stmt.Exec(
			a.id, userID, a.arete, a.raza, a.sexo, a.nacimiento.Format("2006-01-02"),
			a.estadoRepro, corralID, a.pesoNacer,
			nullIfEmpty(a.padreID), nullIfEmpty(a.madreID),
			nullIfEmpty(a.abueloPat), nullIfEmpty(a.abuelaPat),
			nullIfEmpty(a.abueloMat), nullIfEmpty(a.abuelaMat),
			a.destino, ref, hoy.Format("2006-01-02 15:04:05"),
		)
		if err != nil {
			return fmt.Errorf("%s: %w", a.arete, err)
		}
	}
	return tx.Commit()
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// insertarPesajes construye el historial hacia atrás desde el peso objetivo,
// un pesaje cada 21 días durante los últimos ~90, que es la ventana que el
// semáforo usa para calcular la ganancia diaria de peso.
func insertarPesajes(db *sql.DB, userID string, as []animal) (int, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO seguimientos_peso
		(id, user_id, animal_id, fecha, peso, notas, created_at) VALUES (?, ?, ?, ?, ?, '', ?)`)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	total := 0
	for _, a := range as {
		if a.esReferencia || a.pesoObjetivo <= 0 {
			continue
		}
		// Sementales y vientres adultos: un solo pesaje de control.
		pasos := 5
		if a.gdp == 0 {
			pasos = 1
		}
		for i := 0; i < pasos; i++ {
			diasAtras := i * 21
			fecha := hoy.AddDate(0, 0, -diasAtras)
			// No registrar pesajes anteriores al nacimiento.
			if fecha.Before(a.nacimiento) {
				break
			}
			peso := a.pesoObjetivo - a.gdp*float64(diasAtras)
			if peso < a.pesoNacer {
				break
			}
			id := uuid.New().String()
			if _, err := stmt.Exec(id, userID, a.id, fecha.Format("2006-01-02"),
				roundKg(peso), fecha.Format("2006-01-02 15:04:05")); err != nil {
				return 0, fmt.Errorf("pesaje %s: %w", a.arete, err)
			}
			total++
		}
	}
	return total, tx.Commit()
}

func roundKg(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

func insertarTareas(db *sql.DB, userID string) error {
	tareas := []struct {
		titulo, prioridad string
		enDias            int
	}{
		{"Vacunar lote Engorda Norte", "Alta", 1},
		{"Pesar corderos de Destete", "Media", 2},
		{"Revisar cerca del corral sur", "Baja", 4},
		{"Pedir alimento (quedan 8 bultos)", "Alta", 1},
		{"REVISIÓN: Segundo Ultrasonido MAD-03", "Media", 5},
		{"REVISIÓN: Segundo Ultrasonido MAD-07", "Media", 6},
		{"REVISIÓN: Segundo Ultrasonido MAD-11", "Media", 8},
	}
	for _, t := range tareas {
		_, err := db.Exec(`INSERT INTO tareas
			(id, user_id, titulo, descripcion, estatus, fecha_vencimiento, prioridad, created_at)
			VALUES (?, ?, ?, '', 'Pendiente', ?, ?, ?)`,
			uuid.New().String(), userID, t.titulo,
			hoy.AddDate(0, 0, t.enDias).Format("2006-01-02"),
			t.prioridad, hoy.Format("2006-01-02 15:04:05"),
		)
		if err != nil {
			return fmt.Errorf("%s: %w", t.titulo, err)
		}
	}
	return nil
}

// resumen imprime cómo quedó repartido el hato, para poder comprobar de un
// vistazo que el semáforo va a tener los tres colores en la captura.
func resumen(as []animal) {
	var engorda, cria, refs, rojos, amarillos, verdes int
	for _, a := range as {
		if a.esReferencia {
			refs++
			continue
		}
		if a.destino == "Engorda" {
			engorda++
			edad := int(hoy.Sub(a.nacimiento).Hours() / 24)
			switch {
			case a.pesoObjetivo >= metaPesoVenta+1 && edad >= metaEdadVenta+1:
				rojos++
			case a.gdp > 0 && (metaPesoVenta-a.pesoObjetivo)/a.gdp <= 30:
				amarillos++
			default:
				verdes++
			}
		} else {
			cria++
		}
	}
	fmt.Printf("Hato: %d animales (%d engorda, %d pie de cría) + %d referencias de pedigrí\n",
		engorda+cria, engorda, cria, refs)
	fmt.Printf("Semáforo esperado en engorda: %d rojos, %d amarillos, %d verdes\n", rojos, amarillos, verdes)
}

// ------------------------------------------------------------------ salud

type resumenSalud struct{ insumos, recetas int }

// insertarSalud siembra el botiquín, las recetas y los tratamientos.
//
// Las recetas son las que alimentan la gráfica "Incidencia de Enfermedades por
// Temporada": GetStats lee recetas_veterinarias.diagnostico y la fecha. Cada
// receta lleva su tratamiento (historial clínico del animal) y una salida del
// botiquín, para que el stock cuadre con lo aplicado.
func insertarSalud(db *sql.DB, userID string, as []animal) (resumenSalud, error) {
	rnd := rand.New(rand.NewSource(20260916))
	var r resumenSalud

	type insumo struct {
		id, nombre, tipo, unidad string
		stock, minimo, costo     float64
		retiro                   int
	}
	botiquin := []insumo{
		{uuid.New().String(), "Ivermectina 1%", "Antiparasitario", "ml", 480, 100, 3.5, 28},
		{uuid.New().String(), "Oxitetraciclina LA", "Antibiótico", "ml", 350, 100, 4.2, 21},
		{uuid.New().String(), "Albendazol 10%", "Antiparasitario", "ml", 900, 200, 1.8, 14},
		{uuid.New().String(), "Vitamina ADE", "Vitamínico", "ml", 250, 60, 2.9, 0},
		{uuid.New().String(), "Penicilina G", "Antibiótico", "ml", 200, 50, 5.1, 30},
		{uuid.New().String(), "Selenio + Vitamina E", "Mineral", "ml", 180, 50, 3.3, 0},
	}

	// Cuadro clínico → medicamento y temporada en que pega más fuerte
	// (meses 1-12; el peso decide cuántos casos caen en cada mes).
	type cuadro struct {
		diagnostico string
		insumo      int
		via         string
		casos       int
		pesoMes     [12]int
	}
	cuadros := []cuadro{
		{"Neumonía", 1, "Intramuscular", 12, [12]int{5, 5, 3, 1, 0, 0, 0, 0, 1, 2, 4, 5}},
		{"Parasitosis gastrointestinal", 0, "Subcutánea", 14, [12]int{1, 1, 1, 2, 3, 5, 6, 6, 5, 3, 1, 1}},
		{"Diarrea neonatal", 1, "Oral", 8, [12]int{2, 2, 5, 5, 4, 2, 1, 1, 1, 1, 1, 2}},
		{"Pododermatitis (cojera)", 4, "Intramuscular", 7, [12]int{1, 1, 1, 1, 2, 3, 4, 5, 5, 4, 2, 1}},
		{"Deficiencia de selenio", 5, "Intramuscular", 4, [12]int{2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2}},
	}

	// Candidatos: animales vivos del inventario (sin referencias de pedigrí).
	var vivos []animal
	for _, a := range as {
		if !a.esReferencia {
			vivos = append(vivos, a)
		}
	}

	tx, err := db.Begin()
	if err != nil {
		return r, err
	}
	defer tx.Rollback()

	consumo := make([]float64, len(botiquin))
	inicio := hoy.AddDate(-1, 0, 0)
	for _, c := range cuadros {
		for i := 0; i < c.casos; i++ {
			// Mes elegido por peso; día al azar dentro del mes; siempre en el último año.
			mes := elegirPorPeso(rnd, c.pesoMes[:])
			fecha := time.Date(hoy.Year(), time.Month(mes+1), 1+rnd.Intn(27), 0, 0, 0, 0, time.UTC)
			if fecha.After(hoy) {
				fecha = fecha.AddDate(-1, 0, 0)
			}
			if fecha.Before(inicio) {
				fecha = fecha.AddDate(1, 0, 0)
			}
			an := vivos[rnd.Intn(len(vivos))]
			ins := botiquin[c.insumo]
			peso := an.pesoObjetivo
			if peso <= 0 {
				peso = 45
			}
			dosis := roundKg(peso / 10) // 1 ml por cada 10 kg, redondeado a décimas
			if dosis < 0.5 {
				dosis = 0.5
			}
			consumo[c.insumo] += dosis

			if _, err := tx.Exec(`INSERT INTO recetas_veterinarias
				(id, user_id, animal_id, mvz, productor, fecha, peso, diagnostico, tratamiento, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				uuid.New().String(), userID, an.id, "MVZ Laura Ortega", demoNombre,
				fecha.Format("2006-01-02"), peso, c.diagnostico,
				fmt.Sprintf("%s %.1f ml %s", ins.nombre, dosis, c.via),
				fecha.Format("2006-01-02 15:04:05")); err != nil {
				return r, fmt.Errorf("receta: %w", err)
			}
			finRetiro := fecha.AddDate(0, 0, ins.retiro)
			if _, err := tx.Exec(`INSERT INTO tratamientos
				(id, user_id, animal_id, insumo_id, dosis, via_administracion, fecha, fecha_fin_retiro, tecnico, observaciones, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				uuid.New().String(), userID, an.id, ins.id, dosis, c.via,
				fecha.Format("2006-01-02"), finRetiro.Format("2006-01-02"), "MVZ Laura Ortega", c.diagnostico,
				fecha.Format("2006-01-02 15:04:05")); err != nil {
				return r, fmt.Errorf("tratamiento: %w", err)
			}
			if _, err := tx.Exec(`INSERT INTO movimientos_insumo
				(id, user_id, insumo_id, tipo, cantidad, fecha, motivo, animal_id, created_at)
				VALUES (?, ?, ?, 'Salida', ?, ?, ?, ?, ?)`,
				uuid.New().String(), userID, ins.id, dosis, fecha.Format("2006-01-02"),
				"Tratamiento: "+c.diagnostico, an.id, fecha.Format("2006-01-02 15:04:05")); err != nil {
				return r, fmt.Errorf("salida de insumo: %w", err)
			}
			r.recetas++
		}
	}

	// El botiquín entra al final para que stock_actual ya descuente lo aplicado:
	// la compra inicial fue stock actual + todo lo consumido.
	compra := inicio.AddDate(0, 0, -15)
	for i, ins := range botiquin {
		if _, err := tx.Exec(`INSERT INTO insumos
			(id, user_id, nombre, tipo, unidad, stock_actual, stock_minimo, costo_unitario, dias_retiro, lote, fecha_vencimiento, proveedor, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			ins.id, userID, ins.nombre, ins.tipo, ins.unidad, ins.stock, ins.minimo, ins.costo, ins.retiro,
			fmt.Sprintf("L-%d%02d", hoy.Year()%100, i+1), hoy.AddDate(1, 6, 0).Format("2006-01-02"),
			"Veterinaria del Bajío", compra.Format("2006-01-02 15:04:05")); err != nil {
			return r, fmt.Errorf("insumo %s: %w", ins.nombre, err)
		}
		if _, err := tx.Exec(`INSERT INTO movimientos_insumo
			(id, user_id, insumo_id, tipo, cantidad, fecha, motivo, animal_id, created_at)
			VALUES (?, ?, ?, 'Entrada', ?, ?, 'Compra inicial', NULL, ?)`,
			uuid.New().String(), userID, ins.id, roundKg(ins.stock+consumo[i]),
			compra.Format("2006-01-02"), compra.Format("2006-01-02 15:04:05")); err != nil {
			return r, fmt.Errorf("entrada de insumo: %w", err)
		}
		r.insumos++
	}
	return r, tx.Commit()
}

// elegirPorPeso devuelve un índice al azar, más probable cuanto mayor su peso.
func elegirPorPeso(rnd *rand.Rand, pesos []int) int {
	total := 0
	for _, p := range pesos {
		total += p
	}
	if total == 0 {
		return rnd.Intn(len(pesos))
	}
	n := rnd.Intn(total)
	for i, p := range pesos {
		n -= p
		if n < 0 {
			return i
		}
	}
	return len(pesos) - 1
}

// ------------------------------------------------------------ reproducción

type resumenRepro struct{ montas, diagnosticos, positivos, partos int }

// insertarReproduccion siembra el ciclo de las vientres: una monta por cada
// una, su ultrasonido a los 35 días (positivo si la sembramos "Gestante",
// negativo si "Vacía") y los partos del ciclo anterior. Con 9 gestantes de 12 y
// 8 partos, el dashboard marca ~75 % de gestación y ~89 % de parición.
func insertarReproduccion(db *sql.DB, userID string, as []animal) (resumenRepro, error) {
	rnd := rand.New(rand.NewSource(20260917))
	var r resumenRepro

	var madres, sementales []animal
	for _, a := range as {
		if a.esReferencia {
			continue
		}
		switch {
		case a.destino == "Pie de Cría" && a.sexo == "Hembra":
			madres = append(madres, a)
		case a.destino == "Pie de Cría" && a.sexo == "Macho":
			sementales = append(sementales, a)
		}
	}
	if len(sementales) == 0 {
		return r, fmt.Errorf("no hay sementales para las montas")
	}

	tx, err := db.Begin()
	if err != nil {
		return r, err
	}
	defer tx.Rollback()

	for i, m := range madres {
		sem := sementales[i%len(sementales)]
		gestante := m.estadoRepro == "Gestante"
		monta := hoy.AddDate(0, 0, -(120 + i*7))
		fetos := 0
		resultado := "Vacía"
		if gestante {
			fetos = 1 + rnd.Intn(2)
			resultado = "Gestante"
		}
		if _, err := tx.Exec(`INSERT INTO eventos_reproductivos
			(id, user_id, animal_id, tipo, fecha_evento, fecha_fin_monta, id_macho, lote_semen, tecnico, protocolo,
			 fecha_probable_parto, resultado, conteo_fetos, notas, created_at)
			VALUES (?, ?, ?, 'Monta Natural', ?, ?, ?, '', ?, 'Monta dirigida', ?, ?, ?, ?, ?)`,
			uuid.New().String(), userID, m.id, monta.Format("2006-01-02"), monta.AddDate(0, 0, 3).Format("2006-01-02"),
			sem.arete, "Encargado de corral", monta.AddDate(0, 0, 150).Format("2006-01-02"), resultado, fetos,
			"Semental "+sem.arete, monta.Format("2006-01-02 15:04:05")); err != nil {
			return r, fmt.Errorf("monta %s: %w", m.arete, err)
		}
		r.montas++

		ultra := monta.AddDate(0, 0, 35)
		res := 0
		if gestante {
			res = 1
			r.positivos++
		}
		if _, err := tx.Exec(`INSERT INTO diagnostico_gestacion
			(id, user_id, animal_id, fecha, condicion_corporal, resultado, conteo_fetos, observaciones, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			uuid.New().String(), userID, m.id, ultra.Format("2006-01-02"), roundKg(2.8+rnd.Float64()*0.8),
			res, fetos, "Ultrasonido a los 35 días", ultra.Format("2006-01-02 15:04:05")); err != nil {
			return r, fmt.Errorf("diagnóstico %s: %w", m.arete, err)
		}
		r.diagnosticos++
	}

	// Partos del ciclo anterior: 8 de las gestantes parieron entre 7 y 11 meses
	// atrás. Se cuentan por animal distinto, así que un parto por madre.
	tipos := []string{"Normal", "Normal", "Normal", "Asistido"}
	n := 0
	for i, m := range madres {
		if m.estadoRepro != "Gestante" || n >= 8 {
			continue
		}
		fecha := hoy.AddDate(0, 0, -(200 + i*15))
		crias := 1 + rnd.Intn(2)
		if _, err := tx.Exec(`INSERT INTO partos
			(id, user_id, animal_id, fecha, cantidad_crias, tipo_parto, observaciones, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			uuid.New().String(), userID, m.id, fecha.Format("2006-01-02"), crias, tipos[rnd.Intn(len(tipos))],
			fmt.Sprintf("%d cría(s), sin complicaciones", crias), fecha.Format("2006-01-02 15:04:05")); err != nil {
			return r, fmt.Errorf("parto %s: %w", m.arete, err)
		}
		r.partos++
		n++
	}
	return r, tx.Commit()
}

// ------------------------------------------------------------- movimientos

// insertarMovimientos registra cambios de corral recientes de la engorda
// (salidas de destete hacia los corrales de engorda), para que el Kardex de
// esos animales tenga historial. Guarda ids de corral, igual que MoverAnimal.
func insertarMovimientos(db *sql.DB, userID string, as []animal, cs []corral) (int, error) {
	rnd := rand.New(rand.NewSource(20260918))
	porNombre := map[string]string{}
	for _, c := range cs {
		porNombre[c.nombre] = c.id
	}
	destete, norte, sur := porNombre["Destete"], porNombre["Engorda Norte"], porNombre["Engorda Sur"]

	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	n := 0
	for _, a := range as {
		// Los que hoy están en Norte o Sur llegaron desde Destete hace poco.
		if a.esReferencia || a.destino != "Engorda" || (a.corralID != norte && a.corralID != sur) {
			continue
		}
		if n >= 12 {
			break
		}
		fecha := hoy.AddDate(0, 0, -(10 + rnd.Intn(80)))
		if _, err := tx.Exec(`INSERT INTO movimientos
			(id, user_id, animal_id, corral_previo, corral_nuevo, fecha_movimiento, motivo)
			VALUES (?, ?, ?, ?, ?, ?, 'Salida de destete a engorda')`,
			uuid.New().String(), userID, a.id, destete, a.corralID, fecha.Format("2006-01-02")); err != nil {
			return n, fmt.Errorf("movimiento %s: %w", a.arete, err)
		}
		n++
	}
	return n, tx.Commit()
}
