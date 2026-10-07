# BMC-018 - Runbook operativo y soporte

Estado: Implementado (v1)

## 1) Componentes en operacion

1. Tracker + Apps Script (`scripts/apps-script/bmc-tracker/Code.gs`)
2. API calculadora/emision (`calculadora/src/api`)
3. Persistencia local de cotizaciones (`calculadora/storage`)

## 2) Arranque tecnico

## Backend

```bash
cd calculadora
npm install
npm start
```

## Tests

```bash
cd calculadora
npm test
```

## Apps Script

1. Copiar `Code.gs` en el proyecto vinculado a Google Sheets.
2. Configurar:
   - carpeta raiz Drive
   - plantilla editable
   - base URL de API
   - email de alertas

## 3) Operacion diaria sugerida

1. Cargar/actualizar leads en `Tracker`.
2. Revisar `Dashboard`.
3. Emitir cotizaciones por fila cuando esten listas.
4. Ejecutar resumen diario y cola de follow-up.

## 4) Procedimiento de rollback (aplicacion)

1. Identificar ultimo commit estable.
2. Revertir branch al commit estable.
3. Re-desplegar backend.
4. Mantener datos ya emitidos (no borrar `storage/quotes` productivo).

## 5) Procedimiento de rollback (Apps Script)

1. Abrir historial de versiones del proyecto Apps Script.
2. Restaurar version estable previa.
3. Validar menu y funciones clave (`setupBmcTracker`, emision API).

## 6) Incidentes comunes

## A. "No hay carpeta raiz configurada"

Resolver:

- menu `Configurar carpeta raiz Drive (ID)`.

## B. "No hay plantilla editable configurada"

Resolver:

- menu `Configurar plantilla editable (ID)`.

## C. Error API en emision

Resolver:

1. verificar base URL;
2. chequear endpoint `/health`;
3. revisar logs de backend;
4. validar que escenario/familia/medidas sean validos.

## D. Version ya existe

Resolver:

- reemitir sin forzar version manual;
- dejar que backend asigne siguiente `Vn`.

## 7) Politicas operativas

1. Nunca sobrescribir PDF emitido.
2. Toda revision crea nueva version.
3. `REF_COTIZACION` se mantiene inmutable entre versiones.
4. Cambios de estado deben quedar trazados.
