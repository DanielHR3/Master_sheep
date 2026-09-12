package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
)

// FichaData es todo lo que necesita la ficha genealógica de un animal.
type FichaData struct {
	Animal       Animal
	Tree         *PedigreeNode
	Perfil       RanchoPerfil
	RanchoNombre string
	Logo         []byte
	LogoTipo     string // "JPG" o "PNG"
	Emitida      time.Time
}

const fichaLeyenda = "Documento interno del rancho. No sustituye el certificado de registro de la UNO."

// buildFicha reúne animal, árbol de cuatro generaciones y perfil del rancho.
// Solo borregos; el animal debe pertenecer al rancho del usuario.
func (a *App) buildFicha(animalID string) (FichaData, error) {
	if a.user == nil {
		return FichaData{}, fmt.Errorf("no autenticado")
	}
	an, ok := a.findAnimalByRef(animalID)
	if !ok {
		return FichaData{}, fmt.Errorf("animal no encontrado")
	}
	if an.Especie != "" && !strings.EqualFold(an.Especie, "Ovino") {
		return FichaData{}, fmt.Errorf("la ficha genealógica solo está disponible para borregos por ahora")
	}
	tree, err := a.BuildPedigree(an.ID, 4)
	if err != nil {
		return FichaData{}, err
	}
	perfil, err := a.GetRanchoPerfil()
	if err != nil {
		return FichaData{}, err
	}
	nombre, logo, tipo := ranchoBranding(a.user.Email, perfil.Nombre)
	return FichaData{Animal: an, Tree: tree, Perfil: perfil, RanchoNombre: nombre, Logo: logo, LogoTipo: tipo, Emitida: time.Now()}, nil
}

// fichaPDFBytes genera el PDF listo para entregar.
func (a *App) fichaPDFBytes(animalID string) ([]byte, string, error) {
	data, err := a.buildFicha(animalID)
	if err != nil {
		return nil, "", err
	}
	pdf, err := renderFichaPDF(data, true)
	if err != nil {
		return nil, "", err
	}
	name := strings.Map(func(r rune) rune {
		if r == '/' || r == '\\' || r == ' ' {
			return '_'
		}
		return r
	}, data.Animal.Arete)
	return pdf, "ficha_" + name + ".pdf", nil
}

// handleFichaPDF: GET /api/animals/{id}/ficha (web).
func (a *App) handleFichaPDF(w http.ResponseWriter, r *http.Request) {
	pdf, name, err := a.fichaPDFBytes(r.PathValue("id"))
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "no encontrado") {
			status = http.StatusNotFound
		}
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
	w.Write(pdf)
}

// --- dibujo ---

type fichaCanvas struct {
	pdf *fpdf.Fpdf
	tr  func(string) string
}

func (c *fichaCanvas) text(x, y float64, size float64, style, s string) {
	c.pdf.SetFont("Helvetica", style, size)
	c.pdf.Text(x, y, c.tr(s))
}

// fitText escribe s sin pasarse de maxW: baja la fuente hasta 5.5 pt y, si
// aun así no cabe, recorta con "…".
func (c *fichaCanvas) fitText(x, y, maxW, size float64, style, s string) {
	txt := c.tr(s)
	for ; size >= 5.5; size -= 0.5 {
		c.pdf.SetFont("Helvetica", style, size)
		if c.pdf.GetStringWidth(txt) <= maxW {
			c.pdf.Text(x, y, txt)
			return
		}
	}
	c.pdf.SetFont("Helvetica", style, 5.5)
	ell := c.tr("…")
	for len(txt) > 1 && c.pdf.GetStringWidth(txt+ell) > maxW {
		txt = txt[:len(txt)-1]
	}
	c.pdf.Text(x, y, txt+ell)
}

// label pinta etiqueta (gris, mayúsculas) y valor, acotado a maxW.
func (c *fichaCanvas) label(x, y, maxW float64, k, v string) {
	c.pdf.SetTextColor(90, 100, 120)
	c.text(x, y, 6.5, "B", strings.ToUpper(k))
	c.pdf.SetTextColor(15, 23, 42)
	c.fitText(x+24, y, maxW-24, 8.5, "", v)
}

