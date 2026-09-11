package main

import (
	"database/sql"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// cacheIdentity guarda (o actualiza) la identidad real de Supabase para uso
// offline. Se llama cada vez que un login contra la nube tiene éxito.
func (a *App) cacheIdentity(user *User, passwordHash string) error {
	_, err := a.db.Exec(a.q(`
		INSERT INTO cached_identity (email, user_id, name, role, rancho_id, password_hash, cached_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(email) DO UPDATE SET
			user_id = excluded.user_id,
			name = excluded.name,
			role = excluded.role,
			rancho_id = excluded.rancho_id,
			password_hash = excluded.password_hash,
			cached_at = excluded.cached_at
	`), user.Email, user.ID, user.Name, user.Role, user.RanchoID, passwordHash, time.Now())
	return err
}

// authenticateOffline valida credenciales contra la última identidad
// cacheada de ese email, usada cuando Supabase no está disponible.
func (a *App) authenticateOffline(email, password string) (*User, error) {
	var user User
	var passwordHash string
	err := a.db.QueryRow(a.q(`
		SELECT user_id, name, role, rancho_id, password_hash
		FROM cached_identity WHERE email = ?
	`), email).Scan(&user.ID, &user.Name, &user.Role, &user.RanchoID, &passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("sin conexión y sin sesión previa guardada para este correo")
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("contraseña incorrecta")
	}
	user.Email = email
	return &user, nil
}
