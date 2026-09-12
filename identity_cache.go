package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// errCloudUserNotFound y errCloudWrongPassword son los únicos dos resultados
// de authenticateCloud que cuentan como un rechazo DEFINITIVO de la nube
// (la nube respondió y dijo "no"). loginDesktop los usa para decidir que NO
// debe caer al caché offline en esos casos — cualquier otro error (uno de
// conexión/transitorio) sí debe caer al caché, porque significa que la nube
// en realidad no pudo dar una respuesta autoritativa.
var (
	errCloudUserNotFound  = errors.New("usuario no encontrado")
	errCloudWrongPassword = errors.New("contraseña incorrecta")
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
	if err != nil {
		return err
	}
	// Reflejar la identidad en la tabla local `users` con el MISMO id que en
	// Supabase: el middleware HTTP (authenticateRequest → loadUserByID) y el
	// modo móvil (celular contra la API del escritorio) resuelven usuarios
	// desde esa tabla, y el escritorio ya no siembra cuentas locales.
	_, err = a.db.Exec(a.q(`
		INSERT INTO users (id, email, password, name, role, rancho_id)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(email) DO UPDATE SET
			id = excluded.id,
			password = excluded.password,
			name = excluded.name,
			role = excluded.role,
			rancho_id = excluded.rancho_id
	`), user.ID, user.Email, passwordHash, user.Name, user.Role, user.RanchoID)
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

// authenticateCloud autentica directo contra Postgres, sin pasar por a.db
// (que en modo escritorio es SQLite). Placeholders en sintaxis Postgres
// porque cloudDB, cuando existe, siempre es Postgres.
func authenticateCloud(db *sql.DB, email, password string) (*User, error) {
	var user User
	var dbPassword string
	err := db.QueryRow(`SELECT id, email, name, role, rancho_id, password FROM users WHERE email = $1`, email).
		Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.RanchoID, &dbPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errCloudUserNotFound
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(password)); err != nil {
		return nil, errCloudWrongPassword
	}
	if user.RanchoID == "" {
		user.RanchoID = user.ID
	}
	return &user, nil
}

// loginDesktop intenta autenticar contra Supabase; si no hay conexión de
// nube configurada o no responde, cae a la identidad cacheada localmente.
// Un rechazo DEFINITIVO de credenciales estando en línea (usuario no
// encontrado o contraseña incorrecta) NO cae al caché — se reporta tal
// cual, porque la nube ya dio una respuesta autoritativa. Cualquier OTRO
// error de authenticateCloud (conexión caída entre el ping y la consulta,
// timeout, etc.) sí cae al caché, porque en ese caso la nube en realidad
// no llegó a responder.
func (a *App) loginDesktop(email, password string) (*User, error) {
	if a.cloudDB != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if pingErr := a.cloudDB.PingContext(ctx); pingErr == nil {
			user, err := authenticateCloud(a.cloudDB, email, password)
			if err == nil {
				hash, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
				if hashErr != nil {
					fmt.Printf("Aviso: no se pudo generar el hash para cachear la identidad de %s: %v\n", email, hashErr)
				} else if cacheErr := a.cacheIdentity(user, string(hash)); cacheErr != nil {
					fmt.Printf("Aviso: no se pudo cachear la identidad de %s tras login en nube: %v\n", email, cacheErr)
				}
				return user, nil
			}
			if errors.Is(err, errCloudUserNotFound) || errors.Is(err, errCloudWrongPassword) {
				return nil, err // rechazo definitivo de credenciales: no caer al caché
			}
			// Error de conexión/transitorio tras un ping exitoso: caer al caché.
		}
	}
	// Sin conexión (o cloudDB nunca configurado): usar la última identidad cacheada.
	return a.authenticateOffline(email, password)
}
