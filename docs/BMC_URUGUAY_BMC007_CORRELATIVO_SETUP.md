# BMC-007 - Correlativo robusto con lock

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Objetivo

Generar `REF_COTIZACION` unica con formato oficial:

`BMC-COT-AAAA-NNNN`

sin colisiones en ejecuciones concurrentes.

## 2) Implementacion incluida

Archivo:

- `scripts/apps-script/bmc-tracker/Code.gs`

Funciones clave:

- `reserveNextQuoteRef_()`: reserva correlativo con `LockService`.
- `assignQuoteRefIfMissing_()`: asigna referencia solo si la fila no tiene.
- `assignQuoteRefToActiveRow()`: accion manual desde menu.
- `showSequenceStatus()`: muestra secuencia actual del anio.
- `setSequenceForYear(year, value)`: utilidad de soporte controlado.

Persistencia:

- `PropertiesService.getScriptProperties()`
- clave por anio: `BMC_QUOTE_SEQ_{AAAA}`

## 3) Regla de concurrencia

Se usa `LockService.getScriptLock().waitLock(30000)` para serializar reserva de correlativos.

Con esto:

1. un solo proceso incrementa la secuencia a la vez;
2. se evita duplicar referencias en emisiones simultaneas.

## 4) Disparo automatico

En `onEdit(e)`:

- si `Estado_cotizacion` cambia a `Emitida` o `Enviada`:
  - se asigna `REF_COTIZACION` si falta;
  - se setea `VERSION = 1` si falta;
  - se setea `FECHA_EMISION` si falta.

## 5) Operacion manual

Menu Google Sheets -> `BMC Tracker`:

- `Asignar REF a fila actual`
- `Ver secuencia actual`

Uso recomendado:

1. Seleccionar una celda de la fila objetivo en `Tracker`.
2. Ejecutar `Asignar REF a fila actual`.

## 6) Criterios de aceptacion (BMC-007)

Cumple BMC-007 si:

1. cada nueva emision obtiene `BMC-COT-AAAA-NNNN` unico;
2. no hay duplicados bajo concurrencia normal;
3. no se reasigna referencia si la fila ya tiene `REF_COTIZACION`;
4. secuencia queda persistida aun cerrando/reabriendo la planilla.

## 7) Soporte operativo

Para reset o ajuste controlado de secuencia:

1. abrir Apps Script;
2. ejecutar `setSequenceForYear(2026, 125)` solo por administrador;
3. documentar motivo del ajuste en bitacora interna.

No reducir secuencia en produccion sin auditoria, para evitar reutilizacion accidental de referencias.
