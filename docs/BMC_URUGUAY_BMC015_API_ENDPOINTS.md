# BMC-015 - Endpoints minimos de cotizacion

Estado: Implementado  
Owner objetivo: A3 Backend

## Endpoints

## 1) Calculo

`POST /api/quotes/calculate`

Calcula BOM + totales sin emitir aun version documental.

## 2) Emision

`POST /api/quotes/issue`

Emite cotizacion formal, genera version, guarda PDF y payload.

## 3) Cambio de estado

`PATCH /api/quotes/:id/status`

Actualiza estado (`ENVIADA`, `EN_SEGUIMIENTO`, `APROBADA`, etc.).

## 4) Historial por cliente

`GET /api/clients/:id/history`

Recupera cotizaciones y versiones de un cliente.

## 5) Artefactos de version

- `GET /api/quotes/:quoteRef/versions/:version/pdf`
- `GET /api/quotes/:quoteRef/versions/:version/payload`
- `GET /api/quotes/:quoteRef/folder`

## Contrato de salida esperado en issue

```json
{
  "ok": true,
  "quote_id": "qte_...",
  "client_id": "cli_...",
  "quote_ref": "BMC-COT-2026-0001",
  "version": 1,
  "estado_cotizacion": "EMITIDA",
  "subtotal": 1000,
  "iva_22": 220,
  "total": 1220,
  "links": {
    "pdf_url": "/api/quotes/BMC-COT-2026-0001/versions/1/pdf",
    "payload_url": "/api/quotes/BMC-COT-2026-0001/versions/1/payload",
    "folder_url": "/api/quotes/BMC-COT-2026-0001/folder"
  },
  "checks": {
    "pdf_immutable": true
  }
}
```
