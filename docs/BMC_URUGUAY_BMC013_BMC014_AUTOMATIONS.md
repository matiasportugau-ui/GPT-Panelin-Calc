# BMC-013 / BMC-014 - Seguimiento automatico y cola de follow-up

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Alcance

## BMC-013

- resumen diario por responsable;
- alerta de oportunidades vencidas;
- uso de `score_prioridad`, `vencido`, `estado_cotizacion`.

## BMC-014

- generacion de cola de follow-up para cotizaciones enviadas/en seguimiento;
- mensaje sugerido por cliente listo para WhatsApp/email.

## 2) Funciones agregadas

En `scripts/apps-script/bmc-tracker/Code.gs`:

- `promptNotificationEmail()`
- `sendDailySummaryNow()`
- `alertOverdueLeadsNow()`
- `generateFollowUpQueue()`

Helpers:

- `getTrackerRows_()`
- `buildFollowUpMessage_()`
- `truncate_()`

## 3) Menu operativo

Google Sheets -> `BMC Tracker`:

- `Configurar email de alertas`
- `Enviar resumen diario ahora`
- `Alertar vencidos ahora`
- `Generar cola de follow-up`

## 4) Hoja de salida follow-up

Se crea/actualiza:

- `FollowUpQueue`

Columnas:

- Cliente
- Telefono
- Responsable
- Estado
- Score
- DiasAbiertos
- MensajeSugerido
- RefCotizacion

## 5) Criterios de aceptacion

1. Se puede configurar email de notificaciones.
2. El resumen diario sale con KPIs y top prioridad.
3. Las alertas de vencidos agrupan por responsable.
4. La cola follow-up se genera en hoja dedicada y ordenada por score.
