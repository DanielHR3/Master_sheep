package main

import (
	"fmt"
	"math"
	"sort"
	"time"
)

// Semáforo del hato: un color por animal (rojo / amarillo / verde / gris) y
// una frase en lenguaje de corral, calculados con pesajes, edad, tratamientos
// y destino. Reglas en docs/superpowers/specs/2026-09-12-semaforo-hato-design.md.

// Meta de venta del rancho: 42 kg y 4 meses. El rojo ("sácalo hoy") entra
// "uno arriba" de la meta, como lo pidió el rancho: desde 43 kg y 121 días.
const (
	metaPesoVenta  = 42.0 // kg
	metaEdadVenta  = 120  // días (4 meses)
	listoPesoVenta = metaPesoVenta + 1
	listoEdadVenta = metaEdadVenta + 1
	ventaProximaEn = 30   // días para "amarillo" en venta
	ventanaGDP     = 90   // días de pesajes considerados para la GDP
	ventanaTratos  = 60   // días para contar tratamientos repetidos
	loteMinimo     = 3    // animales para comparar contra el lote
	loteEdadMargen = 60   // ± días de edad para formar el lote
)

type SenalVenta struct {
	Color          string  `json:"color"`
	DiasEstimados  int     `json:"dias_estimados"`
	FechaEstimada  string  `json:"fecha_estimada"`
	PesoProyectado float64 `json:"peso_proyectado"` // a la fecha estimada (o en 30 días si ya está listo)
}

type SenalCrecimiento struct {
	Color      string  `json:"color"`
	GDP        float64 `json:"gdp"`
	GDPLote    float64 `json:"gdp_lote"`
	Porcentaje int     `json:"porcentaje"` // GDP del animal como % del lote
}

type SenalRiesgo struct {
	Color  string `json:"color"`
	Motivo string `json:"motivo"`
}

type SemaforoAnimal struct {
	AnimalID      string           `json:"animal_id"`
	Arete         string           `json:"arete"`
	Color         string           `json:"color"`
	Titulo        string           `json:"titulo"`
	Detalle       string           `json:"detalle"`
	PesoActual    float64          `json:"peso_actual"`
	UltimoPesaje  string           `json:"ultimo_pesaje"`
	DiasSinPesaje int              `json:"dias_sin_pesaje"`
	EdadDias      int              `json:"edad_dias"`
	ValorEstimado float64          `json:"valor_estimado"`
	Venta         SenalVenta       `json:"venta"`
	Crecimiento   SenalCrecimiento `json:"crecimiento"`
	Riesgo        SenalRiesgo      `json:"riesgo"`
}

type pesaje struct {
	fecha time.Time
	peso  float64
}

type animalDatos struct {
	an          Animal
	edad        int
	pesajes     []pesaje // ordenados por fecha
	tratos60    int
	gdp         float64
	tieneGDP    bool
	pesoActual  float64
	ultimo      time.Time
	diasSinPeso int
}

