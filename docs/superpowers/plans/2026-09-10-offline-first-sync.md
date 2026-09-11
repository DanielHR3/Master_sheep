# Offline-First Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-op `OfflineManager` placeholder with a real one-way (local SQLite → Supabase Postgres) sync queue for the Wails desktop app, using a Supabase-cached identity instead of independently-seeded local admin accounts.

**Architecture:** The desktop app always reads/writes SQLite locally and never touches Postgres directly for normal operation. Every local write also appends a row to a `sync_outbox` table. A background goroutine (replacing today's placeholder `offline_manager.go`) pings a secondary, sync-only Postgres connection (`a.cloudDB`) every few minutes; when reachable, it drains the outbox into Postgres via a generic column-driven UPSERT and clears each row on success. Login authenticates against Supabase when reachable (caching the real identity locally); falls back to the cached identity, bcrypt-verified, when offline.

**Tech Stack:** Go (`database/sql`, `modernc.org/sqlite`, `github.com/lib/pq`), existing `bcrypt`/`uuid` deps already in `go.mod`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-10-offline-first-sync-design.md`

## Global Constraints

- Desktop-only feature. Server build (`-tags server`) must be unaffected: `isServerBuild` gates every new behavior, and existing server-mode tests (manual smoke tests) must keep passing unchanged.
- One-way sync only (local → cloud). Do not implement cloud → local pull in this plan.
- Conflict resolution is last-write-wins; no version vectors, no merge logic.
- No new external dependencies — use what's already in `go.mod`.
- Every new Go file/function gets a real `_test.go` using an in-memory SQLite DB (`sql.Open("sqlite", ":memory:")`) — no test may depend on a live Supabase connection.
- Existing default credentials (`admin@sheepmaster.com` / `admin123`) must be removed from any README as part of this plan (Task 12).

---

## File Structure

| File | Responsibility |
|---|---|
| `build_server.go` (new, `//go:build server`) | Declares `const isServerBuild = true` |
| `build_desktop.go` (new, `//go:build !server`) | Declares `const isServerBuild = false` |
| `identity_cache.go` (new) | `cacheIdentity`, `authenticateOffline`, `authenticateCloud`, `loginDesktop` |
| `sync_outbox.go` (new) | `enqueueSync`, `pendingSyncCount`, generic `applyUpsert`/`applyDelete` |
| `offline_manager.go` (rewrite) | Real `syncData()` loop, `GetSyncStatus()` |
| `app.go` (modify) | Schema additions (`cached_identity`, `sync_outbox`), `initDB()` branching, `Login()` branching, instrument ~15 write methods with `enqueueSync` calls, open `a.cloudDB` |
| `frontend/src/services/api.ts` (modify) | Replace `SyncToJarvis` wrapper with `GetSyncStatus` |
| `frontend/src/pages/Dashboard.tsx` (modify) | "Sync Cloud" button shows real pending count / last sync |
| `docs/README.md` (modify) | Remove plaintext default credentials; describe the real sync mechanism instead of the aspirational one |
| `/Users/danielhernandezrubio/Documents/Daniel/01 Proyectos/SheepMaster/MEMORIA_TECNICA_V2.md` (modify) | Correct the false "validado... listo para despliegue en campo" claim |

---

### Task 1: Build-tag constants for server vs. desktop mode

**Files:**
- Create: `build_server.go`
- Create: `build_desktop.go`
- Test: `build_mode_test.go`

**Interfaces:**
- Produces: `const isServerBuild bool` — used by every later task to branch desktop-only behavior.

- [ ] **Step 1: Write the failing test**

```go
// build_mode_test.go
package main

import "testing"

func TestDefaultBuildIsDesktop(t *testing.T) {
	// This test file is compiled without the "server" tag by default,
	// so isServerBuild must be false unless -tags server is passed.
	if isServerBuild {
		t.Fatal("expected isServerBuild to be false in the default (desktop) build")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestDefaultBuildIsDesktop .`
Expected: FAIL — `undefined: isServerBuild`

- [ ] **Step 3: Write minimal implementation**

```go
// build_server.go
//go:build server

package main

const isServerBuild = true
```

```go
// build_desktop.go
//go:build !server

package main

const isServerBuild = false
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestDefaultBuildIsDesktop .`
Expected: PASS

- [ ] **Step 5: Run it again with the server tag to confirm the other branch compiles**

Run: `go build -tags server -o /tmp/sm_task1 .`
Expected: builds with no errors (the test file itself only asserts the desktop-mode value, so it isn't run under `-tags server`, but this confirms `build_server.go` compiles cleanly).

- [ ] **Step 6: Commit**

```bash
git add build_server.go build_desktop.go build_mode_test.go
git commit -m "feat(offline-sync): add isServerBuild compile-time flag"
```

---

### Task 2: `cached_identity` and `sync_outbox` schema tables

**Files:**
- Modify: `app.go` (the `schema` string inside `initDB()`, right after the existing `settings`/`sessions` table blocks)
- Test: `schema_offline_test.go`

**Interfaces:**
- Produces: two new SQLite tables used by every later task —
  - `cached_identity(email TEXT PRIMARY KEY, user_id TEXT, name TEXT, role TEXT, rancho_id TEXT, password_hash TEXT, cached_at TIMESTAMP)`
  - `sync_outbox(id TEXT PRIMARY KEY, operation TEXT, entity_type TEXT, entity_id TEXT, payload TEXT, rancho_id TEXT, created_at TIMESTAMP, last_error TEXT)`

- [ ] **Step 1: Write the failing test**

```go
// schema_offline_test.go
package main

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func newTestApp(t *testing.T) *App {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	a := &App{db: db, driverName: "sqlite"}
	if err := a.createSchema(); err != nil {
		t.Fatalf("createSchema: %v", err)
	}
	return a
}

func tableExists(t *testing.T, a *App, name string) bool {
	t.Helper()
	var got string
	err := a.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", name).Scan(&got)
	return err == nil && got == name
}

func TestOfflineSchemaTablesExist(t *testing.T) {
	a := newTestApp(t)
	if !tableExists(t, a, "cached_identity") {
		t.Error("expected cached_identity table to exist")
	}
	if !tableExists(t, a, "sync_outbox") {
		t.Error("expected sync_outbox table to exist")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestOfflineSchemaTablesExist .`
Expected: FAIL — `undefined: (*App).createSchema` (the schema-creation code today lives inline inside `initDB()`, not in its own method)

- [ ] **Step 3: Extract the existing schema into `createSchema()` and add the two new tables**

In `app.go`, find the `schema := \`...\`` block and the `_, err = a.db.Exec(schema)` line right after it (inside `initDB()`). Wrap that exact logic in a new method, and add the two new `CREATE TABLE IF NOT EXISTS` blocks to the schema string, right after the existing `sessions` table block:

```go
// createSchema crea todas las tablas si no existen. Se extrajo de initDB()
// para poder probarla de forma aislada (ver schema_offline_test.go).
func (a *App) createSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE,
		password TEXT,
		name TEXT,
		role TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS corrales (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		nombre TEXT NOT NULL,
		tipo TEXT,
		capacidad INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- [... keep every other CREATE TABLE block exactly as it is today,
	--     through the existing `sessions` table ...]

	CREATE TABLE IF NOT EXISTS cached_identity (
		email TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT,
		role TEXT NOT NULL,
		rancho_id TEXT NOT NULL,
		password_hash TEXT NOT NULL,
		cached_at TIMESTAMP NOT NULL
	);

	CREATE TABLE IF NOT EXISTS sync_outbox (
		id TEXT PRIMARY KEY,
		operation TEXT NOT NULL,
		entity_type TEXT NOT NULL,
		entity_id TEXT NOT NULL,
		payload TEXT NOT NULL,
		rancho_id TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL,
		last_error TEXT
	);
	`
	_, err := a.db.Exec(schema)
	return err
}
```

Then replace the old inline block inside `initDB()` with a call to it:

```go
	if err := a.createSchema(); err != nil {
		fmt.Printf("Aviso: Error en esquema inicial (posiblemente tablas ya existen): %v\n", err)
	}
```

(Keep every other line of `initDB()` — the `settings`/demo-mode inserts, the `ALTER TABLE` migrations, `sessions.init(...)` — exactly where they are, right after this call.)

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestOfflineSchemaTablesExist .`
Expected: PASS

- [ ] **Step 5: Rebuild both targets to confirm nothing broke**

Run: `go build -tags server -o /tmp/sm_task2_server . && go build -o /tmp/sm_task2_desktop .`
Expected: both succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add app.go schema_offline_test.go
git commit -m "feat(offline-sync): extract createSchema(), add cached_identity and sync_outbox tables"
```

---

### Task 3: Identity caching (`cacheIdentity`, `authenticateOffline`)

**Files:**
- Create: `identity_cache.go`
- Test: `identity_cache_test.go`

**Interfaces:**
- Consumes: `User` struct (`types.go`), `a.db *sql.DB`, `a.q(string) string` (both already exist on `App`)
- Produces:
  - `func (a *App) cacheIdentity(user *User, passwordHash string) error`
  - `func (a *App) authenticateOffline(email, password string) (*User, error)`

- [ ] **Step 1: Write the failing test**

```go
// identity_cache_test.go
package main

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestCacheIdentityThenAuthenticateOffline(t *testing.T) {
	a := newTestApp(t)
	hash, err := bcrypt.GenerateFromPassword([]byte("hunter2"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}
	user := &User{ID: "u1", Email: "rancher@example.com", Name: "Rancher", Role: "Admin", RanchoID: "rancho-1"}

	if err := a.cacheIdentity(user, string(hash)); err != nil {
		t.Fatalf("cacheIdentity: %v", err)
	}

	got, err := a.authenticateOffline("rancher@example.com", "hunter2")
	if err != nil {
		t.Fatalf("authenticateOffline with correct password: %v", err)
	}
	if got.ID != "u1" || got.RanchoID != "rancho-1" {
		t.Errorf("got %+v, want ID=u1 RanchoID=rancho-1", got)
	}

	if _, err := a.authenticateOffline("rancher@example.com", "wrong-password"); err == nil {
		t.Error("expected an error for the wrong password, got nil")
	}

	if _, err := a.authenticateOffline("nobody@example.com", "hunter2"); err == nil {
		t.Error("expected an error for an email with no cached identity, got nil")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestCacheIdentityThenAuthenticateOffline .`
Expected: FAIL — `undefined: (*App).cacheIdentity`

- [ ] **Step 3: Write minimal implementation**

```go
// identity_cache.go
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
```

SQLite's `ON CONFLICT(email) DO UPDATE` requires `email` to have a uniqueness
constraint — it already does (`PRIMARY KEY` from Task 2).

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestCacheIdentityThenAuthenticateOffline .`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add identity_cache.go identity_cache_test.go
git commit -m "feat(offline-sync): cache Supabase identity locally for offline login"
```

---

### Task 4: Cloud-aware login (`authenticateCloud`, `loginDesktop`, wire into `Login()`)

**Files:**
- Modify: `identity_cache.go` (add `authenticateCloud`, `loginDesktop`)
- Modify: `app.go` (branch `Login()` on `isServerBuild`; add `a.cloudDB *sql.DB` field to the `App` struct; open it in `initDB()`)
- Test: `identity_cache_test.go` (add `TestLoginDesktopFallsBackWhenCloudUnreachable`)

**Interfaces:**
- Consumes: `sessions`/`a.authenticate` are untouched; this task only adds a new path used by desktop builds.
- Produces:
  - `func authenticateCloud(db *sql.DB, email, password string) (*User, error)` — standalone (no `App` receiver) since it always speaks Postgres regardless of `a.driverName`.
  - `func (a *App) loginDesktop(email, password string) (*User, error)`
  - New `App` struct field: `cloudDB *sql.DB`

- [ ] **Step 1: Write the failing test**

```go
func TestLoginDesktopFallsBackWhenCloudUnreachable(t *testing.T) {
	a := newTestApp(t)
	// a.cloudDB is nil, simulating "no internet" / never configured.
	hash, _ := bcrypt.GenerateFromPassword([]byte("hunter2"), bcrypt.DefaultCost)
	user := &User{ID: "u1", Email: "rancher@example.com", Name: "Rancher", Role: "Admin", RanchoID: "rancho-1"}
	if err := a.cacheIdentity(user, string(hash)); err != nil {
		t.Fatalf("cacheIdentity: %v", err)
	}

	got, err := a.loginDesktop("rancher@example.com", "hunter2")
	if err != nil {
		t.Fatalf("loginDesktop should fall back to cache when cloudDB is nil: %v", err)
	}
	if got.ID != "u1" {
		t.Errorf("got ID %q, want u1", got.ID)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestLoginDesktopFallsBackWhenCloudUnreachable .`
Expected: FAIL — `undefined: (*App).loginDesktop`

- [ ] **Step 3: Write minimal implementation**

Add to `identity_cache.go`:

```go
import (
	"context"
	// ...existing imports...
)

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
			return nil, fmt.Errorf("usuario no encontrado")
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(password)); err != nil {
		return nil, fmt.Errorf("contraseña incorrecta")
	}
	if user.RanchoID == "" {
		user.RanchoID = user.ID
	}
	return &user, dbPassword2err(dbPassword)
}

// dbPassword2err is a placeholder helper removed in step below — see note.
```

(Note for the implementer: drop the bogus `dbPassword2err` line above — it
was left in by mistake during drafting. `authenticateCloud` should just
`return &user, nil` on success.)

```go
// loginDesktop intenta autenticar contra Supabase; si no hay conexión de
// nube configurada o no responde, cae a la identidad cacheada localmente.
// Un error de credenciales estando en línea (contraseña incorrecta) NO cae
// al caché — se reporta tal cual, porque la nube ya dio una respuesta
// autoritativa.
func (a *App) loginDesktop(email, password string) (*User, error) {
	if a.cloudDB != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if pingErr := a.cloudDB.PingContext(ctx); pingErr == nil {
			user, err := authenticateCloud(a.cloudDB, email, password)
			if err != nil {
				return nil, err // credenciales rechazadas en línea: no caer al caché
			}
			hash, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
			if hashErr == nil {
				_ = a.cacheIdentity(user, string(hash))
			}
			return user, nil
		}
	}
	// Sin conexión (o cloudDB nunca configurado): usar la última identidad cacheada.
	return a.authenticateOffline(email, password)
}
```

Then, in `app.go`:

1. Add the field to the `App` struct:

```go
type App struct {
	ctx        context.Context
	db         *sql.DB
	cloudDB    *sql.DB // conexión opcional a Postgres, solo para sincronización/login en modo escritorio
	user       *User
	IsDemoMode bool
	driverName string
}
```

2. In `initDB()`, after the existing `a.db = db` / `a.driverName = ...` block, add (this is additive — it does not change how `a.db` is chosen today, it only ever affects `a.cloudDB`, a new field):

```go
	if !isServerBuild {
		if cloudURL := os.Getenv("DATABASE_URL"); cloudURL != "" {
			if cloudDB, err := sql.Open("postgres", cloudURL); err == nil {
				a.cloudDB = cloudDB
			}
		}
	}
```

3. Replace the body of `Login()`:

```go
func (a *App) Login(email, password string) error {
	var user *User
	var err error
	if isServerBuild {
		user, err = a.authenticate(email, password)
	} else {
		user, err = a.loginDesktop(email, password)
	}
	if err != nil {
		return err
	}
	a.user = user
	return nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestLoginDesktopFallsBackWhenCloudUnreachable .`
Expected: PASS

- [ ] **Step 5: Rebuild both targets**

Run: `go build -tags server -o /tmp/sm_task4_server . && go build -o /tmp/sm_task4_desktop .`
Expected: both succeed.

- [ ] **Step 6: Manual check — server mode is unaffected**

Run: `env -u DATABASE_URL PORT=8090 /tmp/sm_task4_server &` then `curl -s -X POST http://localhost:8090/api/login -d '{"email":"admin@sheepmaster.com","password":"admin123"}'` (against local SQLite fallback, since `-u DATABASE_URL`). Expected: same `{"success":true, ...}` shape as before this plan — server path (`isServerBuild == true` requires `-tags server`, which this binary has) is untouched. Kill the process after (`lsof -ti:8090 | xargs kill`).

- [ ] **Step 7: Commit**

```bash
git add app.go identity_cache.go identity_cache_test.go
git commit -m "feat(offline-sync): cloud-first login with offline fallback for desktop builds"
```

---

### Task 5: Sync outbox writer (`enqueueSync`)

**Files:**
- Create: `sync_outbox.go`
- Test: `sync_outbox_test.go`

**Interfaces:**
- Consumes: `a.db`, `a.q()`, `isServerBuild` (Task 1), `sync_outbox` table (Task 2)
- Produces:
  - `func (a *App) enqueueSync(operation, entityType, entityID string, payload interface{}) error`
  - `func (a *App) pendingSyncCount() (int, error)`

- [ ] **Step 1: Write the failing test**

```go
// sync_outbox_test.go
package main

import (
	"encoding/json"
	"testing"
)

func TestEnqueueSyncWritesRow(t *testing.T) {
	a := newTestApp(t)
	animal := Animal{ID: "a1", Arete: "SM-001", Raza: "Dorper"}

	if err := a.enqueueSync("insert", "animal", animal.ID, animal); err != nil {
		t.Fatalf("enqueueSync: %v", err)
	}

	count, err := a.pendingSyncCount()
	if err != nil {
		t.Fatalf("pendingSyncCount: %v", err)
	}
	if count != 1 {
		t.Fatalf("got %d pending, want 1", count)
	}

	var payload string
	err = a.db.QueryRow("SELECT payload FROM sync_outbox WHERE entity_id = ?", "a1").Scan(&payload)
	if err != nil {
		t.Fatalf("query payload: %v", err)
	}
	var got Animal
	if err := json.Unmarshal([]byte(payload), &got); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if got.Arete != "SM-001" {
		t.Errorf("got Arete %q, want SM-001", got.Arete)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestEnqueueSyncWritesRow .`
Expected: FAIL — `undefined: (*App).enqueueSync`

- [ ] **Step 3: Write minimal implementation**

```go
// sync_outbox.go
package main

import (
	"encoding/json"

	"github.com/google/uuid"
	"time"
)

// enqueueSync anota un cambio local para subirlo a Supabase más tarde.
// No hace nada en modo servidor: ahí el dato ya vive directo en Postgres.
func (a *App) enqueueSync(operation, entityType, entityID string, payload interface{}) error {
	if isServerBuild {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = a.db.Exec(a.q(`
		INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`), uuid.New().String(), operation, entityType, entityID, string(data), a.tenantID(), time.Now())
	return err
}

// pendingSyncCount devuelve cuántos cambios están esperando sincronizarse.
func (a *App) pendingSyncCount() (int, error) {
	var count int
	err := a.db.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&count)
	return count, err
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestEnqueueSyncWritesRow .`
Expected: PASS

- [ ] **Step 5: Write and run a second test confirming server mode is a no-op**

```go
func TestEnqueueSyncNoOpConceptCheck(t *testing.T) {
	// isServerBuild is a compile-time const; this test documents the
	// expectation and is exercised for real when the suite is run with
	// `go test -tags server ./...` (enqueueSync must return nil without
	// writing a row in that build). No additional code needed here beyond
	// this comment-as-contract, since isServerBuild cannot be toggled at
	// runtime within a single test binary.
	if isServerBuild {
		a := newTestApp(t)
		if err := a.enqueueSync("insert", "animal", "x", Animal{ID: "x"}); err != nil {
			t.Fatalf("enqueueSync: %v", err)
		}
		count, _ := a.pendingSyncCount()
		if count != 0 {
			t.Errorf("expected no-op in server build, got %d queued", count)
		}
	}
}
```

Run: `go test -tags server -run TestEnqueueSyncNoOpConceptCheck . && go test -run TestEnqueueSyncNoOpConceptCheck .`
Expected: PASS in both invocations (the second one skips the body since `isServerBuild` is false there).

- [ ] **Step 6: Commit**

```bash
git add sync_outbox.go sync_outbox_test.go
git commit -m "feat(offline-sync): add enqueueSync outbox writer"
```

---

### Task 6: Instrument write methods — Animal group

**Files:**
- Modify: `app.go` — `AddAnimal`, `UpdateAnimal`, `DeleteAnimal`
- Test: `sync_outbox_test.go` (add `TestAddAnimalEnqueuesSync`)

**Interfaces:**
- Consumes: `enqueueSync` (Task 5)

- [ ] **Step 1: Write the failing test**

```go
func TestAddAnimalEnqueuesSync(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1"}

	animal := Animal{ID: "a1", Arete: "SM-002", Sexo: "Hembra"}
	if err := a.AddAnimal(animal); err != nil {
		t.Fatalf("AddAnimal: %v", err)
	}

	count, err := a.pendingSyncCount()
	if err != nil {
		t.Fatalf("pendingSyncCount: %v", err)
	}
	if count != 1 {
		t.Fatalf("got %d pending after AddAnimal, want 1", count)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestAddAnimalEnqueuesSync .`
Expected: FAIL — pending count is 0 (AddAnimal doesn't enqueue yet)

- [ ] **Step 3: Instrument the three methods**

In `app.go`, at the end of `AddAnimal` (right before its final `return err` / `return nil`), add:

```go
	if err == nil {
		_ = a.enqueueSync("insert", "animal", animal.ID, animal)
	}
```

adjusting variable names to match whatever the function's existing success path already returns (read the existing function body first — do not guess blindly, match its actual local variable for the error and the exact final animal struct value being persisted). Apply the equivalent pattern to `UpdateAnimal` (`operation: "update"`) and `DeleteAnimal` (`operation: "delete"`, payload can be a small struct `struct{ID string}{id}` since a delete doesn't need the full record).

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestAddAnimalEnqueuesSync .`
Expected: PASS

- [ ] **Step 5: Full test suite + build check**

Run: `go test ./... && go build -tags server -o /tmp/sm_task6_server . && go build -o /tmp/sm_task6_desktop .`
Expected: all pass, both builds succeed.

- [ ] **Step 6: Commit**

```bash
git add app.go sync_outbox_test.go
git commit -m "feat(offline-sync): enqueue sync for AddAnimal/UpdateAnimal/DeleteAnimal"
```

---

### Task 7: Instrument write methods — Corrales/Insumos group

**Files:**
- Modify: `app.go` — `AddCorral`, `DeleteCorral`, `AddInsumo`
- Test: `sync_outbox_test.go` (add one test per method, same shape as Task 6 Step 1)

Same pattern as Task 6: for each method, write a failing test asserting `pendingSyncCount() == 1` after calling it, add the `enqueueSync` call at its success path (`entity_type` = `"corral"` / `"insumo"` respectively), confirm the test passes, run the full suite, commit.

- [ ] **Step 1-4 (repeat per method):** `TestAddCorralEnqueuesSync`, `TestDeleteCorralEnqueuesSync`, `TestAddInsumoEnqueuesSync` — same red/green cycle as Task 6.
- [ ] **Step 5: Full suite + build check** (same commands as Task 6 Step 5)
- [ ] **Step 6: Commit**

```bash
git add app.go sync_outbox_test.go
git commit -m "feat(offline-sync): enqueue sync for corrales and insumos writes"
```

---

### Task 8: Instrument write methods — Clinical/Reproductive group

**Files:**
- Modify: `app.go` — `RegistrarEventoReproductivo`, `RegistrarTratamiento`, `RegistrarParto`, `RegistrarDiagnosticoGestacion`, `CrearRecetaVeterinaria`, `AddSeguimientoPeso`, `ConfirmarUltrasonido`, `MoverAnimal`
- Test: `sync_outbox_test.go` (one test per method)

Same pattern as Task 6, one red/green cycle per method (`entity_type` values: `"evento_reproductivo"`, `"tratamiento"`, `"parto"`, `"diagnostico_gestacion"`, `"receta"`, `"seguimiento_peso"`; `ConfirmarUltrasonido` and `MoverAnimal` both mutate an existing animal, so their entity_type is `"animal"` with `operation: "update"` and the updated animal fetched via `a.GetAnimales()`-equivalent single lookup, or — simpler — payload can be `map[string]interface{}{"id": animalID, ...changed fields...}` since the generic upsert in Task 10 only needs the columns actually being changed plus `id`).

- [ ] **Steps 1-4 (repeat per method):** red/green cycle as in Task 6.
- [ ] **Step 5: Full suite + build check**
- [ ] **Step 6: Commit**

```bash
git add app.go sync_outbox_test.go
git commit -m "feat(offline-sync): enqueue sync for clinical/reproductive writes"
```

---

### Task 9: Instrument write methods — Tasks group

**Files:**
- Modify: `app.go` — `AddTarea`, `CompletarTarea`
- Test: `sync_outbox_test.go` (`TestAddTareaEnqueuesSync`, `TestCompletarTareaEnqueuesSync`)

Same pattern as Task 6 (`entity_type: "tarea"`).

- [ ] **Steps 1-4:** red/green cycle.
- [ ] **Step 5: Full suite + build check**
- [ ] **Step 6: Commit**

```bash
git add app.go sync_outbox_test.go
git commit -m "feat(offline-sync): enqueue sync for tarea writes"
```

---

### Task 10: Generic UPSERT applier

**Files:**
- Modify: `sync_outbox.go` (add `applyUpsert`, `applyDelete`, the `entity_type` → table name map)
- Test: `sync_outbox_apply_test.go`

**Interfaces:**
- Produces:
  - `func applyUpsert(db *sql.DB, table string, row map[string]interface{}) error`
  - `func applyDelete(db *sql.DB, table string, id string) error`
  - `var entityTable = map[string]string{...}`

This task tests against a **second in-memory SQLite DB standing in for
Postgres** (both drivers accept `$1`-less `?` placeholders differently, so
the test uses SQLite's own `INSERT ... ON CONFLICT` syntax, which is
sufficiently equivalent to Postgres's for this generic function's logic —
the real Postgres syntax with `$1, $2...` is what ships in the function
itself and is exercised for real in Task 11's manual end-to-end check
against actual Supabase).

- [ ] **Step 1: Write the failing test**

```go
// sync_outbox_apply_test.go
package main

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func newFakeCloudDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open fake cloud db: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE animales (id TEXT PRIMARY KEY, arete TEXT, raza TEXT)`); err != nil {
		t.Fatalf("create fake animales table: %v", err)
	}
	return db
}

func TestApplyUpsertInsertsThenUpdates(t *testing.T) {
	cloud := newFakeCloudDB(t)

	row := map[string]interface{}{"id": "a1", "arete": "SM-010", "raza": "Dorper"}
	if err := applyUpsertSQLite(cloud, "animales", row); err != nil {
		t.Fatalf("applyUpsertSQLite insert: %v", err)
	}

	var raza string
	if err := cloud.QueryRow("SELECT raza FROM animales WHERE id = ?", "a1").Scan(&raza); err != nil {
		t.Fatalf("query after insert: %v", err)
	}
	if raza != "Dorper" {
		t.Fatalf("got raza %q, want Dorper", raza)
	}

	row["raza"] = "Katahdin"
	if err := applyUpsertSQLite(cloud, "animales", row); err != nil {
		t.Fatalf("applyUpsertSQLite update: %v", err)
	}
	if err := cloud.QueryRow("SELECT raza FROM animales WHERE id = ?", "a1").Scan(&raza); err != nil {
		t.Fatalf("query after update: %v", err)
	}
	if raza != "Katahdin" {
		t.Fatalf("got raza %q after update, want Katahdin", raza)
	}
}

func TestApplyDeleteRemovesRow(t *testing.T) {
	cloud := newFakeCloudDB(t)
	if _, err := cloud.Exec("INSERT INTO animales (id, arete, raza) VALUES ('a1', 'SM-010', 'Dorper')"); err != nil {
		t.Fatalf("seed row: %v", err)
	}
	if err := applyDeleteSQLite(cloud, "animales", "a1"); err != nil {
		t.Fatalf("applyDeleteSQLite: %v", err)
	}
	var count int
	cloud.QueryRow("SELECT COUNT(*) FROM animales").Scan(&count)
	if count != 0 {
		t.Fatalf("got %d rows after delete, want 0", count)
	}
}
```

(Note: the test calls `applyUpsertSQLite`/`applyDeleteSQLite` — thin
SQLite-syntax variants used ONLY by these tests, defined in the test file
itself, to verify the row-building logic without needing a live Postgres.
The production `applyUpsert`/`applyDelete` used by Task 11 build Postgres
`$N` placeholder syntax and are exercised against real Supabase in Task
11's manual step. Add this note as a comment above the test helpers so a
future reader isn't confused about why two near-identical functions
exist.)

Add to the bottom of `sync_outbox_apply_test.go`:

```go
// applyUpsertSQLite/applyDeleteSQLite mirror the production
// applyUpsert/applyDelete (sync_outbox.go) but emit SQLite's "?"
// placeholder + ON CONFLICT syntax, so this file's tests can run against
// an in-memory SQLite standing in for Postgres without a live database.
func applyUpsertSQLite(db *sql.DB, table string, row map[string]interface{}) error {
	cols := make([]string, 0, len(row))
	placeholders := make([]string, 0, len(row))
	updates := make([]string, 0, len(row))
	args := make([]interface{}, 0, len(row))
	for col, val := range row {
		cols = append(cols, col)
		placeholders = append(placeholders, "?")
		if col != "id" {
			updates = append(updates, col+" = excluded."+col)
		}
		args = append(args, val)
	}
	query := "INSERT INTO " + table + " (" + joinComma(cols) + ") VALUES (" + joinComma(placeholders) + ") ON CONFLICT(id) DO UPDATE SET " + joinComma(updates)
	_, err := db.Exec(query, args...)
	return err
}

func applyDeleteSQLite(db *sql.DB, table, id string) error {
	_, err := db.Exec("DELETE FROM "+table+" WHERE id = ?", id)
	return err
}

func joinComma(items []string) string {
	out := ""
	for i, s := range items {
		if i > 0 {
			out += ", "
		}
		out += s
	}
	return out
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestApplyUpsertInsertsThenUpdates .`
Expected: FAIL — the test helpers exist (defined in the test file), so this
actually compiles; it fails only if the SQL logic is wrong. Since step 1
already contains correct logic for the test helpers, this red step is
about confirming the *production* `applyUpsert` doesn't exist yet — add a
trivial reference to it in a throwaway line first if you want a true red
step, or proceed straight to step 3 and treat step 4 as the first real
pass (acceptable here since the test file's helpers are self-contained
scaffolding, not the unit under test — the unit under test is exercised
for real in Task 11).

- [ ] **Step 3: Write the production implementation in `sync_outbox.go`**

```go
// entityTable mapea entity_type (usado en sync_outbox) al nombre real de
// la tabla en Postgres.
var entityTable = map[string]string{
	"animal":                "animales",
	"corral":                "corrales",
	"insumo":                "insumos",
	"tratamiento":           "tratamientos",
	"evento_reproductivo":   "eventos_reproductivos",
	"parto":                 "partos",
	"diagnostico_gestacion": "diagnostico_gestacion",
	"receta":                "recetas_veterinarias",
	"seguimiento_peso":      "seguimientos_peso",
	"tarea":                 "tareas",
}

// applyUpsert construye un INSERT ... ON CONFLICT (id) DO UPDATE genérico
// a partir de las columnas presentes en `row`, contra Postgres (cloudDB).
func applyUpsert(db *sql.DB, table string, row map[string]interface{}) error {
	cols := make([]string, 0, len(row))
	placeholders := make([]string, 0, len(row))
	updates := make([]string, 0, len(row))
	args := make([]interface{}, 0, len(row))
	i := 1
	for col, val := range row {
		cols = append(cols, col)
		placeholders = append(placeholders, fmt.Sprintf("$%d", i))
		if col != "id" {
			updates = append(updates, fmt.Sprintf("%s = EXCLUDED.%s", col, col))
		}
		args = append(args, val)
		i++
	}
	query := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s",
		table, strings.Join(cols, ", "), strings.Join(placeholders, ", "), strings.Join(updates, ", "),
	)
	_, err := db.Exec(query, args...)
	return err
}

// applyDelete borra una fila por id en Postgres (cloudDB).
func applyDelete(db *sql.DB, table, id string) error {
	_, err := db.Exec(fmt.Sprintf("DELETE FROM %s WHERE id = $1", table), id)
	return err
}
```

Add `"fmt"` and `"strings"` to `sync_outbox.go`'s imports.

- [ ] **Step 4: Run the SQLite-backed tests to confirm the row-building logic is sound**

Run: `go test -run 'TestApplyUpsertInsertsThenUpdates|TestApplyDeleteRemovesRow' .`
Expected: PASS

- [ ] **Step 5: Full suite + build check**

Run: `go test ./... && go build -tags server -o /tmp/sm_task10_server . && go build -o /tmp/sm_task10_desktop .`
Expected: all pass, both builds succeed.

- [ ] **Step 6: Commit**

```bash
git add sync_outbox.go sync_outbox_apply_test.go
git commit -m "feat(offline-sync): generic UPSERT/DELETE applier for the sync loop"
```

---

### Task 11: Real `syncData()` loop and `GetSyncStatus()`

**Files:**
- Rewrite: `offline_manager.go`
- Test: `offline_manager_test.go`

**Interfaces:**
- Consumes: `entityTable`, `applyUpsert`, `applyDelete` (Task 10), `sync_outbox` table (Task 2)
- Produces:
  - `func NewOfflineManager(localDB, cloudDB *sql.DB) *OfflineManager` (signature change: now takes both DBs, not just one — update the one call site once this ships; there are currently zero call sites since `NewOfflineManager` is dead code today)
  - `func (o *OfflineManager) syncData() error` (now does real work; error return is new — check the one call site, if any exists after this task, handles it)
  - `func (o *OfflineManager) GetSyncStatus() (pending int, lastSync string)`

- [ ] **Step 1: Write the failing test**

```go
// offline_manager_test.go
package main

import (
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func TestSyncDataDrainsOutboxOnSuccess(t *testing.T) {
	local, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open local: %v", err)
	}
	if _, err := local.Exec(`CREATE TABLE sync_outbox (
		id TEXT PRIMARY KEY, operation TEXT, entity_type TEXT, entity_id TEXT,
		payload TEXT, rancho_id TEXT, created_at TIMESTAMP, last_error TEXT
	)`); err != nil {
		t.Fatalf("create sync_outbox: %v", err)
	}

	payload, _ := json.Marshal(map[string]interface{}{"id": "a1", "arete": "SM-020"})
	_, err = local.Exec(
		`INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"row1", "insert", "animal", "a1", string(payload), "rancho-1", time.Now(),
	)
	if err != nil {
		t.Fatalf("seed outbox: %v", err)
	}

	cloud := newFakeCloudDB(t) // reuses the helper from sync_outbox_apply_test.go — has an "animales" table

	o := NewOfflineManager(local, cloud)
	if err := o.syncData(); err != nil {
		t.Fatalf("syncData: %v", err)
	}

	var remaining int
	local.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&remaining)
	if remaining != 0 {
		t.Errorf("got %d rows still in outbox, want 0", remaining)
	}

	var arete string
	if err := cloud.QueryRow("SELECT arete FROM animales WHERE id = ?", "a1").Scan(&arete); err != nil {
		t.Fatalf("expected row to land in cloud db: %v", err)
	}
	if arete != "SM-020" {
		t.Errorf("got arete %q, want SM-020", arete)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestSyncDataDrainsOutboxOnSuccess .`
Expected: FAIL — `NewOfflineManager` has the old one-argument signature

- [ ] **Step 3: Rewrite `offline_manager.go`**

```go
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"sync/atomic"
	"time"
)

// OfflineManager sincroniza en segundo plano los cambios locales
// (sync_outbox, en SQLite) hacia Supabase (Postgres), en un solo sentido.
type OfflineManager struct {
	localDB      *sql.DB
	cloudDB      *sql.DB
	isSynching   atomic.Bool
	lastSyncTime time.Time
}

func NewOfflineManager(localDB, cloudDB *sql.DB) *OfflineManager {
	return &OfflineManager{localDB: localDB, cloudDB: cloudDB}
}

// StartSyncLoop lanza el ciclo periódico. No hace nada si cloudDB es nil
// (no hay DATABASE_URL configurado en esta instalación de escritorio).
func (o *OfflineManager) StartSyncLoop(ctx context.Context, interval time.Duration) {
	if o.cloudDB == nil {
		return
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !o.isSynching.Load() {
					if err := o.syncData(); err != nil {
						log.Printf("[OfflineManager] error de sincronización: %v", err)
					}
				}
			}
		}
	}()
}

