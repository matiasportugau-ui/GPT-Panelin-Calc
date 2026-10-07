# BMC-009 - Editable por cotizacion y LINK_EDITABLE

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Objetivo

Generar un editable por cotizacion/version en Drive y registrar su URL en:

- `LINK_EDITABLE` (columna 25 del Tracker)

## 2) Prerrequisitos

1. Correlativo funcionando (`BMC-007`).
2. Carpeta de cotizacion en Drive (`BMC-008`).
3. Plantilla editable configurada por ID de archivo.

## 3) Implementacion incluida

Archivo:

- `scripts/apps-script/bmc-tracker/Code.gs`

Funciones:

- `promptEditableTemplateFileId()`
- `setEditableTemplateFileId(fileId)`
- `showEditableTemplateStatus()`
- `createEditableForActiveRow()`
- `createEditablesForPendingRows()`
- `ensureEditableLinkForRow_(sheet, row)`

## 4) Nombre de editable

Formato aplicado:

`{REF_COTIZACION}-V{VERSION}_{ClienteSlug}_EDITABLE`

Ejemplo:

`BMC-COT-2026-0001-V1_Joel-Lima_EDITABLE`

## 5) Reglas de seguridad y no-duplicacion

1. Si `LINK_EDITABLE` ya tiene valor, no se vuelve a crear.
2. Si el archivo con mismo nombre ya existe en la carpeta, se reutiliza.
3. Si no existe, se clona desde la plantilla.

## 6) Menu operativo

Google Sheets -> `BMC Tracker`:

- `Configurar plantilla editable (ID)`
- `Ver plantilla editable`
- `Crear editable para fila actual`
- `Completar editables faltantes`

## 7) Criterios de aceptacion (BMC-009)

Cumple BMC-009 si:

1. una fila `Emitida/Enviada` obtiene `LINK_EDITABLE`;
2. el archivo queda dentro de la carpeta de la cotizacion;
3. repetir la accion no duplica editable para misma version.
