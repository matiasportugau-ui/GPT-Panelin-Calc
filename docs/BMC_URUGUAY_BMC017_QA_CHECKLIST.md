# BMC-017 - Checklist QA end-to-end y regresion

Estado: Implementado (checklist + pruebas automatizadas)

## 1) Cobertura automatizada actual

Suite Jest en `calculadora/tests/`:

- `api.test.js`
- `quotes-api.test.js`
- `techo.test.js`
- `pared.test.js`

Incluye validacion de:

- calculo de cotizacion;
- emision de quote versionada;
- descarga de PDF y payload por version;
- actualizacion de estado;
- historial por cliente.

## 2) Checklist E2E manual

## A. Emision inicial V1

1. Crear lead en Tracker con escenario/familia/medidas.
2. Emitir por API (Apps Script menu).
3. Validar en fila:
   - `REF_COTIZACION`
   - `VERSION = 1`
   - `SUBTOTAL`, `IVA_22`, `TOTAL`
   - `LINK_EDITABLE`, `LINK_PDF`, `LINK_CARPETA`

## B. Reemision V2

1. Ajustar datos.
2. Volver a emitir con mismo `REF_COTIZACION`.
3. Validar:
   - `VERSION` incrementa (V2+)
   - `LINK_PDF` apunta a nueva version
   - PDF V1 sigue accesible y sin cambios

## C. Seguimiento

1. Ver `VENCIDO` y `SCORE_PRIORIDAD`.
2. Ejecutar resumen diario y alerta vencidos.
3. Generar `FollowUpQueue` y validar mensajes.

## D. API backend

1. `POST /api/quotes/calculate` -> 200 + calculation_result.
2. `POST /api/quotes/issue` -> 200 + ref/version/links.
3. `GET /api/quotes/:ref/versions/:v/pdf` -> 200 PDF.
4. `GET /api/clients/:id/history` -> historial consistente.

## 3) Criterio de pase release

Release apto si:

1. tests automáticos en verde;
2. checklist manual A/B/C/D completado;
3. sin sobrescritura de PDF en pruebas de versionado.
