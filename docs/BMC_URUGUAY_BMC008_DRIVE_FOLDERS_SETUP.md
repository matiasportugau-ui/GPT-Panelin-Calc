# BMC-008 - Creacion automatica de carpeta en Drive y LINK_CARPETA

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Objetivo

Para cada cotizacion `Emitida` o `Enviada`:

1. crear (o reutilizar) carpeta documental en Drive;
2. escribir `LINK_CARPETA` en la fila del tracker;
3. evitar duplicados para la misma emision/version.

## 2) Implementacion incluida

Archivo:

- `scripts/apps-script/bmc-tracker/Code.gs`

Funciones:

- `promptDriveRootFolderId()`
- `setDriveRootFolderId(folderId)`
- `showDriveRootFolderStatus()`
- `createDriveFolderForActiveRow()`
- `createDriveFoldersForPendingRows()`
- `ensureDriveFolderLinkForRow_(sheet, row)`

## 3) Estructura de carpetas aplicada

La carpeta raiz debe ser configurada por ID (menu).  
A partir de esa raiz, el script crea:

`/Cotizaciones/{AAAA}/{MM-Mes}/{AAAA-MM-DD}/{REF_COTIZACION}_{ClienteSlug}/`

Ejemplo:

`/Cotizaciones/2026/03-Marzo/2026-03-11/BMC-COT-2026-0001_Joel-Lima/`

## 4) Prevencion de duplicados

El script no crea carpeta nueva si ya existe una con el mismo nombre bajo el mismo dia.

Estrategia:

- `getFoldersByName()` en cada nivel;
- si existe, reutiliza la carpeta existente;
- si no existe, crea carpeta.

## 5) Integracion con estados

En `onEdit(e)`:

- si `Estado_cotizacion` cambia a `Emitida` o `Enviada`, y la raiz Drive esta configurada:
  - genera `REF_COTIZACION` si falta;
  - asegura `VERSION = 1` si falta;
  - crea carpeta y escribe `LINK_CARPETA` si falta.

Adicionalmente, hay acciones manuales en menu para operar por fila o en lote.

## 6) Menu operativo

Google Sheets -> `BMC Tracker`:

- `Configurar carpeta raiz Drive (ID)`
- `Ver carpeta raiz Drive`
- `Crear carpeta para fila actual`
- `Completar carpetas faltantes`

## 7) Criterios de aceptacion (BMC-008)

Cumple BMC-008 si:

1. al menos una fila `Emitida/Enviada` obtiene carpeta y `LINK_CARPETA`;
2. la carpeta respeta naming de ADR-001;
3. repetir ejecucion no duplica carpeta para la misma referencia;
4. funciona en proceso individual (fila activa) y en lote (pendientes).

## 8) Requisito previo

Configurar una carpeta raiz valida de Drive por ID.

Sugerencia:

- usar como raiz la carpeta institucional `BMC Uruguay`;
- el script crea `Cotizaciones` debajo de esa raiz.