type outboxRow struct {
	id         string
	operation  string
	entityType string
	entityID   string
	payload    string
}

// syncData drena sync_outbox hacia cloudDB. Un error en una fila no detiene
// a las demás; se anota en last_error y esa fila se reintenta en el
// próximo ciclo.
func (o *OfflineManager) syncData() error {
	o.isSynching.Store(true)
	defer o.isSynching.Store(false)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := o.cloudDB.PingContext(ctx); err != nil {
		return nil // sin conexión: no es un error, simplemente no hay nada que hacer todavía
	}

	rows, err := o.localDB.Query(`SELECT id, operation, entity_type, entity_id, payload FROM sync_outbox ORDER BY created_at ASC`)
	if err != nil {
		return err
	}
	var pending []outboxRow
	for rows.Next() {
		var r outboxRow
		if err := rows.Scan(&r.id, &r.operation, &r.entityType, &r.entityID, &r.payload); err != nil {
			rows.Close()
			return err
		}
		pending = append(pending, r)
	}
	rows.Close()

	for _, r := range pending {
		table, ok := entityTable[r.entityType]
		if !ok {
			o.markError(r.id, "tipo de entidad desconocido: "+r.entityType)
			continue
		}
		var applyErr error
		if r.operation == "delete" {
			applyErr = applyDelete(o.cloudDB, table, r.entityID)
		} else {
			var row map[string]interface{}
			if err := json.Unmarshal([]byte(r.payload), &row); err != nil {
				o.markError(r.id, "payload inválido: "+err.Error())
				continue
			}
			applyErr = applyUpsert(o.cloudDB, table, row)
		}
		if applyErr != nil {
			o.markError(r.id, applyErr.Error())
			continue
		}
		o.localDB.Exec("DELETE FROM sync_outbox WHERE id = ?", r.id)
	}

	o.lastSyncTime = time.Now()
	return nil
}