func pct(v float64) string {
	if v <= 0 {
		return ""
	}
	return fmt.Sprintf("%.2f%%", v)
}

func nodeLines(n *PedigreeNode) (string, string) {
	if n == nil {
		return "", ""
	}
	if !n.Existe {
		return n.Arete, ""
	}
	l1 := n.Registro
	if n.GradoRegistro != "" {
		if l1 == "" {
			l1 = n.GradoRegistro
		} else {
			l1 += " // " + n.GradoRegistro
		}
	}
	if l1 == "" {
		l1 = n.Arete
	}
	name := n.Nombre
	if name == "" {
		name = n.Arete
	}
	l2 := name
	raza := strings.TrimSpace(strings.TrimSpace(n.Raza) + " " + pct(n.Pureza))
	if raza != "" {
		l2 += " // " + raza
	}
	return l1, l2
}

// renderFichaPDF dibuja la ficha en A4 vertical. compress=false se usa en
// pruebas para poder buscar texto en el resultado.
func renderFichaPDF(d FichaData, compress bool) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetCompression(compress)
	pdf.SetMargins(12, 10, 12)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()
	c := &fichaCanvas{pdf: pdf, tr: pdf.UnicodeTranslatorFromDescriptor("")}
	const left, right = 12.0, 198.0
	width := right - left

	// Cabecera
	x := left
	if len(d.Logo) > 0 {
		pdf.RegisterImageOptionsReader("logo", fpdf.ImageOptions{ImageType: d.LogoTipo}, bytes.NewReader(d.Logo))
		// alto fijo 22 mm y ancho proporcional (el escudo de Don Pablito es apaisado)
		info := pdf.GetImageInfo("logo")
		w := 22.0
		if info != nil && info.Height() > 0 {
			w = 22 * info.Width() / info.Height()
		}
		if w > 40 {
			w = 40
		}
		pdf.ImageOptions("logo", left, 10, w, 22, false, fpdf.ImageOptions{ImageType: d.LogoTipo}, 0, "")
		x = left + w + 4
	}
	pdf.SetTextColor(15, 23, 42)
	c.text(x, 17, 14, "B", strings.ToUpper(d.RanchoNombre))
	c.text(x, 24, 11, "B", "REGISTRO GENEALÓGICO")
	pdf.SetTextColor(90, 100, 120)
	c.text(x, 29.5, 7, "", "Ficha genealógica de cuatro generaciones")
	if d.Animal.Registro != "" {
		pdf.SetTextColor(90, 100, 120)
		c.text(right-70, 15, 6.5, "B", "REGISTRO UNO")
		pdf.SetTextColor(15, 23, 42)
		c.text(right-70, 21, 10, "B", d.Animal.Registro)
	}
	pdf.SetDrawColor(203, 213, 225)
	pdf.SetLineWidth(0.3)
	pdf.Line(left, 34, right, 34)

	// Bloque del animal
	an := d.Animal
	pdf.RoundedRect(left, 37, width, 40, 2, "1234", "D")
	colW3 := width / 3
	col1, col2, col3 := left+3, left+colW3+3, left+2*colW3+3
	rows1 := [][2]string{{"Nombre", an.Nombre}, {"Sexo", an.Sexo}, {"Raza", an.Raza}, {"Grado", pct(an.Pureza)}, {"Color", an.Color}, {"Identificación", an.Arete}}
	rows2 := [][2]string{{"Tatuaje der.", an.TatuajeDer}, {"Tatuaje izq.", an.TatuajeIzq}, {"Cola", an.TatuajeCola}, {"Fecha nac.", an.FechaNacimiento},
		{"Tipo de parto", an.TipoParto}, {"Concepción", an.MetodoConcepcion}}
	rows3 := [][2]string{{"Nacimiento", an.TipoNacimiento}, {"ID electrónica", an.IDElectronica}, {"SINIIGA", an.Siniiga}}
	for i, rows := range [][][2]string{rows1, rows2, rows3} {
		x := []float64{col1, col2, col3}[i]
		y := 43.0
		for _, r := range rows {
			c.label(x, y, colW3-5, r[0], r[1])
			y += 6
		}
	}

	// Árbol: 4 columnas (padres, abuelos, bisabuelos, tatarabuelos)
	top, bottom := 82.0, 232.0
	h := bottom - top
	gens := 4
	colW := width / float64(gens)
	pdf.SetDrawColor(148, 163, 184)
	pdf.SetLineWidth(0.25)
	var draw func(n *PedigreeNode, gen, slot int)
	draw = func(n *PedigreeNode, gen, slot int) {
		if gen > gens {
			return
		}
		slots := 1 << gen
		cellH := h / float64(slots)
		cy := top + (float64(slot)+0.5)*cellH
		cx := left + float64(gen-1)*colW
		boxW := colW - 3
		l1, l2 := nodeLines(n)
		if n != nil {
			pdf.SetFillColor(248, 250, 252)
			pdf.RoundedRect(cx+1, cy-4.2, boxW, 8.4, 1, "1234", "FD")
			pdf.SetTextColor(15, 23, 42)
			size := 6.0
			if gen >= 3 {
				size = 5.2
			}
			c.text(cx+2.5, cy-0.8, size, "B", l1)
			pdf.SetTextColor(71, 85, 105)
			c.text(cx+2.5, cy+2.6, size, "", l2)
		} else {
			pdf.SetDrawColor(226, 232, 240)
			pdf.RoundedRect(cx+1, cy-4.2, boxW, 8.4, 1, "1234", "D")
			pdf.SetDrawColor(148, 163, 184)
		}
		if gen < gens {
			// conector hacia los padres (columna siguiente)
			childSlots := 1 << (gen + 1)
			pcH := h / float64(childSlots)
			py := top + (float64(2*slot)+0.5)*pcH
			my := top + (float64(2*slot+1)+0.5)*pcH
			jx := cx + boxW + 2
			pdf.Line(cx+1+boxW, cy, jx, cy)
			pdf.Line(jx, py, jx, my)
			pdf.Line(jx, py, jx+1, py)
			pdf.Line(jx, my, jx+1, my)
			var p, m *PedigreeNode
			if n != nil {
				p, m = n.Padre, n.Madre
			}
			draw(p, gen+1, 2*slot)
			draw(m, gen+1, 2*slot+1)
		}
	}
	pdf.SetTextColor(90, 100, 120)
	for i, t := range []string{"PADRES", "ABUELOS", "BISABUELOS", "TATARABUELOS"} {
		c.text(left+float64(i)*colW+1, top-2, 6, "B", t)
	}
	if d.Tree != nil {
		draw(d.Tree.Padre, 1, 0)
		draw(d.Tree.Madre, 1, 1)
	}

	// Pie: criador y propietario
	pdf.SetDrawColor(203, 213, 225)
	pdf.RoundedRect(left, 236, width, 40, 2, "1234", "D")
	p := d.Perfil
	halfW := width / 2
	y := 242.0
	for _, r := range [][2]string{{"Criador", p.CriadorClave}, {"Nombre", p.CriadorNombre}, {"Centro", p.CriadorCentro}, {"Mpio/Edo", p.CriadorMunicipioEstado}} {
		c.label(left+3, y, halfW-6, r[0], r[1])
		y += 6
	}
	y = 242.0
	for _, r := range [][2]string{{"Propietario", p.PropietarioClave}, {"Nombre", p.PropietarioNombre}, {"Centro", p.PropietarioCentro}, {"Mpio/Edo", p.PropietarioMunicipioEstado}} {
		c.label(left+halfW+3, y, halfW-6, r[0], r[1])
		y += 6
	}
	pdf.SetTextColor(90, 100, 120)
	c.text(left, 270, 7, "", fmt.Sprintf("Emitida el %s por SheepMaster", d.Emitida.Format("02/01/2006")))
	pdf.SetTextColor(120, 30, 30)
	c.text(left, 284, 7, "I", fichaLeyenda)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
