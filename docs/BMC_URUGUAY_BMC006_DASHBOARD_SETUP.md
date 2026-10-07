# BMC-006 - Dashboard gerencial minimo

Estado: Implementado (base MVP)  
Owner objetivo: A2 Apps Script

## 1) Alcance de esta entrega

El dashboard queda generado por el mismo modulo Apps Script de BMC-005:

- Script: `scripts/apps-script/bmc-tracker/Code.gs`
- Funcion nueva: `setupBmcDashboard()`
- Hoja objetivo: `Dashboard`

Tambien se crea automaticamente al correr `setupBmcTracker()`.

## 2) KPIs implementados

En la parte superior del dashboard:

1. `Leads abiertos`
2. `Alta prioridad abiertas`
3. `Vencidos abiertos`
4. `Pendientes de cotizacion`

Estos KPIs leen directamente desde `Tracker`, por lo que se actualizan automaticamente al cambiar datos.

## 3) Resumenes incluidos

### 3.1 Por responsable

Tabla:

- Responsable
- Abiertos
- Vencidos

### 3.2 Por estado de cotizacion

Tabla:

- Estado
- Cantidad

## 4) Como activarlo

1. Abrir la planilla en Google Sheets.
2. Menu `BMC Tracker`.
3. Ejecutar:
   - `Inicializar estructura` (crea Tracker + Config + Dashboard), o
   - `Recrear dashboard` (solo dashboard).

## 5) Criterios de aceptacion (BMC-006)

Cumple BMC-006 si:

1. Existe hoja `Dashboard` con los 4 KPIs minimos.
2. Existen tablas por responsable y por estado.
3. Los valores se recalculan al editar `Tracker`.

## 6) Limites de esta entrega

- No incluye indicadores financieros avanzados (ticket promedio, conversion por etapa, aging por monto).
- No incluye graficos embebidos (se puede agregar en iteracion posterior).
- No envia reportes automaticos por mail (queda para BMC-013/BMC-014).
