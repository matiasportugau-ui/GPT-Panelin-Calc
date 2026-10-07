# BMC Uruguay - Estructura final de columnas del tracker (BMC-004)

Owner: A2 Apps Script  
Estado: Congelado para MVP

## 1) Columnas canonicas

| # | Campo tecnico | Etiqueta visible | Tipo | Fuente | Requerido |
|---|---|---|---|---|---|
| 1 | `fecha_ingreso` | Fecha | date | manual | si |
| 2 | `cliente_nombre` | Cliente | string | manual | si |
| 3 | `telefono` | Telefono | string | manual | no |
| 4 | `origen` | Origen | enum | manual | si |
| 5 | `consulta_pedido` | Pedido | string | manual | si |
| 6 | `escenario` | Escenario | enum | manual | si |
| 7 | `familia` | Familia | string | manual | no |
| 8 | `espesor_mm` | Espesor (mm) | integer | manual | no |
| 9 | `ancho_m` | Ancho (m) | number | manual | no |
| 10 | `largo_m` | Largo (m) | number | manual | no |
| 11 | `color` | Color | string | manual | no |
| 12 | `prioridad` | Prioridad | enum | manual/auto | si |
| 13 | `estado_cotizacion` | Estado cotizacion | enum | manual/auto | si |
| 14 | `responsable` | Responsable | enum | manual/auto | no |
| 15 | `proxima_accion` | Proxima accion | string | manual | no |
| 16 | `fecha_proxima_accion` | Fecha proxima accion | date | manual | no |
| 17 | `datos_faltantes` | Datos faltantes | string | manual | no |
| 18 | `observaciones` | Observaciones | string | manual | no |
| 19 | `quote_ref` | REF_COTIZACION | string | automatica | no |
| 20 | `version` | VERSION | integer | automatica | no |
| 21 | `fecha_emision` | FECHA_EMISION | datetime | automatica | no |
| 22 | `subtotal` | SUBTOTAL | number | automatica | no |
| 23 | `iva_22` | IVA_22 | number | automatica | no |
| 24 | `total` | TOTAL | number | automatica | no |
| 25 | `link_editable` | LINK_EDITABLE | url | automatica | no |
| 26 | `link_pdf` | LINK_PDF | url | automatica | no |
| 27 | `link_carpeta` | LINK_CARPETA | url | automatica | no |
| 28 | `dias_abiertos` | Dias abiertos | integer | formula | no |
| 29 | `vencido` | Vencido | enum(si/no) | formula | no |
| 30 | `score_prioridad` | Score prioridad | number | formula | no |
| 31 | `semaforo` | Semaforo | enum | formula | no |
| 32 | `resultado_final` | Resultado final | enum | manual | no |
| 33 | `created_at` | Created at | datetime | automatica | si (sistema) |
| 34 | `updated_at` | Updated at | datetime | automatica | si (sistema) |

## 2) Valores permitidos (validaciones)

### `origen`
- `WA`
- `LL`
- `EM`
- `CL`
- `WEB`
- `OTRO`

### `escenario`
- `solo_techo`
- `solo_fachada`
- `techo_fachada`
- `camara_frig`

### `prioridad`
- `Alta`
- `Media`
- `Baja`
- `Sin prioridad`

### `estado_cotizacion` (etiqueta visible)
- `Borrador`
- `Falta informacion`
- `Calculada`
- `Emitida`
- `Enviada`
- `En seguimiento`
- `Ajustando`
- `Aprobada`
- `Rechazada`
- `Vencida`

### `resultado_final`
- `Abierto`
- `Ganado`
- `Perdido`
- `Descartado`

### `semaforo`
- `Rojo`
- `Amarillo`
- `Verde`

## 3) Mapa de responsabilidad de edicion

## Manual (usuario comercial)

- `fecha_ingreso`
- `cliente_nombre`
- `telefono`
- `origen`
- `consulta_pedido`
- `escenario`
- `familia`
- `espesor_mm`
- `ancho_m`
- `largo_m`
- `color`
- `prioridad` (si no hay score automatico)
- `estado_cotizacion` (segun permisos)
- `responsable`
- `proxima_accion`
- `fecha_proxima_accion`
- `datos_faltantes`
- `observaciones`
- `resultado_final`

## Automatica (script/backend)

- `quote_ref`
- `version`
- `fecha_emision`
- `subtotal`
- `iva_22`
- `total`
- `link_editable`
- `link_pdf`
- `link_carpeta`
- `created_at`
- `updated_at`

## Formula

- `dias_abiertos`
- `vencido`
- `score_prioridad`
- `semaforo`

## 4) Reglas operativas clave

1. No permitir `Emitida` sin `quote_ref`, `version` y los 3 links.
2. No permitir `Enviada` sin `fecha_emision` y canal registrado.
3. Toda nueva version debe actualizar `version` y links de la fila actual.
4. `quote_ref` es inmutable en revisiones; solo cambia `version`.
5. `updated_at` debe refrescarse en toda modificacion relevante.