func parseFecha(s string) (time.Time, bool) {
	for _, f := range []string{"2006-01-02", "2006-01-02T15:04:05Z07:00", "02/01/2006"} {
		if t, err := time.Parse(f, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// cargarDatos junta pesajes y tratamientos de todos los animales activos del
// rancho en tres consultas, para no hacer una por animal.
func (a *App) cargarDatos() ([]*animalDatos, error) {
	animales, err := a.GetAnimales()
	if err != nil {
		return nil, err
	}
	now := time.Now()
	byID := map[string]*animalDatos{}
	var out []*animalDatos
	for _, an := range animales {
		if an.Estatus != "" && an.Estatus != "Activo" {
			continue
		}
		d := &animalDatos{an: an}
		if t, ok := parseFecha(an.FechaNacimiento); ok {
			d.edad = int(now.Sub(t).Hours() / 24)
		}
		byID[an.ID] = d
		if an.Arete != "" {
			byID[an.Arete] = d
		}
		out = append(out, d)
	}

	rows, err := a.db.Query(a.q(`SELECT animal_id, fecha, peso FROM seguimientos_peso WHERE user_id = ? ORDER BY fecha ASC`), a.tenantID())
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, fecha string
		var peso float64
		if err := rows.Scan(&id, &fecha, &peso); err != nil {
			continue
		}
		d, ok := byID[id]
		if !ok {
			continue
		}
		if t, ok := parseFecha(fecha); ok && peso > 0 {
			d.pesajes = append(d.pesajes, pesaje{t, peso})
		}
	}
	rows.Close()

	corte := now.AddDate(0, 0, -ventanaTratos).Format("2006-01-02")
	rows, err = a.db.Query(a.q(`SELECT animal_id, COUNT(*) FROM tratamientos WHERE user_id = ? AND fecha >= ? GROUP BY animal_id`), a.tenantID(), corte)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id string
		var n int
		if err := rows.Scan(&id, &n); err != nil {
			continue
		}
		if d, ok := byID[id]; ok {
			d.tratos60 = n
		}
	}
	rows.Close()

	for _, d := range out {
		sort.Slice(d.pesajes, func(i, j int) bool { return d.pesajes[i].fecha.Before(d.pesajes[j].fecha) })
		d.calcularGDP(now)
	}
	return out, nil
}

// calcularGDP: pendiente entre el primer y último pesaje de los últimos 90
// días; con un solo pesaje, contra el peso al nacer.
func (d *animalDatos) calcularGDP(now time.Time) {
	if len(d.pesajes) == 0 {
		return
	}
	last := d.pesajes[len(d.pesajes)-1]
	d.pesoActual, d.ultimo = last.peso, last.fecha
	d.diasSinPeso = int(now.Sub(last.fecha).Hours() / 24)
	desde := now.AddDate(0, 0, -ventanaGDP)
	var first *pesaje
	for i := range d.pesajes {
		if !d.pesajes[i].fecha.Before(desde) {
			first = &d.pesajes[i]
			break
		}
	}
	if first == nil || first.fecha.Equal(last.fecha) {
		// un solo pesaje en la ventana: usar el anterior si existe, si no el peso al nacer
		if len(d.pesajes) >= 2 {
			first = &d.pesajes[len(d.pesajes)-2]
		} else if d.an.PesoNacer > 0 && d.edad > 0 {
			d.gdp = (last.peso - d.an.PesoNacer) / float64(d.edad)
			d.tieneGDP = true
			return
		} else {
			return
		}
	}
	dias := last.fecha.Sub(first.fecha).Hours() / 24
	if dias <= 0 {
		return
	}
	d.gdp = (last.peso - first.peso) / dias
	d.tieneGDP = true
}

func medianaGDPLote(all []*animalDatos, d *animalDatos) (float64, bool) {
	var vals []float64
	for _, o := range all {
		if o == d || !o.tieneGDP || o.gdp <= 0 || o.an.Destino != d.an.Destino {
			continue
		}
		if math.Abs(float64(o.edad-d.edad)) > loteEdadMargen {
			continue
		}
		vals = append(vals, o.gdp)
	}
	if len(vals) < loteMinimo {
		return 0, false
	}
	sort.Float64s(vals)
	n := len(vals)
	if n%2 == 1 {
		return vals[n/2], true
	}
	return (vals[n/2-1] + vals[n/2]) / 2, true
}

func peor(colores ...string) string {
	rank := map[string]int{"rojo": 3, "amarillo": 2, "verde": 1, "gris": 0}
	best := "gris"
	for _, c := range colores {
		if rank[c] > rank[best] {
			best = c
		}
	}
	return best
}

func pesos(v float64) string {
	if v <= 0 {
		return ""
	}
	s := fmt.Sprintf("%.0f", v)
	// separador de miles
	out := ""
	for i, r := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			out += ","
		}
		out += string(r)
	}
	return "$" + out
}

