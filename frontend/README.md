# Frontend — Calculadora Panelin Standalone

## Descripción
`PanelinCalculadoraV3.jsx` es el componente React standalone de la calculadora Panelin.
Funciona de manera independiente sin requerir la API backend.

## Uso Standalone

```bash
# Instalar en tu proyecto React
cp PanelinCalculadoraV3.jsx src/components/

# Dependencias requeridas
npm install react react-dom
```

```jsx
import PanelinCalculadoraV3 from './components/PanelinCalculadoraV3';

function App() {
  return <PanelinCalculadoraV3 />;
}
```

## Compatibilidad con v4.0
El componente frontend standalone (v3) mantiene compatibilidad retroactiva.
Para la arquitectura v4.0 con API backend, usar la `calculadora/` API con GPT Action.

## Diferencias v3 vs v4.0

| Característica | v3 (standalone) | v4.0 (API) |
|---|---|---|
| Cálculos | En el componente React | Servidor Express |
| Precios | Hardcoded en JSX | `precios.json` centralizado |
| PDF | jsPDF en browser | jsPDF en Node.js |
| Integración GPT | No | Sí (GPT Actions) |
| IVA | Calculado en UI | API devuelve desglose |
