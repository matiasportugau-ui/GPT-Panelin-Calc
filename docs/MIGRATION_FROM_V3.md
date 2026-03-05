# Migración desde v3 — Repos Separados a v4.0

## Contexto: Problema Original

Los dos repositorios originales se bloqueaban entre sí:

| Conflicto | GPT-PANELIN-Final (v3) | Calculadora-BMC (v3) |
|-----------|------------------------|----------------------|
| **IVA** | "Incluido en precios" | "SIN IVA, al final" |
| **Precios** | 6+ archivos JSON | Hardcoded en JSX |
| **BOM** | bom_rules.json + IA | Engines programáticos |
| **PDF** | reportlab + Code Interpreter | jsPDF en browser |

## Cambios en v4.0

### GPT: Instrucciones simplificadas
**Eliminado:**
- Fórmulas de cotización (~32KB de instrucciones)
- Jerarquía de KB de 4 niveles para pricing
- bom_rules.json (duplicación con engines)
- Generación PDF con reportlab
- Referencias a múltiples archivos de precios

**Agregado:**
- Sección "CALCULADORA API" con flujo claro
- Regla: NUNCA calcular por cuenta propia
- Regla IVA unificada: "SIN IVA en unitarios, 22% al total"
- GPT Action apuntando a `https://calculadora-bmc.vercel.app`

### Calculadora: Extraída a API independiente

**Antes (v3):** `PanelinCalculadoraV3.jsx` (~90KB, ~1400 líneas)
- Engines embebidos en componente React
- Precios hardcoded en JSX
- PDF solo en browser

**Después (v4.0):** Express API en `calculadora/`
- Engines como módulos Node.js reutilizables
- Precios en `src/data/precios.json` (fuente única)
- PDF generado en servidor
- Tests unitarios e integración

## Guía de Migración

### Si tenías el GPT configurado
1. Reemplazar instrucciones con `gpt/Panelin_GPT_config_v4.json`
2. Agregar GPT Action usando `gpt/gpt_action_schema.yaml`
3. Apuntar Action a tu instancia de la Calculadora API

### Si usabas la Calculadora standalone
El componente `frontend/PanelinCalculadoraV3.jsx` se mantiene intacto.
Seguirá funcionando como siempre para uso directo en browser.

### Deploy de la API
Ver `docs/DEPLOYMENT.md` para instrucciones de deploy en Vercel.

## Compatibilidad Retroactiva

- `PanelinCalculadoraV3.jsx` → **intacto**, mismo comportamiento
- GPT → simplificado, misma personalidad y flujo de conversación
- Precios → mismos valores, ahora centralizados
- IVA → unificado en 22% SIN incluir en unitarios (antes era ambiguo)
