# Semáforo del hato (predicciones para el ranchero) — diseño

**Fecha:** 2026-09-12 · **Estado:** aprobado en conversación ("las tres están bien… un semáforo… ejecútalo")

## 1. Objetivo
Que el ranchero vea, sin leer números, qué animales necesitan acción hoy y cuánto dinero hay en juego. Un solo semáforo por animal (rojo / amarillo / verde / gris) con una frase de una línea, calculado con los datos que ya captura la app (pesajes, edad, tratamientos, destino). Tres señales lo alimentan:

1. **Venta** (solo engorda): listo para venta o fecha estimada de venta, proyectando el peso con la ganancia diaria (GDP) del animal hacia la meta actual del rancho (42 kg y 4 meses).
2. **Crecimiento**: GDP del animal comparada con la mediana de su lote (mismo destino y edad ±60 días).
3. **Riesgo de baja**: peso estancado o en caída, tratamientos repetidos (≥ 3 en 60 días), o sin pesaje reciente.

Además, **valor estimado** = peso actual × precio por kg del rancho (configurable en Datos del rancho; si no hay precio, no se muestra dinero).

## 2. Reglas (rule-based; se calibrarán con datos reales cuando existan)
- **GDP animal**: con ≥ 2 pesajes, pendiente entre el primero y el último de los últimos 90 días; con 1 pesaje y peso al nacer, (peso − peso_nacer)/edad. Sin pesajes → gris.
- **Lote**: animales activos del mismo destino con edad ±60 días y GDP > 0; hace falta ≥ 3 para comparar, si no, la señal de crecimiento queda gris.
- **Venta**: rojo = ya cumple peso y edad (convención del rancho: rojo = sácalo hoy); amarillo = proyectado a ≤ 30 días; verde = más lejos; gris = sin datos o no es engorda.
- **Crecimiento**: rojo < 60 % del lote, amarillo < 85 %, verde ≥ 85 %.
- **Riesgo**: rojo = GDP ≤ 0 con ≥ 2 pesajes, o ≥ 3 tratamientos en 60 días, o > 60 días sin pesaje en engorda; amarillo = 2 tratamientos en 60 días o > 30 días sin pesaje; verde = nada de lo anterior; gris = sin pesajes.
- **Color global** = el más urgente de las tres señales (rojo > amarillo > verde > gris). **Frase** = la señal que manda, en lenguaje de corral ("Listo para venta: 43.2 kg, ~$3,240", "Gana 45 % menos que su lote", "Sin pesaje desde hace 38 días", "Va bien: 0.26 kg/día").

## 3. Dónde aparece
- **Tarjeta del animal**: punto de color + frase.
- **Dashboard**: panel "Semáforo del hato" con conteo rojo/amarillo/verde y la lista de los que requieren acción (rojos y amarillos), con valor estimado.
- **Al registrar venta o baja** (edición de estatus → Vendido / Baja): aviso con la proyección ("aún gana 0.28 kg/día; en 20 días pesaría 44 kg, ~$X más") o la confirmación de riesgo.

## 4. Implementación
- Go `semaforo.go`: `GetSemaforoHato() ([]SemaforoAnimal, error)` (Wails) y `GET /api/semaforo`; sin tablas nuevas salvo `rancho_perfil.precio_kg REAL`. Pruebas con escenarios sintéticos.
- Frontend: `store.semaforo` (mapa por id), cargado en `refreshData`; `AnimalCard`, `Dashboard` y `EditAnimalModal` lo consumen; campo "Precio por kg" en Datos del rancho.
- Fuera de alcance: modelos estadísticos entrenados, notebooks, precios por mercado.
