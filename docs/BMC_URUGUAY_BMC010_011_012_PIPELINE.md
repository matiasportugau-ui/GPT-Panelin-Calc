# BMC-010 / BMC-011 / BMC-012 - Pipeline formal de emision PDF y versionado

Estado: Implementado (backend + Apps Script)  
Owners objetivo: A3 Backend, A4 PDF, A2 Apps Script

## 1) Alcance cubierto

## BMC-010 (PDF pipeline)

- Contrato formal de emision por API:
  - `POST /api/quotes/calculate`
  - `POST /api/quotes/issue`
- El backend emite PDF real con `generarPDF(...)`.
- Se guarda payload tecnico versionado (`*_payload.json`).

## BMC-011 (link PDF estable)

- Cada version escribe su PDF en archivo dedicado.
- No se permite sobreescritura del mismo `quote_ref + version`.
- Apps Script escribe `LINK_PDF` en tracker tras emision API.

## BMC-012 (versionado V1/V2/V3)

- Primera emision -> `V1`.
- Si se reemite mismo `quote_ref`, backend crea `V2`, `V3`, etc.
- Estado y montos quedan guardados por version.

## 2) Endpoints implementados

### `POST /api/quotes/calculate`

Entrada:

- `client`
- `technical_input`

Salida:

- `calculation_result` con subtotal/iva/total, lineas, warnings y `raw_cotizacion`.

### `POST /api/quotes/issue`

Entrada:

- `client` (obligatorio)
- `calculation_result` (o datos tecnicos para recalcular)
- `status_target`
- `quote_ref` opcional (si viene, se versiona sobre esa referencia)

Salida minima:

- `quote_id`, `client_id`, `quote_ref`, `version`, `estado_cotizacion`
- `subtotal`, `iva_22`, `total`
- `links.pdf_url`, `links.payload_url`, `links.folder_url`
- `checks.pdf_immutable = true`

### `PATCH /api/quotes/:id/status`

- Actualiza estado de cotizacion.

### `GET /api/clients/:id/history`

- Devuelve cliente + historial de cotizaciones/versiones.

### `GET /api/quotes/:quoteRef/versions/:version/pdf`

- Descarga PDF de una version especifica.

### `GET /api/quotes/:quoteRef/versions/:version/payload`

- Devuelve payload JSON versionado.

## 3) Persistencia y artefactos

Ruta local (backend):

- `calculadora/storage/quote_store.json` (metadatos de clientes/cotizaciones)
- `calculadora/storage/quotes/{year}/{quote_ref}_{cliente}/` (PDF y payload por version)

Ejemplo:

- `BMC-COT-2026-0007-V1_Joel-Lima.pdf`
- `BMC-COT-2026-0007-V1_payload.json`

## 4) Integracion Apps Script (Tracker)

Se agrego:

- configuracion de API base URL;
- accion de emision por fila (`issueQuoteForActiveRowViaApi`);
- escritura automatica de:
  - `REF_COTIZACION`
  - `VERSION`
  - `FECHA_EMISION`
  - `SUBTOTAL`, `IVA_22`, `TOTAL`
  - `LINK_PDF`

Regla aplicada:

- si la version es la misma, no pisa `LINK_PDF`;
- si hay nueva version, actualiza link al PDF de version emitida.

## 5) Criterios de aceptacion

1. Emision de V1 produce PDF descargable y payload.
2. Reemision de mismo `quote_ref` genera V2 sin sobrescribir V1.
3. `GET` de PDF V1 y V2 devuelve archivos distintos.
4. Tracker recibe `LINK_PDF` consistente con la version emitida.
