# Ficha genealógica (registro de pureza del rancho) — diseño

**Fecha:** 2026-09-12
**Estado:** aprobado en conversación (4 respuestas del usuario); pendiente de plan de implementación
**Cliente que lo pidió:** Rancho Las Bugambilias (pie de cría). Referencia: `Registro borregos.pdf` (tres certificados UNO de sementales comprados, usados solo como muestra; no se cargan a la base).

## 1. Objetivo

Que el rancho pueda imprimir, para cualquier borrego, una **ficha genealógica con la marca del rancho** que tenga la misma estructura que el Certificado de Registro Genealógico de la UNO (Organismo de la Unidad Nacional de Ovinocultores): datos del animal arriba, árbol de cuatro generaciones en medio, criador y propietario abajo. Es el documento que enseñan cuando les preguntan "qué líneas trae" un semental.

**No es el certificado de la UNO.** Título "Registro genealógico", escudo del rancho, sin logotipo, sello ni firmas de la UNO, y una leyenda al pie: "Documento interno del rancho. No sustituye el certificado de registro de la UNO." Sí se guarda y se imprime el **número de registro UNO** del animal cuando existe.

Alcance: solo **borregos** (`especie = Ovino`) por ahora.

## 2. Datos que faltan hoy

El certificado trae, por animal: nombre, sexo, raza, grado (pureza %), color, tatuaje oreja derecha, tatuaje oreja izquierda, tatuaje cola, identificación, fecha de nacimiento, tipo de parto, tipo de concepción, ID electrónica, SINIIGA y número de certificado. Por cada ancestro (30 en cuatro generaciones): registro y código de grado (`SI`, `GE`, `ND`, `HO`, `TR`, `OT`), nombre o tatuaje, raza y porcentaje.

La app hoy guarda padres y cuatro abuelos como texto suelto (dos generaciones) y no tiene los campos del encabezado.

## 3. Modelo de datos

### 3.1 Genealogía por referencias
- El árbol se resuelve **siguiendo enlaces**: `padre_id` y `madre_id` apuntan a otro registro de `animales` (por `id` o por `arete`). Un animal que existe como registro tiene a su vez sus propios `padre_id`/`madre_id`, y así sucesivamente. No se agregan 30 columnas.
- **Animales de referencia:** los ancestros que no viven en el rancho (los del certificado de un semental comprado) se guardan en `animales` con `es_referencia = 1`. No cuentan en inventario, semáforo, corrales ni indicadores; solo existen para el árbol y para la ficha. Se listan en una pestaña "Referencias" del inventario para poder editarlos o borrarlos.
- Compatibilidad: si un padre o madre no es un registro sino texto suelto, el árbol muestra ese texto y usa los campos `abuelo_*` existentes para la segunda generación. Nada de lo que ya está capturado se pierde.
- Profundidad del árbol: cuatro generaciones (2 + 4 + 8 + 16). Si un ancestro no existe, su nodo sale vacío.

### 3.2 Columnas nuevas en `animales`
| Columna | Tipo | Uso |
|---|---|---|
| `es_referencia` | INTEGER DEFAULT 0 | 1 = solo para genealogía |
| `nombre` | TEXT | Nombre del animal (el certificado lo tiene aparte del tatuaje) |
| `tatuaje_der`, `tatuaje_izq`, `tatuaje_cola` | TEXT | Tatuajes |
| `color` | TEXT | Color / "Carac. raza" |
| `pureza` | REAL | Grado en %, p. ej. 100.00 |
| `grado_registro` | TEXT | Código UNO del registro: SI, GE, ND, HO, TR, OT |
| `registro` | TEXT | Número de registro UNO (p. ej. `UNO:272991MN-RP`) |
| `siniiga` | TEXT | Clave SINIIGA |
| `id_electronica` | TEXT | Identificación electrónica |

Se agregan a `createSchema`, `runMigrations`, `Animal` (Go y `models.ts`), `AddAnimal`, `UpdateAnimal`, `GetAnimales`, `animalRow` (sincronización) e importación.

