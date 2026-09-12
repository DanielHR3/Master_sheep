package main

import (
	"database/sql"
	"fmt"
)

// RanchoPerfil son los datos del rancho que van al pie de la ficha
// genealógica: criador y propietario tal como los pide el certificado UNO.
type RanchoPerfil struct {
	RanchoID                   string `json:"rancho_id"`
	Nombre                     string `json:"nombre"`
	CriadorClave               string `json:"criador_clave"`
	CriadorNombre              string `json:"criador_nombre"`
	CriadorCentro              string `json:"criador_centro"`
	CriadorMunicipioEstado     string `json:"criador_municipio_estado"`
	PropietarioClave           string `json:"propietario_clave"`
	PropietarioNombre          string `json:"propietario_nombre"`
	PropietarioCentro          string `json:"propietario_centro"`
	PropietarioMunicipioEstado string `json:"propietario_municipio_estado"`
	Logo                       string `json:"logo"` // data URL opcional
}

// GetRanchoPerfil devuelve el perfil del rancho actual (vacío si no se ha
// capturado). Cualquier usuario del rancho puede leerlo.
func (a *App) GetRanchoPerfil() (RanchoPerfil, error) {
	if a.user == nil {
		return RanchoPerfil{}, fmt.Errorf("no autenticado")
	}
	p := RanchoPerfil{RanchoID: a.tenantID()}
	err := a.db.QueryRow(a.q(`SELECT COALESCE(nombre,''), COALESCE(criador_clave,''), COALESCE(criador_nombre,''), COALESCE(criador_centro,''), COALESCE(criador_municipio_estado,''),
		COALESCE(propietario_clave,''), COALESCE(propietario_nombre,''), COALESCE(propietario_centro,''), COALESCE(propietario_municipio_estado,''), COALESCE(logo,'')
		FROM rancho_perfil WHERE id = ?`), a.tenantID()).Scan(
		&p.Nombre, &p.CriadorClave, &p.CriadorNombre, &p.CriadorCentro, &p.CriadorMunicipioEstado,
		&p.PropietarioClave, &p.PropietarioNombre, &p.PropietarioCentro, &p.PropietarioMunicipioEstado, &p.Logo)
	if err != nil && err != sql.ErrNoRows {
		return RanchoPerfil{}, err
	}
	return p, nil
}

// SaveRanchoPerfil guarda (upsert) el perfil. Solo Admin/SuperAdmin.
func (a *App) SaveRanchoPerfil(p RanchoPerfil) error {
	if a.user == nil || (a.user.Role != "Admin" && a.user.Role != "SuperAdmin") {
		return fmt.Errorf("no autorizado")
	}
	p.RanchoID = a.tenantID()
	row := ranchoPerfilRow(p)
	_, err := a.db.Exec(a.q(`INSERT INTO rancho_perfil (id, rancho_id, nombre, criador_clave, criador_nombre, criador_centro, criador_municipio_estado,
		propietario_clave, propietario_nombre, propietario_centro, propietario_municipio_estado, logo)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET nombre = excluded.nombre, criador_clave = excluded.criador_clave, criador_nombre = excluded.criador_nombre,
		criador_centro = excluded.criador_centro, criador_municipio_estado = excluded.criador_municipio_estado,
		propietario_clave = excluded.propietario_clave, propietario_nombre = excluded.propietario_nombre,
		propietario_centro = excluded.propietario_centro, propietario_municipio_estado = excluded.propietario_municipio_estado, logo = excluded.logo`),
		p.RanchoID, p.RanchoID, p.Nombre, p.CriadorClave, p.CriadorNombre, p.CriadorCentro, p.CriadorMunicipioEstado,
		p.PropietarioClave, p.PropietarioNombre, p.PropietarioCentro, p.PropietarioMunicipioEstado, p.Logo)
	if err != nil {
		return err
	}
	a.queueSync("update", "rancho_perfil", p.RanchoID, row)
	return nil
}

// ranchoPerfilRow: columnas exactas de la tabla, para el UPSERT en la nube.
func ranchoPerfilRow(p RanchoPerfil) map[string]interface{} {
	return map[string]interface{}{
		"id": p.RanchoID, "rancho_id": p.RanchoID, "nombre": p.Nombre,
		"criador_clave": p.CriadorClave, "criador_nombre": p.CriadorNombre, "criador_centro": p.CriadorCentro, "criador_municipio_estado": p.CriadorMunicipioEstado,
		"propietario_clave": p.PropietarioClave, "propietario_nombre": p.PropietarioNombre, "propietario_centro": p.PropietarioCentro, "propietario_municipio_estado": p.PropietarioMunicipioEstado,
		"logo": p.Logo,
	}
}