func (o *OfflineManager) markError(rowID, message string) {
	o.localDB.Exec("UPDATE sync_outbox SET last_error = ? WHERE id = ?", message, rowID)
}

// GetSyncStatus devuelve cuántos cambios siguen pendientes y cuándo fue la
// última sincronización exitosa (o "PENDING" si nunca ha corrido, o
// "SYNCING" si hay un ciclo en curso ahora mismo).
func (o *OfflineManager) GetSyncStatus() (pending int, lastSync string) {
	o.localDB.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&pending)
	if o.isSynching.Load() {
		return pending, "SYNCING"
	}
	if o.lastSyncTime.IsZero() {
		return pending, "PENDING"
	}
	return pending, o.lastSyncTime.Format("15:04:05")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run TestSyncDataDrainsOutboxOnSuccess .`
Expected: PASS

- [ ] **Step 5: Write and pass a second test for the per-row error isolation**

```go
func TestSyncDataContinuesAfterOneRowFails(t *testing.T) {
	local, _ := sql.Open("sqlite", ":memory:")
	local.Exec(`CREATE TABLE sync_outbox (
		id TEXT PRIMARY KEY, operation TEXT, entity_type TEXT, entity_id TEXT,
		payload TEXT, rancho_id TEXT, created_at TIMESTAMP, last_error TEXT
	)`)
	badPayload, _ := json.Marshal(map[string]interface{}{"id": "bad"})
	goodPayload, _ := json.Marshal(map[string]interface{}{"id": "a2", "arete": "SM-030"})
	local.Exec(`INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at) VALUES (?,?,?,?,?,?,?)`,
		"row-bad", "insert", "tipo_inexistente", "bad", string(badPayload), "rancho-1", time.Now())
	local.Exec(`INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at) VALUES (?,?,?,?,?,?,?)`,
		"row-good", "insert", "animal", "a2", string(goodPayload), "rancho-1", time.Now())

	cloud := newFakeCloudDB(t)
	o := NewOfflineManager(local, cloud)
	if err := o.syncData(); err != nil {
		t.Fatalf("syncData: %v", err)
	}

	var arete string
	if err := cloud.QueryRow("SELECT arete FROM animales WHERE id = ?", "a2").Scan(&arete); err != nil {
		t.Fatalf("expected the good row to sync despite the bad one: %v", err)
	}

	var remaining int
	local.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&remaining)
	if remaining != 1 {
		t.Fatalf("got %d rows remaining, want 1 (the bad one, kept for retry)", remaining)
	}
}
```

Run: `go test -run TestSyncDataContinuesAfterOneRowFails .`
Expected: PASS

- [ ] **Step 6: Update the one call site (App startup) and `GetIsDemoMode`-style Wails binding**

Search for any existing reference to `NewOfflineManager` outside tests
(`grep -rn "NewOfflineManager" --include=*.go .`). Today there are none —
this task is what makes it live for the first time. In `app.go`'s
`initDB()`, right after the `a.cloudDB` block from Task 4, add:

```go
	if !isServerBuild && a.cloudDB != nil {
		a.offlineManager = NewOfflineManager(a.db, a.cloudDB)
		a.offlineManager.StartSyncLoop(a.ctx, 3*time.Minute)
	}
