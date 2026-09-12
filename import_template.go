package main

import (
	"bytes"
	"strings"
	"unicode"

	"github.com/xuri/excelize/v2"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// importColumn describe una columna de la carga masiva: su llave interna, el
// encabezado que trae la plantilla, sinónimos aceptados y un valor de ejemplo.
type importColumn struct {
	key      string
	header   string
	synonyms []string
	example  string
}

// importColumns es el contrato entre la plantilla descargable y el
// importador: mismo orden, mismos encabezados. Las primeras nueve coinciden
// con el orden posicional histórico (hojas sin encabezados reconocibles).
var importColumns = []importColumn{
	{"arete", "Arete", []string{"numero de arete", "numero", "no arete", "id", "identificador"}, "BG-001"},
	{"raza", "Raza", nil, "Dorper"},
	{"sexo", "Sexo", nil, "Hembra"},
	{"corral", "Corral", []string{"corral id"}, "Maternidad"},
	{"fecha_nacimiento", "Fecha Nacimiento", []string{"fecha de nacimiento", "nacimiento", "fecha nac"}, "2026-01-15"},
	{"peso_nacer", "Peso Nacer", []string{"peso al nacer", "peso nacimiento"}, "3.9"},
	{"padre", "Padre", []string{"padre id", "semental", "arete padre"}, "SEM-01"},
	{"madre", "Madre", []string{"madre id", "arete madre"}, "MAD-01"},
	{"destino", "Destino", []string{"proposito"}, "Pie de Cría"},
	{"especie", "Especie", nil, "Ovino"},
	{"tipo_parto", "Tipo Parto", []string{"tipo de parto", "parto"}, "Sencillo"},
	{"metodo_concepcion", "Metodo Concepcion", []string{"metodo de concepcion", "concepcion"}, "Monta Natural"},
	{"tipo_nacimiento", "Tipo Nacimiento", []string{"tipo de nacimiento", "nacimiento natural o inducido", "parto natural o inducido"}, "Natural"},
	{"abuelo_paterno", "Abuelo Paterno", []string{"abuelo pat"}, "SEM-91"},
	{"abuela_paterna", "Abuela Paterna", []string{"abuela pat"}, "MAD-91"},
	{"abuelo_materno", "Abuelo Materno", []string{"abuelo mat"}, "SEM-02"},
	{"abuela_materna", "Abuela Materna", []string{"abuela mat"}, "MAD-92"},
	{"nombre", "Nombre", nil, "Relámpago"},
	{"tatuaje_der", "Tatuaje Der", []string{"tatuaje derecho", "oreja der", "oreja derecha"}, "CRI"},
	{"tatuaje_izq", "Tatuaje Izq", []string{"tatuaje izquierdo", "oreja izq", "oreja izquierda"}, "0001N"},
	{"tatuaje_cola", "Tatuaje Cola", []string{"cola"}, ""},
	{"color", "Color", nil, "Carac. raza"},
	{"pureza", "Pureza", []string{"grado", "pureza pct", "grado pct"}, "100"},
	{"grado_registro", "Grado Registro", []string{"codigo grado", "grado uno"}, "RP"},
	{"registro", "Registro", []string{"registro uno", "no registro", "numero de registro", "certificado"}, "UNO:272991MN-RP"},
	{"siniiga", "SINIIGA", nil, "484011300505105"},
	{"id_electronica", "ID Electronica", []string{"id electronico", "chip", "arete electronico"}, ""},
	{"referencia", "Referencia", []string{"solo referencia", "es referencia", "ancestro"}, "No"},
}

// normalizeHeader deja un encabezado comparable: minúsculas, sin acentos,
// sin signos y con espacios simples ("Método de Concepción" → "metodo de concepcion").
func normalizeHeader(h string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	s, _, err := transform.String(t, h)
	if err != nil {
		s = h
	}
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
		default:
			b.WriteRune(' ')
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}

// resolveImportColumns mapea llave → índice de columna a partir de la fila de
// encabezados. Si no reconoce la columna de arete, devuelve el mapa posicional
// histórico (compatibilidad con hojas viejas sin encabezados).
func resolveImportColumns(headerRow []string) map[string]int {
	byHeader := map[string]int{}
	for _, c := range importColumns {
		byHeader[normalizeHeader(c.header)] = -1
	}
	index := map[string]int{}
	for i, raw := range headerRow {
		h := normalizeHeader(raw)
		if h == "" {
			continue
		}
		for _, c := range importColumns {
			if _, taken := index[c.key]; taken {
				continue
			}
			if h == normalizeHeader(c.header) {
				index[c.key] = i
				break
			}
			matched := false
			for _, syn := range c.synonyms {
				if h == normalizeHeader(syn) {
					matched = true
					break
				}
			}
			if matched {
				index[c.key] = i
				break
			}
		}
	}
	if _, ok := index["arete"]; !ok {
		positional := map[string]int{}
		for i, c := range importColumns {
			positional[c.key] = i
		}
		return positional
	}
	return index
}

// buildImportTemplate genera el .xlsx descargable: encabezados en negritas,
// una fila de ejemplo y una hoja de instrucciones con los valores aceptados.
func buildImportTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()
	sheet := "Animales"
	f.SetSheetName(f.GetSheetName(0), sheet)
	bold, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	for i, c := range importColumns {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, c.header)
		f.SetCellStyle(sheet, cell, cell, bold)
		cell, _ = excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, c.example)
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 20)
	}
	inst := "Instrucciones"
	f.NewSheet(inst)
	lines := []string{
		"Llena una fila por animal en la hoja 'Animales'. Solo 'Arete' es obligatorio.",
		"El orden de las columnas no importa: se reconocen por su encabezado.",
		"Sexo: Hembra / Macho.   Especie: Ovino / Bovino.   Destino: Engorda / Pie de Cría.",
		"Fecha Nacimiento: AAAA-MM-DD o DD/MM/AAAA.   Peso Nacer: kilogramos, con punto decimal.",
		"Tipo Parto: Sencillo / Doble / Triple.   Metodo Concepcion: Monta Natural / Inseminación Artificial / Transferencia de Embriones.",
		"Tipo Nacimiento: Natural / Inducido.   Padre, Madre y abuelos: el arete tal como está registrado.",
		"Nombre, Tatuajes, Color, Pureza (%), Grado Registro (SI/GE/ND/HO/TR/OT/RP), Registro (UNO), SINIIGA e ID Electronica: como aparecen en el certificado UNO.",
		"Referencia = Sí: el animal NO vive en el rancho; solo se guarda para la genealogía (ancestros del certificado de un semental comprado). No cuenta en el inventario.",
		"Borra la fila de ejemplo antes de cargar el archivo.",
	}
	for i, l := range lines {
		cell, _ := excelize.CoordinatesToCellName(1, i+1)
		f.SetCellValue(inst, cell, l)
	}
	f.SetColWidth(inst, "A", "A", 120)
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