// GetSemaforoHato calcula el semáforo de todos los animales activos del rancho.
func (a *App) GetSemaforoHato() ([]SemaforoAnimal, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}
	datos, err := a.cargarDatos()
	if err != nil {
		return nil, err
	}
	perfil, _ := a.GetRanchoPerfil()
	now := time.Now()
	out := make([]SemaforoAnimal, 0, len(datos))
	for _, d := range datos {
		s := SemaforoAnimal{AnimalID: d.an.ID, Arete: d.an.Arete, EdadDias: d.edad, PesoActual: d.pesoActual, DiasSinPesaje: d.diasSinPeso}
		if !d.ultimo.IsZero() {
			s.UltimoPesaje = d.ultimo.Format("2006-01-02")
		}
		if perfil.PrecioKg > 0 && d.pesoActual > 0 {
			s.ValorEstimado = math.Round(d.pesoActual * perfil.PrecioKg)
		}
		esEngorda := d.an.Destino == "Engorda"

		// --- Crecimiento ---
		s.Crecimiento = SenalCrecimiento{Color: "gris", GDP: round3(d.gdp)}
		if d.tieneGDP {
			if lote, ok := medianaGDPLote(datos, d); ok {
				s.Crecimiento.GDPLote = round3(lote)
				pct := int(math.Round(d.gdp / lote * 100))
				if pct < 0 {
					pct = 0
				}
				s.Crecimiento.Porcentaje = pct
				switch {
				case pct < 60:
					s.Crecimiento.Color = "rojo"
				case pct < 85:
					s.Crecimiento.Color = "amarillo"
				default:
					s.Crecimiento.Color = "verde"
				}
			} else if d.gdp > 0 {
				s.Crecimiento.Color = "verde"
			}
		}

		// --- Riesgo ---
		s.Riesgo = SenalRiesgo{Color: "gris", Motivo: "Sin pesajes registrados"}
		if len(d.pesajes) > 0 {
			switch {
			case len(d.pesajes) >= 2 && d.tieneGDP && d.gdp <= 0:
				s.Riesgo = SenalRiesgo{"rojo", "Peso estancado o en baja"}
			case d.tratos60 >= 3:
				s.Riesgo = SenalRiesgo{"rojo", fmt.Sprintf("%d tratamientos en %d días", d.tratos60, ventanaTratos)}
			case esEngorda && d.diasSinPeso > 60:
				s.Riesgo = SenalRiesgo{"rojo", fmt.Sprintf("Sin pesaje desde hace %d días", d.diasSinPeso)}
			case d.tratos60 == 2:
				s.Riesgo = SenalRiesgo{"amarillo", fmt.Sprintf("2 tratamientos en %d días", ventanaTratos)}
			case d.diasSinPeso > 30:
				s.Riesgo = SenalRiesgo{"amarillo", fmt.Sprintf("Sin pesaje desde hace %d días", d.diasSinPeso)}
			default:
				s.Riesgo = SenalRiesgo{"verde", ""}
			}
		}

		// --- Venta (solo engorda) ---
		s.Venta = SenalVenta{Color: "gris"}
		if esEngorda && len(d.pesajes) > 0 {
			listoPeso, listoEdad := d.pesoActual >= listoPesoVenta, d.edad >= listoEdadVenta
			if listoPeso && listoEdad {
				s.Venta.Color = "rojo"
				if d.tieneGDP && d.gdp > 0 {
					s.Venta.PesoProyectado = round1(d.pesoActual + d.gdp*30)
				}
			} else if d.tieneGDP && d.gdp > 0 {
				diasPeso := 0.0
				if !listoPeso {
					diasPeso = (listoPesoVenta - d.pesoActual) / d.gdp
				}
				diasEdad := 0.0
				if !listoEdad {
					diasEdad = float64(listoEdadVenta - d.edad)
				}
				dias := int(math.Ceil(math.Max(diasPeso, diasEdad)))
				s.Venta.DiasEstimados = dias
				s.Venta.FechaEstimada = now.AddDate(0, 0, dias).Format("2006-01-02")
				s.Venta.PesoProyectado = round1(d.pesoActual + d.gdp*float64(dias))
				if dias <= ventaProximaEn {
					s.Venta.Color = "amarillo"
				} else {
					s.Venta.Color = "verde"
				}
			} else {
				s.Venta.Color = "verde"
			}
		}

		// --- Color global y frase ---
		s.Color = peor(s.Riesgo.Color, s.Venta.Color, s.Crecimiento.Color)
		s.Titulo, s.Detalle = fraseSemaforo(s, d, perfil.PrecioKg > 0)
		out = append(out, s)
	}
	sort.SliceStable(out, func(i, j int) bool {
		rank := map[string]int{"rojo": 3, "amarillo": 2, "verde": 1, "gris": 0}
		if rank[out[i].Color] != rank[out[j].Color] {
			return rank[out[i].Color] > rank[out[j].Color]
		}
		return out[i].Arete < out[j].Arete
	})
	return out, nil
}