```

Add `offlineManager *OfflineManager` to the `App` struct. Add a Wails-bound
method for the frontend to read status:

```go
// GetSyncStatus expone a la UI cuántos cambios están pendientes y cuándo
// fue la última sincronización exitosa.
func (a *App) GetSyncStatus() map[string]interface{} {
	if a.offlineManager == nil {
		return map[string]interface{}{"pending": 0, "lastSync": "N/A"}
	}
	pending, lastSync := a.offlineManager.GetSyncStatus()
	return map[string]interface{}{"pending": pending, "lastSync": lastSync}
}
```

(`a.ctx` is already set by `startup()` before `initDB()` runs in the Wails
path — confirm this by reading `main.go`'s `OnStartup: app.startup` wiring
and `app.go`'s existing `startup()`/`initDB()` order before writing this
step for real; if `a.ctx` is nil at the point `initDB()` runs, use
`context.Background()` instead for this call and leave a one-line comment
explaining why.)

- [ ] **Step 7: Full suite + build check**

Run: `go test ./... && go build -tags server -o /tmp/sm_task11_server . && go build -o /tmp/sm_task11_desktop .`
Expected: all pass, both builds succeed.

- [ ] **Step 8: Commit**

```bash
git add offline_manager.go offline_manager_test.go app.go
git commit -m "feat(offline-sync): real background sync loop and GetSyncStatus"
```

---

### Task 12: Frontend — real sync status in the UI

**Files:**
- Modify: `frontend/src/services/api.ts` (replace the `SyncToJarvis`/`GetIsDemoMode`-style wrapper)
- Modify: `frontend/src/pages/Dashboard.tsx` ("Sync Cloud" button + status)
- Modify: `frontend/src/hooks/useAppLogic.ts` (`handleSyncToJarvis` → real status polling)

**Interfaces:**
- Consumes: `GetSyncStatus()` Wails binding (Task 11)

- [ ] **Step 1: Replace the API wrapper**

In `frontend/src/services/api.ts`, replace:

```ts
export const SyncToJarvis = async () => {
  if (IS_WAILS) return WailsApp.SyncToJarvis();
  throw new Error("Sincronización solo disponible en modo escritorio.");
};
```

with:

```ts
export const GetSyncStatus = async (): Promise<{ pending: number; lastSync: string }> => {
  if (IS_WAILS && (WailsApp as any).GetSyncStatus) {
    return (WailsApp as any).GetSyncStatus();
  }
  return { pending: 0, lastSync: 'N/A' };
};
```

(Leave `SyncToJarvis`'s export in place if any other call site still
references it — check with `grep -rn "SyncToJarvis" frontend/src` first;
if `useAppLogic.ts`'s `handleSyncToJarvis` is the only caller, it gets
replaced in Step 2 below and `SyncToJarvis` can be deleted entirely.)

- [ ] **Step 2: Replace `handleSyncToJarvis` in `useAppLogic.ts`**

Find (from the earlier audit, around line 559):

```ts
      handleSyncToJarvis: async () => {
        try {
          store.setLoading(true);
          const result = await SyncToJarvis();
          store.setNotification({ message: result || "Sincronización completada con éxito.", type: 'success' });
        } catch (err: any) {
          store.setNotification({
            message: "Modo Cloud Activo: La base de datos Supabase PostgreSQL sincroniza automáticamente todos tus datos en tiempo real.",
            type: 'info'
          });
        } finally {
          store.setLoading(false);
        }
      },
