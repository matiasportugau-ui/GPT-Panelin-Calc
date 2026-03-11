# Arquitectura v5.0 — GPT Panelin Calc

## Diagrama de Componentes

```
┌─────────────────────────────────────────────┐
│              USUARIO (ChatGPT)               │
│  "Cotización ISODEC 100mm, techo 5x11m"     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│     GPT PANELIN v5.0 (Cerebro Conversacional)│
│                                             │
│  ✅ Conversar con el cliente                │
│  ✅ Extraer parámetros (NLP)                │
│  ✅ Validar datos mínimos                   │
│  ✅ Interpretar resultados → conversación   │
│  ✅ Evaluación ventas + entrenamiento       │
│  ❌ NO calcula precios/BOM                  │
│  ❌ NO genera PDF                           │
└──────────────┬──────────────────────────────┘
               │ GPT Action (API REST)
               ▼
┌─────────────────────────────────────────────┐
│   CALCULADORA BMC API (Motor Programático)   │
│                                             │
│  ✅ Cálculos deterministas (techo/pared/BOM)│
│  ✅ SKUs y precios desde catalog_real.csv   │
│  ✅ Autoportancia + validaciones técnicas   │
│  ✅ Generación PDF                          │
│  ✅ Conversión DOCX → PDF (LibreOffice)     │
│  ✅ JSON estructurado como response         │
│                                             │
│  POST /api/cotizar       → cotización       │
│  POST /api/pdf           → PDF cotización   │
│  POST /api/convert-docx  → DOCX → PDF      │
│  GET  /api/productos     → catálogo         │
│  GET  /api/autoportancia → validaciones     │
└─────────────────────────────────────────────┘
```

## Estructura del Repositorio

```
GPT-Panelin-Calc/
├── gpt/                    # Cerebro conversacional
│   ├── Panelin_GPT_config_v5.json
│   ├── gpt_action_schema.yaml
│   └── kb/
│       ├── PANELIN_TRAINING_GUIDE.md
│       └── PANELIN_QUOTATION_PROCESS.md
│
├── calculadora/            # Motor programático (API)
│   ├── src/
│   │   ├── engines/        # Lógica de cálculo
│   │   │   ├── techo.js
│   │   │   ├── pared.js
│   │   │   ├── precios.js
│   │   │   ├── bom.js
│   │   │   └── autoportancia.js
│   │   ├── data/
│   │   │   ├── catalog.js          # Resuelve precios y SKUs desde el CSV
│   │   │   ├── catalog_real.csv    # Catálogo maestro de productos BMC
│   │   │   └── precios.json        # Precios de respaldo (legacy)
│   │   ├── api/
│   │   │   ├── server.js
│   │   │   └── routes.js
│   │   └── pdf/
│   │       ├── generator.js
│   │       └── docx-converter.js
│   └── tests/
│
├── frontend/               # UI standalone (backward compatible)
│   └── PanelinCalculadoraV3.jsx
│
└── docs/
    ├── INTEGRATION.md
    ├── ARCHITECTURE.md
    ├── MIGRATION_FROM_V3.md
    ├── NEXT_STEPS.md
    └── DEPLOYMENT.md
```

## Principios de Diseño

### Separación de Responsabilidades
- **GPT**: Lenguaje natural, ventas, extracción de parámetros
- **API**: Cálculos deterministas, SKUs reales, precios, PDF
- **Frontend**: UI standalone para uso directo

### Fuente Única de Verdad
- Precios y SKUs: `calculadora/src/data/catalog_real.csv` indexado por `catalog.js`
- IVA: 22%, SIN incluir en unitarios, aplicado al total

### Determinismo
- Todos los cálculos usan `Math.ceil()` para cantidades
- No hay IA generativa en el motor de cálculo
- Mismos inputs = mismos outputs, siempre
