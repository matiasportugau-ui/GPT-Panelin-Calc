# GPT-Panelin-Calc

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18%2B-blue)
![License](https://img.shields.io/badge/License-No%20especificada-lightgrey)
![Tests](https://img.shields.io/badge/Tests-passing-brightgreen)

Monorepo que unifica **GPT Panelin** (cerebro conversacional) con **Calculadora BMC** (motor programático de cálculo) para paneles sándwich Panelin — BMC Uruguay.

## Resumen y explicación rápida

### ¿Qué es?
Es un sistema dividido en dos partes:

- **GPT Panelin**: conversa con el cliente, entiende qué necesita y captura los datos de la obra.
- **Calculadora BMC API**: hace los cálculos reales de materiales, BOM, precios, IVA y PDF.

### ¿Cómo funciona?
1. El cliente describe lo que necesita en lenguaje natural.
2. El GPT extrae parámetros como tipo de obra, familia de panel, espesor, ancho y largo.
3. El GPT llama a la API para cotizar.
4. La API devuelve una cotización exacta con:
   - ítems y cantidades,
   - SKUs reales,
   - subtotal,
   - IVA 22%,
   - total final,
   - warnings técnicos si aplica.
5. Si el cliente quiere, se genera un PDF con esa cotización.

### ¿Qué problema resuelve?
Evita que el GPT “invente” cálculos o precios. Toda la lógica sensible queda centralizada en la API para que las cotizaciones sean repetibles, auditables y consistentes.

## Arquitectura v5.0

```
Usuario (ChatGPT)
       ↓
GPT Panelin v5.0          →    Conversa, extrae parámetros, interpreta resultados
       ↓ GPT Action
Calculadora BMC API        →    Cálculos deterministas, BOM con SKUs reales, precios, PDF
```

## Antes vs Después

| Aspecto | Antes (repos separados) | Después (v5.0) |
|---------|------------------------|----------------|
| **IVA** | Ambiguo (incluido / al final) | ✅ Unificado: 22% al total, sin incluir en unitarios |
| **Precios / SKUs** | 6+ archivos JSON + hardcoded | ✅ Fuente principal: `catalog_real.csv` vía `catalog.js` (con algunas familias legacy hardcodeadas en `catalog.js`) |
| **BOM** | GPT generativo + engines separados | ✅ Solo engines deterministas vía API |
| **PDF** | reportlab (Python) + jsPDF (browser) | ✅ jsPDF en Node.js vía API |
| **Tests** | Sin tests | ✅ Tests unitarios + integración |
| **GPT tokens** | ~32KB instrucciones con fórmulas | ✅ ~120 líneas de config limpia |

## Estructura

```
GPT-Panelin-Calc/
├── gpt/                    # Cerebro conversacional
│   ├── Panelin_GPT_config_v5.json
│   ├── gpt_action_schema.yaml
│   └── kb/
├── calculadora/            # Motor programático (Express API)
│   ├── src/
│   │   ├── engines/        # techo.js, pared.js, bom.js, precios.js, autoportancia.js
│   │   ├── data/
│   │   │   ├── catalog.js          # Resuelve precios y SKUs
│   │   │   ├── catalog_real.csv    # Catálogo maestro de productos BMC
│   │   │   └── precios.json        # Precios de respaldo (legacy)
│   │   ├── api/            # server.js, routes.js
│   │   └── pdf/generator.js
│   └── tests/              # Tests Jest
├── frontend/               # UI standalone (backward compatible)
│   └── PanelinCalculadoraV3.jsx
└── docs/
    ├── INTEGRATION.md
    ├── ARCHITECTURE.md
    ├── MIGRATION_FROM_V3.md
    ├── NEXT_STEPS.md
    └── DEPLOYMENT.md
```

## Quick Start

### API Backend
```bash
cd calculadora/
npm install
npm start        # Producción
npm run dev      # Desarrollo con nodemon
npm test         # Tests Jest
```

### Endpoints
```
GET  /health                    → Estado del servicio
GET  /api/productos             → Catálogo de paneles (SKUs reales)
GET  /api/autoportancia         → Tabla de luces máximas
POST /api/cotizar               → Cotización completa con BOM + IVA
POST /api/pdf                   → PDF descargable
```

### Ejemplo cotización
```bash
curl -X POST http://localhost:3000/api/cotizar \
  -H "Content-Type: application/json" \
  -d '{
    "escenario": "solo_techo",
    "familia": "ISODEC_EPS",
    "espesor_mm": 100,
    "ancho_m": 5,
    "largo_m": 11,
    "lista_precios": "venta",
    "tiene_cumbrera": false,
    "tiene_canalon": false
  }'
```

Parámetros opcionales adicionales: `cant_paneles` (en lugar de `ancho_m`), `apoyos`, `num_aberturas`, `estructura` (`metal`|`hormigon`|`mixto`), `envio_usd`.

### Frontend Standalone
Copiar `frontend/PanelinCalculadoraV3.jsx` a cualquier proyecto React — funciona sin backend.

### GPT en OpenAI Builder
Ver `docs/DEPLOYMENT.md` para instrucciones de configuración del GPT Action.

## Deploy

- **API**: Vercel (`cd calculadora && vercel --prod`) → `https://calculadora-five-sand.vercel.app`
- **GPT**: OpenAI Builder con `gpt/gpt_action_schema.yaml`

## Documentación

- [**Pasos a seguir (setup completo)**](docs/NEXT_STEPS.md)
- [Integración completa](docs/INTEGRATION.md)
- [Arquitectura v5.0](docs/ARCHITECTURE.md)
- [Migración desde v3](docs/MIGRATION_FROM_V3.md)
- [Guía de deploy](docs/DEPLOYMENT.md)

## Empresa

**METALOG SAS — BMC Uruguay**  
RUT: 120403630012 | Maldonado, Uruguay  
🌐 https://bmcuruguay.com.uy
