# Ficha Genealógica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario de pie de cría capture los datos del certificado UNO de sus animales (encabezado + ancestros como animales de referencia enlazados) y genere, para cualquier borrego, una ficha genealógica PDF de cuatro generaciones con la marca del rancho.

**Architecture:** Nueve columnas nuevas en `animales` más la bandera `es_referencia`; el árbol se resuelve en Go siguiendo `padre_id`/`madre_id` (por id o arete) hasta cuatro generaciones, con respaldo a los campos `abuelo_*` cuando el padre es texto suelto. Tabla `rancho_perfil` para el pie. PDF con `go-pdf/fpdf` (Go puro) entregado por diálogo nativo en escritorio y por HTTP en web. Frontend: campos en los modales, árbol de cuatro generaciones editable (nodos "Agregar" crean referencias), botón Ficha PDF, pestaña Referencias, formulario Datos del rancho en Mi Perfil.

**Tech Stack:** Go 1.26, SQLite/Postgres vía `a.q()`, `github.com/go-pdf/fpdf` v0.9.0 (única dependencia nueva), React 18 + TypeScript + Tailwind v4, Playwright para verificación manual.

**Spec:** `docs/superpowers/specs/2026-09-12-ficha-genealogica-design.md`

## Global Constraints

- Única dependencia nueva: `github.com/go-pdf/fpdf` v0.9.0.
- Toda función Go nueva tiene prueba con SQLite en memoria (`newTestApp`/`newLoggedInTestApp`) y `httptest`; ninguna prueba toca red ni disco fuera de `t.TempDir()`.
- Los animales de referencia (`es_referencia = 1`) no aparecen en `GetAnimales()` ni en estadísticas; solo en `GetAnimalesReferencia()` y en el árbol.
- El PDF nunca lleva logotipo, sello ni firmas de la UNO; lleva la leyenda "Documento interno del rancho. No sustituye el certificado de registro de la UNO."
- Cada tarea termina con `go test ./... && go vet . && go build -tags server -o /tmp/fg_server . && go build -o /tmp/fg_desktop .` (Go) o `cd frontend && npx tsc --noEmit && npm run build` (frontend) en verde, y un commit.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `types.go` (modificar) | Campos nuevos en `Animal`; tipos `PedigreeNode`, `RanchoPerfil` |
| `app.go` (modificar) | Schema/migraciones, `AddAnimal`/`UpdateAnimal`/`GetAnimales` con columnas nuevas y filtro de referencias, `animalRow` |
| `pedigree.go` (nuevo) | `GetAnimalesReferencia`, `findAnimalByRef`, `BuildPedigree(id, depth)`, `GetPedigree` (Wails) |
| `rancho_perfil.go` (nuevo) | Tabla, `GetRanchoPerfil`, `SaveRanchoPerfil`, sync |
| `ficha_pdf.go` (nuevo) | `renderFichaPDF(FichaData) ([]byte, error)`, `ExportFichaGenealogica` (desktop, `//go:build !server` en `ficha_desktop.go`), `handleFichaPDF` (HTTP) |
| `ficha_assets.go` (nuevo) | `//go:embed` de los escudos de los ranchos para el PDF |
| `import_template.go`, `app.go:processExcel` (modificar) | Columnas nuevas + `Referencia` |
| `pedigree_test.go`, `rancho_perfil_test.go`, `ficha_pdf_test.go`, `genetics_test.go` (nuevos/modificar) | Pruebas |
| `frontend/wailsjs/go/models.ts`, `App.d.ts`, `App.js` (modificar) | Modelo y bindings |
| `frontend/src/services/api.ts` (modificar) | `GetPedigree`, `GetAnimalesReferencia`, `GetRanchoPerfil`, `SaveRanchoPerfil`, `DownloadFicha` |
| `frontend/src/components/modals/AddAnimalModal.tsx`, `EditAnimalModal.tsx` (modificar) | Campos del certificado |
| `frontend/src/components/modals/GenealogyModal.tsx` (reescribir) | Árbol de 4 generaciones desde `GetPedigree`, nodos Agregar/Editar, botón Ficha PDF |
| `frontend/src/components/modals/ReferenceAnimalModal.tsx` (nuevo) | Formulario corto de animal de referencia |
| `frontend/src/pages/Inventory.tsx` (modificar) | Pestaña Referencias |
| `frontend/src/pages/Profile.tsx` (modificar) | Datos del rancho (Admin) |
| `frontend/src/hooks/useAppLogic.ts`, `App.tsx` (modificar) | Estado y handlers |

