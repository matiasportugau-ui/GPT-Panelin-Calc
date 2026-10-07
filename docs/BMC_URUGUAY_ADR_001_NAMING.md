# ADR-001 - Naming oficial de cotizaciones y documentos (BMC Uruguay)

- Estado: Aceptado
- Fecha: 2026-03-11
- Owner: A1 Arquitectura
- Alcance: Tracker, backend, Apps Script, generador PDF, almacenamiento en Drive

## Contexto

El flujo de cotizacion requiere una referencia unica, versionado explicito y ubicacion documental estable para evitar duplicados, sobreescrituras y perdida de trazabilidad.

## Decision

### 1) Formato oficial de referencia

- `quote_ref`: `BMC-COT-AAAA-NNNN`
- `quote_version`: `BMC-COT-AAAA-NNNN-VX`

Regex canonical:

- `quote_ref`: `^BMC-COT-(20[0-9]{2})-([0-9]{4})$`
- `quote_version`: `^BMC-COT-(20[0-9]{2})-([0-9]{4})-V([1-9][0-9]*)$`

Reglas:

1. `AAAA` es el anio de emision.
2. `NNNN` es correlativo anual con padding a 4 digitos.
3. `V1` es la primera emision formal; revisiones usan `V2`, `V3`, etc.
4. No se reutilizan correlativos aunque una cotizacion se descarte.

### 2) Slug de cliente para nombres de carpeta/archivo

Formato: `Nombre-Apellido` (ASCII, guion medio).

Normalizacion:

1. Quitar tildes y caracteres no ASCII.
2. Reemplazar espacios multiples por un unico `-`.
3. Remover simbolos no alfanumericos (salvo `-`).
4. Evitar guiones duplicados.

Ejemplo:

- `Jose Perez` -> `Jose-Perez`
- `Compania Nunez & Hnos.` -> `Compania-Nunez-Hnos`

### 3) Estructura oficial de carpetas

Ruta:

`/BMC Uruguay/Cotizaciones/{AAAA}/{MM-Mes}/{AAAA-MM-DD}/{quote_ref}_{cliente_slug}/`

Ejemplo:

`/BMC Uruguay/Cotizaciones/2026/03-Marzo/2026-03-11/BMC-COT-2026-0001_Joel-Lima/`

### 4) Nombres oficiales de artefactos

Dentro de la carpeta de la cotizacion:

- Editable: `{quote_version}_{cliente_slug}_EDITABLE` (Google Sheet o `.xlsx`)
- PDF: `{quote_version}_{cliente_slug}.pdf`
- Payload: `{quote_version}_payload.json`

Ejemplo:

- `BMC-COT-2026-0001-V1_Joel-Lima_EDITABLE`
- `BMC-COT-2026-0001-V1_Joel-Lima.pdf`
- `BMC-COT-2026-0001-V1_payload.json`

### 5) Regla de inmutabilidad

1. El PDF enviado al cliente es inmutable.
2. Toda modificacion posterior crea una nueva version.
3. Nunca sobrescribir archivos de versiones previas.

## Ejemplos validos e invalidos

### Validos

- `BMC-COT-2026-0001`
- `BMC-COT-2026-0001-V1`
- `BMC-COT-2027-0142-V3`

### Invalidos

- `BMC-2026-0001` (falta `COT`)
- `BMC-COT-26-0001` (anio invalido)
- `BMC-COT-2026-12` (sin padding de correlativo)
- `BMC-COT-2026-0001-v1` (version en minuscula)
- `BMC-COT-2026-0001-V0` (version debe iniciar en V1)

## Consecuencias

Positivas:

- Trazabilidad uniforme en toda la plataforma.
- Facilita busqueda por referencia, fecha, cliente o version.
- Evita errores de sobreescritura documental.

Riesgos si no se cumple:

- Duplicados de referencia.
- Links rotos en tracker.
- Evidencia comercial inconsistente.

## Implementacion requerida

1. Correlativo anual centralizado (Apps Script Properties o backend).
2. Validador regex en backend y/o trigger de Sheets.
3. Escritura automatica de `quote_ref` y `version` al emitir.
4. Auditoria de nombres en pruebas E2E.
