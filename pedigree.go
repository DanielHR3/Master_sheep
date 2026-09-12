package main

import (
	"database/sql"
	"fmt"
	"strings"
)

// PedigreeNode es un nodo del árbol genealógico. Existe=false significa que
// no hay registro detrás: es texto suelto (un arete capturado a mano) o un
// nodo vacío que solo se conserva para colgar a sus propios ancestros.
type PedigreeNode struct {
	ID            string        `json:"id"`
	Arete         string        `json:"arete"`
	Nombre        string        `json:"nombre"`
	Registro      string        `json:"registro"`
	GradoRegistro string        `json:"grado_registro"`
	Raza          string        `json:"raza"`
	Pureza        float64       `json:"pureza"`
	Sexo          string        `json:"sexo"`
	Foto          string        `json:"foto"`
	EsReferencia  bool          `json:"es_referencia"`
	Existe        bool          `json:"existe"`
	Padre         *PedigreeNode `json:"padre,omitempty"`
	Madre         *PedigreeNode `json:"madre,omitempty"`
}

// GetAnimalesReferencia lista los animales que solo existen para el árbol.
func (a *App) GetAnimalesReferencia() ([]Animal, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}
	rows, err := a.db.Query(a.q(`SELECT `+animalSelectColumns+` FROM animales WHERE user_id = ? AND COALESCE(es_referencia, 0) = 1 ORDER BY arete`), a.tenantID())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Animal
	for rows.Next() {
		an, err := scanAnimal(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, an)
	}
	return out, nil
}

// findAnimalByRef busca un animal del rancho por id o por arete (incluye
// referencias). ok=false si no existe.
func (a *App) findAnimalByRef(ref string) (Animal, bool) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return Animal{}, false
	}
	row := a.db.QueryRow(a.q(`SELECT `+animalSelectColumns+` FROM animales WHERE user_id = ? AND (id = ? OR arete = ?) LIMIT 1`), a.tenantID(), ref, ref)
	an, err := scanAnimal(row)
	if err != nil {
		if err != sql.ErrNoRows {
			fmt.Printf("Aviso: findAnimalByRef(%q): %v\n", ref, err)
		}
		return Animal{}, false
	}
	return an, true
}

func nodeFromAnimal(an Animal) *PedigreeNode {
	return &PedigreeNode{
		ID: an.ID, Arete: an.Arete, Nombre: an.Nombre, Registro: an.Registro, GradoRegistro: an.GradoRegistro,
		Raza: an.Raza, Pureza: an.Pureza, Sexo: an.Sexo, Foto: an.Foto, EsReferencia: an.EsReferencia, Existe: true,
	}
}

func textNode(text string) *PedigreeNode {
	if strings.TrimSpace(text) == "" {
		return nil
	}
	return &PedigreeNode{Arete: strings.TrimSpace(text)}
}

// BuildPedigree arma el árbol del animal hasta `depth` generaciones
// siguiendo padre_id/madre_id (por id o arete). Cuando un padre no es un
// registro, el nodo lleva el texto capturado y sus padres salen de los
// campos abuelo_* del hijo (compatibilidad con la captura anterior).
func (a *App) BuildPedigree(animalID string, depth int) (*PedigreeNode, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}
	an, ok := a.findAnimalByRef(animalID)
	if !ok {
		return nil, fmt.Errorf("animal no encontrado")
	}
	root := nodeFromAnimal(an)
	a.fillParents(root, an, depth)
	return root, nil
}

// fillParents cuelga padre y madre de `node` (que corresponde a `an`) y
// recurre `depth` generaciones más.
func (a *App) fillParents(node *PedigreeNode, an Animal, depth int) {
	if depth <= 0 {
		return
	}
	node.Padre = a.parentNode(an.PadreID, an.AbueloPaternoID, an.AbuelaPaternaID, depth-1)
	node.Madre = a.parentNode(an.MadreID, an.AbueloMaternoID, an.AbuelaMaternaID, depth-1)
}

// parentNode resuelve un padre/madre por referencia; si no es un registro,
// devuelve un nodo de texto con los abuelos capturados en el hijo.
func (a *App) parentNode(ref, abuelo, abuela string, depth int) *PedigreeNode {
	if p, ok := a.findAnimalByRef(ref); ok {
		n := nodeFromAnimal(p)
		a.fillParents(n, p, depth)
		return n
	}
	n := textNode(ref)
	if depth > 0 {
		gp, gm := a.looseGrandparent(abuelo, depth-1), a.looseGrandparent(abuela, depth-1)
		if gp != nil || gm != nil {
			if n == nil {
				n = &PedigreeNode{}
			}
			n.Padre, n.Madre = gp, gm
		}
	}
	return n
}

// looseGrandparent: un abuelo capturado como texto en el hijo puede, a su
// vez, ser un registro (referencia); si lo es, se sigue el enlace.
func (a *App) looseGrandparent(ref string, depth int) *PedigreeNode {
	if strings.TrimSpace(ref) == "" {
		return nil
	}
	if g, ok := a.findAnimalByRef(ref); ok {
		n := nodeFromAnimal(g)
		a.fillParents(n, g, depth)
		return n
	}
	return textNode(ref)
}

// GetPedigree es el binding para la UI: cuatro generaciones.
func (a *App) GetPedigree(animalID string) (*PedigreeNode, error) {
	return a.BuildPedigree(animalID, 4)
}
