# BMC Uruguay - Contratos de datos (BMC-003)

Owner: A1 Arquitectura  
Estado: Aprobado para implementacion

Este documento define el contrato minimo entre:

- Tracker (Google Sheets)
- Automatizacion (Apps Script)
- Backend/API
- Generador PDF

## 1) Entidades principales

## 1.1 Cliente (`client`)

| Campo | Tipo | Requerido | Nota |
|---|---|---|---|
| `client_id` | string | si (sistema) | ID estable interno (`cli_...`) |
| `nombre` | string | si | Nombre comercial/persona |
| `telefono` | string | no | Normalizado E.164 si aplica |
| `direccion` | string | no | Zona de obra o direccion |
| `origen_principal` | string | no | `WA`, `LL`, `EM`, etc. |
| `created_at` | datetime | si (sistema) | ISO 8601 |
| `updated_at` | datetime | si (sistema) | ISO 8601 |

## 1.2 Interaccion (`interaction`)

| Campo | Tipo | Requerido | Nota |
|---|---|---|---|
| `interaction_id` | string | si (sistema) | ID estable (`int_...`) |
| `client_id` | string | si | FK a cliente |
| `fecha` | datetime | si | fecha del contacto |
| `canal` | string | si | `WA`, `LL`, `EM`, etc. |
| `consulta` | string | si | texto libre resumido |
| `responsable` | string | no | iniciales/codigo |
| `estado` | string | si | estado comercial/operativo |

## 1.3 Cotizacion (`quote`)

| Campo | Tipo | Requerido | Nota |
|---|---|---|---|
| `quote_id` | string | si (sistema) | ID interno (`qte_...`) |
| `quote_ref` | string | si | `BMC-COT-AAAA-NNNN` |
| `version` | integer | si | `1..n` |
| `estado_cotizacion` | string | si | ver state machine |
| `client_id` | string | si | FK a cliente |
| `interaction_id` | string | no | FK a interaccion |
| `subtotal` | number | si | sin IVA |
| `iva_22` | number | si | monto IVA |
| `total` | number | si | subtotal + iva |
| `editable_url` | string(url) | no | link a editable |
| `pdf_url` | string(url) | no | link a PDF |
| `folder_url` | string(url) | no | link a carpeta |
| `created_at` | datetime | si | ISO 8601 |
| `updated_at` | datetime | si | ISO 8601 |

## 1.4 Lineas de cotizacion (`quote_line`)

| Campo | Tipo | Requerido | Nota |
|---|---|---|---|
| `quote_id` | string | si | FK |
| `tipo` | string | si | `producto`, `accesorio`, `fijacion` |
| `sku` | string | no | SKU catalogo |
| `descripcion` | string | si | texto linea |
| `cantidad` | number | si | > 0 |
| `unidad` | string | si | `m2`, `u`, `m`, etc. |
| `precio_unitario` | number | no | monetario |
| `importe` | number | si | subtotal linea |

## 2) Contratos JSON oficiales

Schemas machine-readable:

- `docs/schemas/bmc_quote_calculation_request.schema.json`
- `docs/schemas/bmc_quote_issue_request.schema.json`
- `docs/schemas/bmc_quote_issue_response.schema.json`

## 2.1 Request de calculo (resumen)

Objeto minimo esperado:

- `client.nombre`
- `technical_input.escenario`
- `technical_input.familia`
- `technical_input.espesor_mm`
- `technical_input.ancho_m`
- `technical_input.largo_m`

Salida esperada de calculo:

- `lineas` (BOM)
- `subtotal`
- `iva_22`
- `total`
- `warnings` (si aplica)

## 2.2 Request de emision (resumen)

Objeto minimo esperado:

- `client`
- `calculation_result`
- `status_target` (`EMITIDA` o `ENVIADA`)

Opcional:

- `quote_ref` (si viene preasignada)
- `version` (para revisiones)
- `tracker_context` (sheet_id, row_number)

## 2.3 Response de emision (minimo obligatorio)

Debe incluir:

- `quote_id`
- `quote_ref`
- `version`
- `estado_cotizacion`
- `subtotal`, `iva_22`, `total`
- `links.editable_url`
- `links.pdf_url`
- `links.folder_url`

## 3) Restricciones transversales

1. `quote_ref` debe validar contra ADR-001.
2. No aceptar `version < 1`.
3. Si `estado_cotizacion` es `EMITIDA` o superior, `pdf_url` es obligatorio.
4. Nunca reusar URLs para nueva version.
5. Si hay error de integracion, responder con codigo y mensaje trazable (`error_code`, `message`, `trace_id`).

## 4) Compatibilidad con tracker

Para sincronizar con la planilla, el contrato de emision debe mapear al menos:

- `quote_ref -> REF_COTIZACION`
- `version -> VERSION`
- `estado_cotizacion -> ESTADO_COTIZACION`
- `subtotal -> SUBTOTAL`
- `iva_22 -> IVA_22`
- `total -> TOTAL`
- `links.editable_url -> LINK_EDITABLE`
- `links.pdf_url -> LINK_PDF`
- `links.folder_url -> LINK_CARPETA`