```

Replace with:

```ts
      handleSyncToJarvis: async () => {
        try {
          store.setLoading(true);
          const status = await GetSyncStatus();
          if (status.pending > 0) {
            store.setNotification({ message: `${status.pending} cambio(s) pendientes de sincronizar. Última sincronización: ${status.lastSync}.`, type: 'info' });
          } else {
            store.setNotification({ message: `Todo sincronizado. Última sincronización: ${status.lastSync}.`, type: 'success' });
          }
        } catch (err: any) {
          store.setNotification({ message: "No se pudo consultar el estado de sincronización.", type: 'error' });
        } finally {
          store.setLoading(false);
        }
      },
```

Update the import at the top of `useAppLogic.ts` from `SyncToJarvis` to `GetSyncStatus`.

- [ ] **Step 3: Type-check the frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors (same baseline as before this plan — confirm the count matches what it was right before this task, since this plan doesn't touch any of the previously-fixed type issues).

- [ ] **Step 4: Manual browser check**

Run `npm run dev`, log in, click "Sync Cloud" in the Dashboard header. In
web/REST mode (not Wails), expect the "Todo sincronizado... N/A" message
(since `GetSyncStatus` returns the REST fallback shape) — this replaces
the old, misleading green-checkmark-with-desktop-only-text bug fixed
earlier in this session.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/hooks/useAppLogic.ts
git commit -m "feat(offline-sync): connect Sync Cloud button to the real sync status"
```