---

### Task 1: Columnas del certificado en `animales`

**Files:** `types.go`, `app.go`, `genetics_test.go`

**Produces:** campos `Animal.EsReferencia bool (json es_referencia)`, `Nombre`, `TatuajeDer`, `TatuajeIzq`, `TatuajeCola`, `Color`, `Pureza float64`, `GradoRegistro`, `Registro`, `Siniiga`, `IDElectronica` (json snake_case: `nombre`, `tatuaje_der`, `tatuaje_izq`, `tatuaje_cola`, `color`, `pureza`, `grado_registro`, `registro`, `siniiga`, `id_electronica`).

- [ ] Prueba `TestAnimalCertificateFieldsRoundTrip`: `AddAnimal` con todos los campos → `GetAnimales` los devuelve; `UpdateAnimal` cambia `Registro`; el payload de sync (`outboxPayload`) trae `registro` y `pureza`.
- [ ] Prueba `TestReferenceAnimalsHiddenFromInventory`: `AddAnimal(EsReferencia: true)` no sale en `GetAnimales`.
- [ ] Implementación: columnas en `createSchema` + `runMigrations` (`ALTER TABLE animales ADD COLUMN es_referencia INTEGER DEFAULT 0`, etc.), INSERT/UPDATE/SELECT/`animalRow`; `GetAnimales` agrega `AND COALESCE(es_referencia, 0) = 0`.
- [ ] Suite + builds + commit `feat(genetics): certificate fields on animals, reference-animal flag`.

### Task 2: Árbol por enlaces (`pedigree.go`)

**Produces:**
```go
type PedigreeNode struct {
    ID, Arete, Nombre, Registro, GradoRegistro, Raza string
    Pureza float64; Sexo, Foto string
    EsReferencia, Existe bool         // Existe=false: nodo de solo texto o vacío
    Padre, Madre *PedigreeNode
}
func (a *App) GetAnimalesReferencia() ([]Animal, error)
func (a *App) findAnimalByRef(ref string) (*Animal, bool)   // por id o arete, del tenant, incluye referencias
func (a *App) BuildPedigree(animalID string, depth int) (*PedigreeNode, error)
func (a *App) GetPedigree(animalID string) (*PedigreeNode, error) // depth 4, Wails
```
- [ ] Pruebas: cadena enlazada de 4 generaciones se resuelve completa; padre como texto suelto produce nodo `Existe=false` con `Arete` = texto y abuelos tomados de `abuelo_*`; ciclo (animal que se apunta a sí mismo) no cuelga (corta por profundidad); `GetAnimalesReferencia` devuelve solo referencias.
- [ ] Implementación recursiva con `depth` decreciente; `getAnimalByID` lee todas las columnas (extraer `scanAnimal(rows)` compartido con `GetAnimales`).
- [ ] Suite + builds + commit `feat(genetics): pedigree resolver over parent links`.

### Task 3: Perfil del rancho (`rancho_perfil.go`)

**Produces:**
```go
type RanchoPerfil struct { RanchoID, Nombre, CriadorClave, CriadorNombre, CriadorCentro, CriadorMunicipioEstado,
    PropietarioClave, PropietarioNombre, PropietarioCentro, PropietarioMunicipioEstado, Logo string } // json snake_case
func (a *App) GetRanchoPerfil() (RanchoPerfil, error)   // vacío con RanchoID si no existe
func (a *App) SaveRanchoPerfil(p RanchoPerfil) error    // solo Admin/SuperAdmin; upsert; encola sync "rancho_perfil"
```
- [ ] Pruebas: guardar y leer; usuario no admin rechazado; `entityTable` incluye `rancho_perfil`; payload de sync con `rancho_id`.
- [ ] Tabla `rancho_perfil (rancho_id TEXT PRIMARY KEY, ...)`; `entityTable["rancho_perfil"] = "rancho_perfil"`; el UPSERT genérico usa `ON CONFLICT (id)`: para que funcione, la tabla lleva `id TEXT PRIMARY KEY` (= rancho_id) y `rancho_id` como columna adicional.
- [ ] Suite + builds + commit `feat(ficha): rancho profile for the record footer`.

### Task 4: PDF (`ficha_pdf.go`, `ficha_assets.go`, `ficha_desktop.go`, `ficha_server.go`)

