# BMC Uruguay - Maquina de estados de cotizacion

Owner: A1 Arquitectura  
Estado: Aprobado para implementacion (BMC-002)

## 1) Estados oficiales (canonicos)

Valores recomendados para persistencia:

- `BORRADOR`
- `FALTA_INFORMACION`
- `CALCULADA`
- `EMITIDA`
- `ENVIADA`
- `EN_SEGUIMIENTO`
- `AJUSTANDO`
- `APROBADA`
- `RECHAZADA`
- `VENCIDA`

Etiquetas visibles sugeridas en tracker:

- Borrador, Falta informacion, Calculada, Emitida, Enviada, En seguimiento, Ajustando, Aprobada, Rechazada, Vencida.

## 2) Definicion y checklist por estado

| Estado | Descripcion | Condicion minima para entrar |
|---|---|---|
| BORRADOR | Registro inicial en trabajo interno. | Cliente y consulta creados. |
| FALTA_INFORMACION | No se puede cotizar por faltantes tecnicos/comerciales. | Campo `datos_faltantes` no vacio. |
| CALCULADA | Cotizacion calculada (BOM/subtotal/IVA/total) pero aun no emitida formalmente. | `subtotal`, `iva_22`, `total` presentes. |
| EMITIDA | Se genero referencia/version + artefactos documentales. | `quote_ref`, `version`, `editable_url`, `pdf_url`, `folder_url`. |
| ENVIADA | Cotizacion emitida y enviada al cliente. | `sent_at` y canal de envio definidos. |
| EN_SEGUIMIENTO | Esperando respuesta o negociacion activa. | `proxima_accion` y `fecha_proxima_accion` definidas. |
| AJUSTANDO | Revision de alcance/precio para nueva version. | Motivo de ajuste registrado. |
| APROBADA | Cliente acepta la cotizacion. Estado final. | Fecha de aprobacion y responsable. |
| RECHAZADA | Cliente no avanza con la cotizacion. Estado final. | Motivo de rechazo registrado. |
| VENCIDA | Supero vigencia sin cierre. Puede reabrirse. | Fecha de vigencia expirada. |

## 3) Transiciones permitidas

| Estado actual | Puede pasar a |
|---|---|
| BORRADOR | FALTA_INFORMACION, CALCULADA, RECHAZADA |
| FALTA_INFORMACION | BORRADOR, CALCULADA, VENCIDA |
| CALCULADA | EMITIDA, AJUSTANDO, FALTA_INFORMACION, VENCIDA |
| EMITIDA | ENVIADA, AJUSTANDO, VENCIDA |
| ENVIADA | EN_SEGUIMIENTO, APROBADA, RECHAZADA, AJUSTANDO, VENCIDA |
| EN_SEGUIMIENTO | APROBADA, RECHAZADA, AJUSTANDO, VENCIDA |
| AJUSTANDO | CALCULADA, EMITIDA, FALTA_INFORMACION, VENCIDA |
| APROBADA | (sin salida) |
| RECHAZADA | (sin salida) |
| VENCIDA | AJUSTANDO, RECHAZADA |

## 4) Transiciones prohibidas (ejemplos)

- `BORRADOR -> APROBADA` (falta emision/envio/seguimiento)
- `FALTA_INFORMACION -> EMITIDA` (no hay calculo validado)
- `CALCULADA -> APROBADA` (no hubo envio formal)
- `APROBADA -> cualquier otro` (estado final)
- `RECHAZADA -> cualquier otro` (estado final)

## 5) Reglas operativas obligatorias

1. Para `EMITIDA` deben existir links de carpeta, editable y PDF.
2. Para `ENVIADA` debe quedar fecha/hora y canal de envio.
3. `AJUSTANDO` siempre dispara nueva version (`V2+`) al volver a emitir.
4. `APROBADA` y `RECHAZADA` cierran la oportunidad.
5. `VENCIDA` no puede convertirse en `APROBADA` sin pasar por `AJUSTANDO` y nueva emision.

## 6) Hooks de automatizacion sugeridos

- Al entrar en `EMITIDA`:
  - congelar `quote_ref` y `version`
  - escribir links en tracker
- Al entrar en `ENVIADA`:
  - setear `sent_at`
  - crear tarea de seguimiento (48h)
- Al entrar en `VENCIDA`:
  - alertar responsable
  - mover a cola de reactivacion
- Al entrar en `APROBADA`:
  - cerrar tareas abiertas
  - registrar resultado final

## 7) Criterio de validacion tecnica

Se debe rechazar cualquier update de estado que:

1. no respete la matriz de transiciones;
2. no cumpla condiciones minimas del estado destino;
3. intente reescribir PDF de una version ya emitida.