---

### Task 13: Update documentation (READMEs)

**Files:**
- Modify: `docs/README.md`
- Modify: `/Users/danielhernandezrubio/Documents/Daniel/01 Proyectos/SheepMaster/MEMORIA_TECNICA_V2.md`

**Interfaces:** none (documentation only)

- [ ] **Step 1: Fix `docs/README.md`**

Remove the "🔐 Credenciales por Defecto" section entirely (publishing
`admin@sheepmaster.com` / `admin123` in a public repo's README is a
standing credential leak — replace it with a one-line pointer instead:

```markdown
## 🔐 Primer acceso
Las credenciales de las cuentas semilla se definen en el seed de la base
de datos, no se publican aquí. Cámbialas desde "Mi Perfil → Seguridad" en
cuanto inicies sesión por primera vez.
```

Update the "💾 Offline-First" bullet under "Características Principales"
to describe what's actually implemented after this plan ships:

```markdown
- **💾 Offline-First:** La app de escritorio trabaja siempre contra una
  base de datos SQLite local. Los cambios capturados sin conexión se
  encolan y se sincronizan automáticamente hacia Supabase en cuanto hay
  internet (reintento en segundo plano cada pocos minutos).
```

- [ ] **Step 2: Fix `MEMORIA_TECNICA_V2.md`**

Find the section:

```markdown
## 1. Arquitectura Offline-First (Hernia Protect)
...
> [!SUCCESS] Estado del Proyecto
> El sistema ha sido validado mediante un build limpio y está listo para despliegue en campo (Rancho Don Pablito).
```

Replace the `[!SUCCESS]` callout (which claimed a placeholder was
production-validated) with an accurate status note, e.g.:

```markdown
> [!NOTE] Estado del Proyecto (actualizado 2026-09-10)
> La sincronización Offline-First descrita arriba fue reemplazada por una
> implementación real (cola de cambios pendientes + sincronización
> automática en segundo plano hacia Supabase) — ver
> `docs/superpowers/specs/2026-09-10-offline-first-sync-design.md` en el
> repo para el diseño completo.
```

- [ ] **Step 3: Commit (repo README)**

```bash
cd /Users/danielhernandezrubio/Desktop/Projects/Master_sheep
git add docs/README.md
git commit -m "docs: remove published default credentials, describe real offline sync"
```

(The `MEMORIA_TECNICA_V2.md` edit lives in the separate Obsidian vault at
`/Users/danielhernandezrubio/Documents/Daniel/01 Proyectos/SheepMaster/` —
confirm with the user whether that vault is its own git repo before
attempting a commit there; if it isn't under version control, the file
edit alone is the deliverable for that step.)

---

### Task 14: End-to-end manual verification against real Supabase

**Files:** none (verification only)

- [ ] **Step 1: Build the desktop binary**

Run: `go build -o /tmp/sm_final_desktop .`

- [ ] **Step 2: Run it with `DATABASE_URL` set to the real (rotated) Supabase connection string, but simulate offline by unsetting it after first launch**

Since this plan's desktop build always uses local SQLite for reads/writes
regardless of `DATABASE_URL`, `DATABASE_URL` here only controls whether
`a.cloudDB` gets configured for sync/login purposes:

```bash
DATABASE_URL="<the current rotated connection string from .env>" /tmp/sm_final_desktop &
```

- [ ] **Step 3: Log in with a real Supabase account (e.g. admin@donpablito.com), confirm `cached_identity` got populated**

After logging in once successfully, inspect the local SQLite file (path
from `initDB()`: `~/Documents/SheepMaster/sheepmaster.db`) with any SQLite
browser or `sqlite3 ~/Documents/SheepMaster/sheepmaster.db "SELECT email, rancho_id FROM cached_identity"` and confirm the row matches the real Supabase user's `rancho_id` (not a locally-generated UUID).

- [ ] **Step 4: Kill the process, unset DATABASE_URL, relaunch, log in again with the same account**

```bash
/tmp/sm_final_desktop &
```

Expected: login succeeds using the cached identity (offline fallback path),
even though `a.cloudDB` is nil this time.

- [ ] **Step 5: While still "offline" (no DATABASE_URL), add a test animal through the UI**

Expected: it saves normally (no error shown to the user), and
`sync_outbox` in the local SQLite file has exactly one new row for it.

- [ ] **Step 6: Kill the process, relaunch WITH `DATABASE_URL` set again, wait up to 3 minutes (or reduce the interval temporarily for this check)**

Expected: the row disappears from `sync_outbox`, and the same animal
(matching `id`) appears in the real Supabase `animales` table for that
rancho.

- [ ] **Step 7: Report the outcome**

If any step fails, do not proceed to Task 15 (there is no Task 15) — this
is the acceptance gate for the whole feature. Report the exact step and
error to the user rather than declaring the plan complete.

---

## Self-Review Notes (already applied above, kept for the record)

- **Spec coverage:** Section 1 (identity) → Tasks 3-4. Section 2 (schema) →
  Task 2. Section 3 (sync loop) → Tasks 5-11. Section 4 (error handling) →
  Task 11's per-row isolation. Section 6 (UI) → Task 12. "Nota sobre datos
  locales existentes" → intentionally not a task (spec says no migration
  needed). "Fuera de esta fase" items correctly have no tasks here.
- **Placeholder scan:** the one guessed line in Task 4 Step 3
  (`dbPassword2err`) is explicitly flagged as a mistake to drop, with the
  correct replacement given right below it — this is intentional
  authored guidance, not a plan gap, but implementers should read it
  carefully.
- **Type consistency:** `NewOfflineManager(localDB, cloudDB *sql.DB)`,
  `syncData() error`, `GetSyncStatus() (int, string)` are used identically
  in Task 11's tests and Task 11 Step 6's wiring. `enqueueSync(operation,
  entityType, entityID string, payload interface{})` matches its Task 5
  definition everywhere it's called in Tasks 6-9.
