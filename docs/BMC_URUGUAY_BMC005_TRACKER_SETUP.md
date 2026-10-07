# BMC-005 - Tracker base operativo (Google Sheets + Apps Script)

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Entregables incluidos en este repo

- Script principal: `scripts/apps-script/bmc-tracker/Code.gs`
- Manifest: `scripts/apps-script/bmc-tracker/appsscript.json`
- Columnas canonicas: `docs/BMC_URUGUAY_TRACKER_COLUMNS.md`
- Dashboard minimo: `docs/BMC_URUGUAY_BMC006_DASHBOARD_SETUP.md`
- Correlativo robusto: `docs/BMC_URUGUAY_BMC007_CORRELATIVO_SETUP.md`
- Carpetas Drive y LINK_CARPETA: `docs/BMC_URUGUAY_BMC008_DRIVE_FOLDERS_SETUP.md`
- Editables por cotizacion y LINK_EDITABLE: `docs/BMC_URUGUAY_BMC009_EDITABLE_SETUP.md`
- Pipeline emision PDF/versionado: `docs/BMC_URUGUAY_BMC010_011_012_PIPELINE.md`
- Seguimiento y follow-up automatico: `docs/BMC_URUGUAY_BMC013_BMC014_AUTOMATIONS.md`

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
7. Crea hoja `Dashboard` con KPIs minimos y tablas de resumen.
8. Implementa correlativo anual con lock para `REF_COTIZACION`.
9. Crea carpeta Drive por cotizacion y escribe `LINK_CARPETA`.
10. Clona editable por version y escribe `LINK_EDITABLE`.
11. Emite por API y escribe `LINK_PDF` + montos + version.
12. Ejecuta resumen/alertas/follow-up desde menu.

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
- `setupBmcDashboard()`: recrea solo el dashboard.
- `applyBmcValidations()`: reaplica validaciones.
- `applyBmcFormulas()`: reaplica formulas.
- `onEdit(e)`: automatizacion en cambios de fila.
- `assignQuoteRefToActiveRow()`: asigna referencia a la fila seleccionada.
- `showSequenceStatus()`: muestra secuencia del anio actual.
- `createDriveFolderForActiveRow()`: crea carpeta para la fila activa.
- `createDriveFoldersForPendingRows()`: completa carpetas faltantes en lote.
- `createEditableForActiveRow()`: crea editable para la fila activa.
- `createEditablesForPendingRows()`: completa editables faltantes en lote.
- `issueQuoteForActiveRowViaApi()`: calcula/emite por API y actualiza la fila.

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
5. Existe dashboard con KPIs base conectados a Tracker.
6. La referencia de cotizacion se genera de forma unica y correlativa.
7. Las filas emitidas/enviadas pueden resolver `LINK_CARPETA` automaticamente.
8. Las filas emitidas/enviadas pueden resolver `LINK_EDITABLE` automaticamente.
9. La fila puede recibir `LINK_PDF` y versionado desde endpoint de emision.

## 7) Limites de esta entrega (intencionales)

Esta base NO incluye aun:


Esos puntos se implementan en los siguientes bloques del backlog.