### 3.3 Datos del rancho para el pie de la ficha
Tabla nueva `rancho_perfil` (una fila por `rancho_id`): `nombre`, `clave_criador`, `criador_nombre`, `criador_centro`, `criador_municipio_estado`, `propietario_nombre`, `propietario_centro`, `propietario_municipio_estado`, `logo` (ruta o data URL). Se edita en **Mi Perfil → Datos del rancho** (solo Admin). Si está vacío, la ficha imprime solo el nombre del rancho.

## 4. Captura

- **Alta / edición de animal (pie de cría):** los campos del encabezado se agregan a la sección "Datos genéticos", en dos filas: nombre, tatuajes (der / izq / cola), color, pureza %, grado, registro UNO, SINIIGA, ID electrónica.
- **Árbol editable:** en el modal Genética, cada nodo vacío tiene "Agregar"; abre un formulario corto (registro, nombre/tatuaje, raza, %, grado, sexo) que crea un animal de referencia y lo enlaza como padre o madre del nodo hijo. Los nodos existentes tienen "Editar". Con esto un certificado se captura una vez; las crías heredan el árbol por el enlace al semental.
- **Carga masiva:** la plantilla gana columnas `Nombre`, `Tatuaje Der`, `Tatuaje Izq`, `Tatuaje Cola`, `Color`, `Pureza`, `Grado`, `Registro`, `SINIIGA`, `ID Electronica`, `Referencia` (Sí/No). Para precargar ancestros se cargan como filas con `Referencia = Sí` y sus propios `Padre`/`Madre`. El importador enlaza por arete o registro.

## 5. La ficha en PDF

- Generada en el servidor Go con `github.com/go-pdf/fpdf` v0.9.0 (Go puro, sin CGO, funciona en escritorio y en Cloud Run). Fuentes base Helvetica con conversión UTF-8 → cp1252 (cubre acentos y ñ); no requiere archivos de fuente.
- **Diseño A4 vertical, estructura del certificado:**
  1. Cabecera: escudo del rancho (si hay), "RANCHO LAS BUGAMBILIAS" / "REGISTRO GENEALÓGICO", número de registro UNO a la derecha si existe.
  2. Bloque del animal: dos columnas de etiquetas y valores (nombre, sexo, raza, grado, color | tatuajes, identificación/arete, fecha de nacimiento, tipo de parto, tipo de concepción, tipo de nacimiento, ID electrónica, SINIIGA).
  3. Árbol: cuatro columnas de izquierda a derecha (padres, abuelos, bisabuelos, tatarabuelos), cada nodo con dos líneas como en el certificado: `REGISTRO // GRADO` y `NOMBRE-TATUAJE // RAZA PUREZA%`. Líneas de unión entre generaciones.
  4. Pie: criador y propietario (clave, nombre, centro, municipio/estado) desde `rancho_perfil`; fecha de emisión; leyenda "Documento interno del rancho. No sustituye el certificado de registro de la UNO."
- **Entrega:** escritorio → `ExportFichaGenealogica(animalID)` abre "Guardar como" (mismo patrón que la plantilla de Excel); web → `GET /api/animals/{id}/ficha` con sesión, `Content-Disposition: attachment`. Nombre de archivo: `ficha_<arete>.pdf`.
- **Botón:** "Ficha PDF" en el modal Genética y en la tarjeta del animal (solo `especie = Ovino`).

## 6. Sincronización y multirrancho
- Las columnas nuevas viajan en el payload de sincronización (`animalRow`). `rancho_perfil` se sincroniza como entidad nueva (`rancho_perfil` → tabla `rancho_perfil`).
- Los animales de referencia pertenecen al `rancho_id` del usuario, como cualquier animal.

## 7. Pruebas
- Go: resolución del árbol a cuatro generaciones con enlaces y con texto suelto; animales de referencia excluidos de `GetAnimales` por defecto e incluidos con un parámetro; ida y vuelta de las columnas nuevas; importación con `Referencia = Sí` y enlace por registro; generación del PDF (tamaño > 0, texto del arete y de la leyenda presentes al extraer el contenido); endpoint HTTP con y sin sesión.
- Frontend: `tsc` y build; verificación manual con Playwright: capturar un semental con sus 30 ancestros vía el árbol editable, generar la ficha de una cría y abrir el PDF.

## 8. Fuera de alcance
Vacas, firma digital, código QR, envío por correo, edición del certificado UNO, y cualquier reproducción de su marca.
