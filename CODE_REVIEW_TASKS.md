# Tareas propuestas tras revisión de código

## 1) Corregir error tipográfico / de nomenclatura
**Problema detectado:** el rol técnico `LEGIONNAIRE` está en inglés mientras la UI usa el término en español (`Legionario`), lo que genera inconsistencia terminológica y puede derivar en futuras erratas en etiquetas, filtros o traducciones.

**Tarea propuesta:** unificar nomenclatura de rol en toda la app (p. ej. `LEGIONARIO` o mantener inglés de forma consistente) y actualizar tipos, seeds de usuario y cualquier lógica asociada.

## 2) Solucionar fallo funcional en el mapa
**Problema detectado:** en `MapView`, al buscar se intenta ajustar `fitBounds` si hay resultados filtrados, pero ese conteo incluye monedas sin `location`. Si no se crea ningún marcador real, `fitBounds` se ejecuta sobre un grupo vacío y puede fallar.

**Tarea propuesta:** condicionar `fitBounds` a que exista al menos un marcador real (`markersRef.current.length > 0`) y añadir guardas para resultados sin coordenadas.

## 3) Corregir discrepancia de documentación
**Problema detectado:** el README indica configurar `GEMINI_API_KEY`, mientras que el código de servicios consume `process.env.API_KEY` (inyectado en build), lo cual puede confundir a quien no conozca la configuración de `vite.config.ts`.

**Tarea propuesta:** documentar explícitamente qué variable debe declarar el usuario y cómo se mapea internamente (o migrar a una única convención pública, por ejemplo `VITE_GEMINI_API_KEY`).

## 4) Mejorar pruebas automatizadas
**Problema detectado:** el repositorio no define suite de tests ni script `test`, pese a tener lógica crítica de reintentos y parseo de respuestas IA.

**Tarea propuesta:** incorporar Vitest y tests unitarios para:
- `withRetry` (reintentos ante 429/5xx y corte en errores no reintentables).
- parseo/validación de JSON en `identifyCoin` y `estimatePhysicalProperties`.
- caso de mapa con búsqueda sin coordenadas para evitar regresiones en `fitBounds`.