**Produces:**
```go
type FichaData struct { Animal Animal; Tree *PedigreeNode; Perfil RanchoPerfil; RanchoNombre string; Logo []byte; LogoTipo string; Emitida time.Time }
func renderFichaPDF(d FichaData, compress bool) ([]byte, error)
func (a *App) buildFicha(animalID string) (FichaData, error)         // valida tenant y especie Ovino
func (a *App) ExportFichaGenealogica(animalID string) (string, error) // desktop: SaveFileDialog
func (a *App) handleFichaPDF(w, r)                                    // GET /api/animals/{id}/ficha
func ranchoBranding(email, perfilNombre string) (nombre string, logo []byte, tipo string)
```
- [ ] `go get github.com/go-pdf/fpdf@v0.9.0`.
- [ ] Pruebas: `renderFichaPDF(..., compress=false)` produce `%PDF`, contiene el arete, el registro, "REGISTRO GENEAL" y la leyenda "No sustituye"; nunca contiene "UNO:" salvo dentro del registro del animal ni la cadena "Organismo de la Unidad"; `buildFicha` rechaza bovinos y animales de otro tenant; `handleFichaPDF` → 200 `application/pdf` con sesión, 404 si no existe.
- [ ] Diseño A4: cabecera (escudo 22 mm, nombre del rancho, "REGISTRO GENEALÓGICO", registro UNO a la derecha), bloque del animal en dos columnas, árbol en cuatro columnas con llaves, pie con criador/propietario, fecha y leyenda. Texto vía `pdf.UnicodeTranslatorFromDescriptor("")` (cp1252).
- [ ] Suite + builds + commit `feat(ficha): genealogical record PDF (desktop save dialog + HTTP)`.

### Task 5: Importación y plantilla

- [ ] Columnas nuevas en `importColumns`: Nombre, Tatuaje Der, Tatuaje Izq, Tatuaje Cola, Color, Pureza, Grado, Registro, SINIIGA, ID Electronica, Referencia (Sí/No). `processExcel` las lee; `Referencia = Sí/Si/1/true` → `es_referencia = 1`.
- [ ] Prueba: fila con `Referencia = Sí` no sale en `GetAnimales` pero sí en `GetAnimalesReferencia`; plantilla sigue importando su fila de ejemplo.
- [ ] Commit `feat(import): certificate columns and reference rows`.

### Task 6: Frontend

- [ ] `models.ts`: campos nuevos en `Animal`; clases `PedigreeNode`, `RanchoPerfil`. `App.d.ts`/`App.js`: `GetPedigree`, `GetAnimalesReferencia`, `GetRanchoPerfil`, `SaveRanchoPerfil`, `ExportFichaGenealogica`.
- [ ] `api.ts`: envoltorios Wails/HTTP; rutas HTTP nuevas en `api_server.go`: `GET /api/pedigree?id=`, `GET /api/animals/referencias`, `GET|PUT /api/rancho-perfil`, `GET /api/animals/{id}/ficha`.
- [ ] `AddAnimalModal`/`EditAnimalModal`: sección "Certificado / Registro" (solo pie de cría): nombre, tatuajes, color, pureza, grado (select SI/GE/ND/HO/TR/OT), registro, SINIIGA, ID electrónica.
- [ ] `GenealogyModal`: carga `GetPedigree(animal.id)`; cuatro columnas; nodo con `Existe=false` muestra "Agregar" → `ReferenceAnimalModal` (arete/registro, nombre, raza, pureza, grado, sexo) que llama `AddAnimal({es_referencia:true, ...})` y luego `UpdateAnimal` del hijo con `padre_id`/`madre_id` = arete nuevo; nodo existente muestra "Editar" (abre el mismo modal con `UpdateAnimal`); botón "Ficha PDF" (`DownloadFicha`).
- [ ] `Inventory`: pestaña "Referencias" (lista `GetAnimalesReferencia`, editar/borrar).
- [ ] `Profile`: tarjeta "Datos del rancho" (Admin): campos de criador y propietario, guardar con `SaveRanchoPerfil`.
- [ ] `AnimalCard`: botón "Ficha" (solo Ovino).
- [ ] `tsc` + build + verificación Playwright: capturar semental con ancestros, generar ficha de una cría, abrir PDF.
- [ ] Commit `feat(ficha): pedigree editor, reference animals, ranch profile and PDF button`.

### Task 7: Demo, gate y despliegue

- [ ] `scratch/demo_data`: 2 sementales con registro y 3 generaciones de referencias.
- [ ] Gate completo (Go, govulncheck, builds, tsc, build) → merge a `main` → push → `gcloud run deploy` → verificar `/api/animals/{id}/ficha` en producción con una cuenta real (PDF descargable) → bitácora.
