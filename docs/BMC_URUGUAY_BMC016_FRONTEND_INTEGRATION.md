# BMC-016 - Integracion frontend con backend de emision

Estado: Implementado (base)  
Owner objetivo: A5 Frontend

## 1) Entregable

Componente nuevo:

- `frontend/PanelinCalculadoraV4Api.jsx`

Objetivo:

1. capturar datos cliente + input tecnico;
2. llamar `POST /api/quotes/calculate`;
3. llamar `POST /api/quotes/issue`;
4. mostrar `quote_ref`, `version`, estado y link PDF.

## 2) Flujo implementado

1. usuario completa formulario;
2. `Calcular API` -> obtiene subtotal/IVA/total;
3. `Emitir API` -> crea version documental y devuelve links;
4. UI muestra referencia y version.

## 3) Endpoints usados

- `/api/quotes/calculate`
- `/api/quotes/issue`

## 4) Criterios de aceptacion (BMC-016)

Cumple si:

1. desde frontend se puede calcular y emitir;
2. UI refleja `quote_ref` y `version`;
3. UI muestra link PDF de la version emitida.
