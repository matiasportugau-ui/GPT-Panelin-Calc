# BMC Tracker Apps Script (MVP)

Este modulo contiene el script base para BMC-005.

## Archivos

- `Code.gs`: logica de inicializacion, validaciones, formulas y automatismos base.
- `appsscript.json`: manifest del proyecto Apps Script.

## Uso rapido

1. Abrir Google Sheets.
2. `Extensions -> Apps Script`.
3. Copiar contenido de `Code.gs`.
4. Guardar y recargar la planilla.
5. Ejecutar menu `BMC Tracker -> Inicializar estructura`.

Si solo queres reconstruir el dashboard:

- `BMC Tracker -> Recrear dashboard`

Para correlativo:

- `BMC Tracker -> Asignar REF a fila actual`
- `BMC Tracker -> Ver secuencia actual`

Para carpetas de Drive:

- `BMC Tracker -> Configurar carpeta raiz Drive (ID)`
- `BMC Tracker -> Crear carpeta para fila actual`
- `BMC Tracker -> Completar carpetas faltantes`

Para editable:

- `BMC Tracker -> Configurar plantilla editable (ID)`
- `BMC Tracker -> Crear editable para fila actual`
- `BMC Tracker -> Completar editables faltantes`

Para emision por API:

- `BMC Tracker -> Configurar API emision`
- `BMC Tracker -> Emitir cotizacion por API (fila actual)`

Para seguimiento y follow-up:

- `BMC Tracker -> Configurar email de alertas`
- `BMC Tracker -> Enviar resumen diario ahora`
- `BMC Tracker -> Alertar vencidos ahora`
- `BMC Tracker -> Generar cola de follow-up`

Para detalle completo, ver:

- `docs/BMC_URUGUAY_BMC005_TRACKER_SETUP.md`
- `docs/BMC_URUGUAY_BMC006_DASHBOARD_SETUP.md`
- `docs/BMC_URUGUAY_BMC007_CORRELATIVO_SETUP.md`
- `docs/BMC_URUGUAY_BMC008_DRIVE_FOLDERS_SETUP.md`
- `docs/BMC_URUGUAY_BMC009_EDITABLE_SETUP.md`
- `docs/BMC_URUGUAY_BMC010_011_012_PIPELINE.md`
- `docs/BMC_URUGUAY_BMC013_BMC014_AUTOMATIONS.md`