// fraseSemaforo elige la señal que manda y la traduce a una línea.
func fraseSemaforo(s SemaforoAnimal, d *animalDatos, hayPrecio bool) (string, string) {
	valor := ""
	if hayPrecio && s.ValorEstimado > 0 {
		valor = ", ~" + pesos(s.ValorEstimado)
	}
	switch {
	case len(d.pesajes) == 0:
		return "Sin pesajes: registra el primero", "El semáforo necesita al menos un pesaje."
	case s.Riesgo.Color == "rojo":
		return s.Riesgo.Motivo, fmt.Sprintf("Último pesaje %.1f kg el %s.", s.PesoActual, s.UltimoPesaje)
	case s.Venta.Color == "rojo":
		return fmt.Sprintf("Listo para venta: %.1f kg%s", s.PesoActual, valor), "Cumple peso y edad; cada día en el corral cuesta alimento."
	case s.Crecimiento.Color == "rojo":
		return fmt.Sprintf("Gana %d%% menos que su lote", 100-s.Crecimiento.Porcentaje), fmt.Sprintf("%.2f kg/día contra %.2f del lote. Revisar alimento, parásitos o dientes.", s.Crecimiento.GDP, s.Crecimiento.GDPLote)
	case s.Venta.Color == "amarillo":
		return fmt.Sprintf("Venta en ~%d días (%s)", s.Venta.DiasEstimados, s.Venta.FechaEstimada), fmt.Sprintf("Llegaría a %.1f kg a %.2f kg/día%s.", s.Venta.PesoProyectado, s.Crecimiento.GDP, valor)
	case s.Riesgo.Color == "amarillo":
		return s.Riesgo.Motivo, fmt.Sprintf("Último pesaje %.1f kg el %s.", s.PesoActual, s.UltimoPesaje)
	case s.Crecimiento.Color == "amarillo":
		return fmt.Sprintf("Gana %d%% menos que su lote", 100-s.Crecimiento.Porcentaje), fmt.Sprintf("%.2f kg/día contra %.2f del lote.", s.Crecimiento.GDP, s.Crecimiento.GDPLote)
	case s.Venta.Color == "verde" && s.Venta.DiasEstimados > 0:
		return fmt.Sprintf("Va bien: %.2f kg/día, venta ~%s", s.Crecimiento.GDP, s.Venta.FechaEstimada), fmt.Sprintf("%.1f kg hoy%s.", s.PesoActual, valor)
	case d.tieneGDP:
		return fmt.Sprintf("Va bien: %.2f kg/día", s.Crecimiento.GDP), fmt.Sprintf("%.1f kg hoy%s.", s.PesoActual, valor)
	default:
		return fmt.Sprintf("%.1f kg%s", s.PesoActual, valor), "Registra otro pesaje para calcular la ganancia diaria."
	}
}

func round1(v float64) float64 { return math.Round(v*10) / 10 }
func round3(v float64) float64 { return math.Round(v*1000) / 1000 }
