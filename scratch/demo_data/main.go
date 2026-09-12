// Llena un SheepMaster local con un hato de demostración realista vía la
// API HTTP. Uso:
//
//	HOME=$(mktemp -d) PORT=8080 SEED_ADMIN_PASSWORD=demo123 /tmp/lp_server &
//	go run ./scratch/demo_data http://localhost:8080 admin@donpablito.com demo123
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"
)

var (
	base  string
	token string
	rnd   = rand.New(rand.NewSource(42)) // determinista: mismas capturas cada vez
)

func call(method, path string, body interface{}) {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req, _ := http.NewRequest(method, base+path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("ERROR", method, path, err)
		os.Exit(1)
	}
	res.Body.Close()
	if res.StatusCode >= 300 {
		fmt.Println("ERROR", method, path, res.Status)
		os.Exit(1)
	}
}

func date(daysAgo int) string { return time.Now().AddDate(0, 0, -daysAgo).Format("2006-01-02") }

func main() {
	if len(os.Args) != 4 {
		fmt.Println("uso: demo_data <base-url> <email> <password>")
		os.Exit(2)
	}
	base = os.Args[1]
	var buf bytes.Buffer
	json.NewEncoder(&buf).Encode(map[string]string{"email": os.Args[2], "password": os.Args[3]})
	res, err := http.Post(base+"/api/login", "application/json", &buf)
	if err != nil {
		fmt.Println("login:", err)
		os.Exit(1)
	}
	var login struct {
		Token string `json:"token"`
	}
	json.NewDecoder(res.Body).Decode(&login)
	token = login.Token
	if token == "" {
		fmt.Println("login falló")
		os.Exit(1)
	}

	corrales := []string{"Engorda Norte", "Engorda Sur", "Hembras Gestantes", "Maternidad", "Destete", "Sementales"}
	for i, c := range corrales {
		call("POST", "/api/corrales", map[string]interface{}{"id": fmt.Sprintf("demo-c%d", i), "nombre": c, "tipo": "Corral", "capacidad": 20})
	}
	insumos := []map[string]interface{}{
		{"id": "demo-i1", "nombre": "Ivermectina 1%", "tipo": "Medicina", "unidad": "ml", "stock_actual": 250, "stock_minimo": 50, "costo_unitario": 4.5, "dias_retiro": 28},
		{"id": "demo-i2", "nombre": "Vacuna Clostridial", "tipo": "Vacuna", "unidad": "dosis", "stock_actual": 120, "stock_minimo": 30, "costo_unitario": 12, "dias_retiro": 21},
		{"id": "demo-i3", "nombre": "Vitamina ADE", "tipo": "Medicina", "unidad": "ml", "stock_actual": 80, "stock_minimo": 20, "costo_unitario": 6, "dias_retiro": 0},
	}
	for _, i := range insumos {
		call("POST", "/api/insumos", i)
	}

	razas := []string{"Dorper", "Katahdin", "Pelibuey"}
	// Ancestros de referencia (certificado UNO del semental SEM-01): abuelos, bisabuelos y tatarabuelos
	ref := func(arete, registro, padre, madre string) {
		call("POST", "/api/animals", map[string]interface{}{"id": arete, "arete": arete, "es_referencia": true, "registro": registro, "grado_registro": "SI",
			"raza": "DOR", "pureza": 100, "sexo": map[bool]string{true: "Macho", false: "Hembra"}[arete[0] != 'M' && arete[0] != 'A' || arete[len(arete)-1] == 'M'], "padre_id": padre, "madre_id": madre, "especie": "Ovino", "destino": "Pie de Cría", "estatus": "Referencia"})
	}
	ref("PHIL-0314", "DSSA:D0PM770140314", "", "")
	ref("PHIL-0117", "DSSA:DOPF770130117", "", "")
	ref("DOLL-9522", "DSSA:1700-12-9522", "", "")
	ref("CHAR-0222", "DSSA:770-11-0222", "", "")
	ref("PHIL-3543-F", "UNO:220916MF-RP", "PHIL-0314", "PHIL-0117")
	ref("ERH-3440-J", "UNO:242367HJ-RP", "DOLL-9522", "CHAR-0222")
	ref("REF-7672-G", "UNO:223233MG-RP", "", "")
	ref("JYN-7786-G", "UNO:222211HG-RP", "", "")
	// Sementales y madres fundadoras (generación 1)
	for i := 0; i < 3; i++ {
		sem := map[string]interface{}{"id": fmt.Sprintf("SEM-%02d", i+1), "arete": fmt.Sprintf("SEM-%02d", i+1), "raza": razas[i], "sexo": "Macho",
			"fecha_nacimiento": date(1100 + i*90), "estatus": "Activo", "estado_reproductivo": "Semental", "corral_id": "Sementales", "destino": "Pie de Cría", "peso_nacer": 4.2}
		if i == 0 { // semental con certificado UNO y árbol de referencia
			sem["nombre"], sem["registro"], sem["grado_registro"], sem["pureza"], sem["color"] = "Campeón", "UNO:272991MN-RP", "RP", 100, "Carac. raza"
			sem["tatuaje_der"], sem["tatuaje_izq"], sem["siniiga"] = "CSL", "5105N", "484011300505105"
			sem["tipo_parto"], sem["metodo_concepcion"], sem["tipo_nacimiento"] = "Sencillo", "Inseminación Artificial", "Natural"
			sem["padre_id"], sem["madre_id"] = "PHIL-3543-F", "ERH-3440-J"
		}
		call("POST", "/api/animals", sem)
	}
	for i := 0; i < 12; i++ {
		call("POST", "/api/animals", map[string]interface{}{"id": fmt.Sprintf("MAD-%02d", i+1), "arete": fmt.Sprintf("MAD-%02d", i+1), "raza": razas[i%3], "sexo": "Hembra",
			"fecha_nacimiento": date(800 + i*30), "estatus": "Activo", "estado_reproductivo": "Vacía", "corral_id": "Hembras Gestantes", "destino": "Pie de Cría",
			"padre_id": fmt.Sprintf("SEM-%02d", i%3+1), "peso_nacer": 3.8})
	}
	// Corderos de engorda (generación 2) con edades entre 2 y 7 meses
	for i := 0; i < 45; i++ {
		edad := 60 + rnd.Intn(150)
		sexo := "Macho"
		if i%2 == 0 {
			sexo = "Hembra"
		}
		corral := "Engorda Norte"
		if i%3 == 1 {
			corral = "Engorda Sur"
		} else if edad < 100 {
			corral = "Destete"
		}
		id := fmt.Sprintf("SM-%03d", 100+i)
		call("POST", "/api/animals", map[string]interface{}{"id": id, "arete": fmt.Sprintf("SM-%03d", 100+i), "raza": razas[i%3], "sexo": sexo,
			"fecha_nacimiento": date(edad), "estatus": "Activo", "estado_reproductivo": "Crecimiento", "corral_id": corral, "destino": "Engorda",
			"padre_id": fmt.Sprintf("SEM-%02d", i%3+1), "madre_id": fmt.Sprintf("MAD-%02d", i%12+1), "peso_nacer": 3.5 + rnd.Float64(),
			"abuelo_paterno_id": "SEM-91", "abuela_paterna_id": "MAD-91", "abuelo_materno_id": fmt.Sprintf("SEM-%02d", (i%12)%3+1), "abuela_materna_id": "MAD-92",
			"tipo_parto": []string{"Sencillo", "Doble"}[i%2], "metodo_concepcion": []string{"Monta Natural", "Inseminación Artificial"}[i%3%2], "tipo_nacimiento": []string{"Natural", "Natural", "Inducido"}[i%3]})
		// pesajes mensuales: ~0.25 kg/día → varios ya pasan de 42 kg con > 4 meses
		peso := 4.0
		for d := edad - 5; d > 0; d -= 30 {
			peso += 0.25 * 30 * (0.8 + rnd.Float64()*0.4)
			call("POST", "/api/weights", map[string]interface{}{"animal_id": id, "fecha": date(d), "peso": float64(int(peso*10)) / 10, "notas": ""})
		}
	}
	// Tratamientos recientes (periodo de retiro activo en algunos)
	for i := 0; i < 8; i++ {
		call("POST", "/api/treatments", map[string]interface{}{"animal_id": fmt.Sprintf("SM-%03d", 100+i*5), "insumo_id": "demo-i1", "dosis": 1.5,
			"via_administracion": "Subcutánea", "duracion_dias": 1, "fecha": date(rnd.Intn(20)), "tecnico": "MVZ Ramírez", "observaciones": "Desparasitación"})
	}
	// Montas, ultrasonidos y partos
	for i := 0; i < 12; i++ {
		madre := fmt.Sprintf("MAD-%02d", i+1)
		call("POST", "/api/reproduction", map[string]interface{}{"animal_id": madre, "tipo": "Monta Natural", "fecha_evento": date(30 + i*10), "id_macho": fmt.Sprintf("SEM-%02d", i%3+1), "tecnico": "Encargado"})
		if i < 3 {
			call("POST", "/api/confirm-ultrasound", map[string]interface{}{"animal_id": madre, "preñada": true, "fetos": 1 + i%2})
		}
		if i >= 9 {
			call("POST", "/api/births", map[string]interface{}{"animal_id": madre, "fecha": date(i - 8), "cantidad_crias": 1 + i%2, "tipo_parto": "Simple", "observaciones": "Sin complicaciones"})
		}
	}
	// Tareas de la semana
	prioridades := []string{"Alta", "Media", "Baja", "Alta"}
	for i, t := range []string{"Vacunar lote Engorda Norte", "Pesar corderos de Destete", "Revisar cerca del corral Sur", "Pedir alimento (quedan 3 días)"} {
		call("POST", "/api/tasks", map[string]interface{}{"titulo": t, "descripcion": "", "estatus": "Pendiente", "fecha_vencimiento": date(-i), "prioridad": prioridades[i]})
	}
	fmt.Println("hato de demostración cargado")
}
