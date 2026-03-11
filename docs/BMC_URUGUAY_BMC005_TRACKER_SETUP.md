# BMC-005 - Tracker base operativo (Google Sheets + Apps Script)

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Entregables incluidos en este repo

- Script principal: `scripts/apps-script/bmc-tracker/Code.gs`
- Manifest: `scripts/apps-script/bmc-tracker/appsscript.json`
- Columnas canonicas: `docs/BMC_URUGUAY_TRACKER_COLUMNS.md`

## 2) Que hace este paquete

Al ejecutar `setupBmcTracker()`:

1. Crea/actualiza hojas `Tracker` y `Config`.
2. Escribe las 34 columnas canonicas del tracker.
3. Aplica listas desplegables (origen, escenario, prioridad, estado, responsable, resultado final).
4. Aplica formulas para:
   - `DIAS_ABIERTOS`
   - `VENCIDO`
   - `SCORE_PRIORIDAD`
   - `SEMAFORO`
5. Aplica formato base (header, columnas, moneda, fechas, semaforo).
6. Configura reglas de automatizacion minima en `onEdit`:
   - `CREATED_AT` y `UPDATED_AT`
   - asignacion automatica simple de `Responsable` por `Origen`
   - seteo de `FECHA_EMISION` cuando estado pasa a `Enviada`
   - seteo de `RESULTADO_FINAL` segun estado final

## 3) Como instalar en Google Sheets

1. Crear o abrir la planilla operativa en Google Sheets.
2. Ir a `Extensions -> Apps Script`.
3. Reemplazar contenido de `Code.gs` con:
   - `scripts/apps-script/bmc-tracker/Code.gs`
4. En `Project Settings`, verificar timezone `America/Montevideo`.
5. Guardar y recargar la planilla.
6. En menu `BMC Tracker`, ejecutar:
   - `Inicializar estructura`

## 4) Funciones disponibles

- `setupBmcTracker()`: crea estructura completa.
- `applyBmcValidations()`: reaplica validaciones.
- `applyBmcFormulas()`: reaplica formulas.
- `onEdit(e)`: automatizacion en cambios de fila.

## 5) Validaciones incluidas

- Origen: `WA`, `LL`, `EM`, `CL`, `WEB`, `OTRO`
- Escenario: `solo_techo`, `solo_fachada`, `techo_fachada`, `camara_frig`
- Prioridad: `Alta`, `Media`, `Baja`, `Sin prioridad`
- Estado: `Borrador`, `Falta informacion`, `Calculada`, `Emitida`, `Enviada`, `En seguimiento`, `Ajustando`, `Aprobada`, `Rechazada`, `Vencida`
- Responsable: `TIN`, `RA`, `AM`, `LO`, `IN`, `SIN_ASIGNAR`
- Resultado final: `Abierto`, `Ganado`, `Perdido`, `Descartado`

## 6) Criterios de aceptacion (BMC-005)

Se considera cumplido si:

1. La hoja `Tracker` queda lista para carga diaria sin edicion estructural manual.
2. Existen validaciones para estado, prioridad, responsable, origen y escenario.
3. Se calcula score y semaforo automaticamente.
4. Se registran `CREATED_AT`/`UPDATED_AT` al editar filas con cliente.

## 7) Limites de esta entrega (intencionales)

Esta base NO incluye aun:

- correlativo robusto con lock (`BMC-007`)
- creacion de carpetas en Drive (`BMC-008`)
- clonado de editable (`BMC-009`)
- integracion con `pdf_generator.py` (`BMC-010`)
- linkeo automatico de PDF (`BMC-011`)

Esos puntos se implementan en los siguientes bloques del backlog.
