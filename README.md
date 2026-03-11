# GPT-Panelin-Calc

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18%2B-blue)
![License](https://img.shields.io/badge/License-No%20especificada-lightgrey)
![Tests](https://img.shields.io/badge/Tests-29%20passing-brightgreen)

Monorepo que unifica **GPT Panelin** (cerebro conversacional) con **Calculadora BMC** (motor programático de cálculo) para paneles sándwich Panelin — BMC Uruguay.

## Arquitectura v4.0

```
Usuario (ChatGPT)
       ↓
GPT Panelin v4.0          →    Conversa, extrae parámetros, interpreta resultados
       ↓ GPT Action
Calculadora BMC API        →    Cálculos deterministas, BOM, precios, PDF
```

## Antes vs Después

| Aspecto | Antes (repos separados) | Después (v4.0) |
|---------|------------------------|----------------|
| **IVA** | Ambiguo (incluido / al final) | ✅ Unificado: 22% al total, sin incluir en unitarios |
| **Precios** | 6+ archivos JSON + hardcoded | ✅ Fuente única: `calculadora/src/data/precios.json` |
| **BOM** | GPT generativo + engines separados | ✅ Solo engines deterministas vía API |
| **PDF** | reportlab (Python) + jsPDF (browser) | ✅ jsPDF en Node.js vía API |
| **Tests** | Sin tests | ✅ 24 tests unitarios + integración |
| **GPT tokens** | ~32KB instrucciones con fórmulas | ✅ ~120 líneas de config limpia |

## Estructura

```
GPT-Panelin-Calc/
├── gpt/                    # Cerebro conversacional
│   ├── Panelin_GPT_config_v4.json
│   ├── gpt_action_schema.yaml
│   └── kb/
├── calculadora/            # Motor programático (Express API)
│   ├── src/
│   │   ├── engines/        # techo.js, pared.js, bom.js, precios.js, autoportancia.js
│   │   ├── data/precios.json
│   │   ├── api/            # server.js, routes.js
│   │   └── pdf/generator.js
│   └── tests/              # 24 tests Jest
├── frontend/               # UI standalone (backward compatible)
│   └── PanelinCalculadoraV3.jsx
└── docs/
    ├── INTEGRATION.md
    ├── ARCHITECTURE.md
    ├── MIGRATION_FROM_V3.md
    └── DEPLOYMENT.md
```

## Quick Start

### API Backend
```bash
cd calculadora/
npm install
npm start        # Producción
npm run dev      # Desarrollo con nodemon
npm test         # 24 tests
```

### Endpoints
```
GET  /health                    → Estado del servicio
GET  /api/productos             → Catálogo de paneles
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
    "largo_m": 11
  }'
```

### Frontend Standalone
Copiar `frontend/PanelinCalculadoraV3.jsx` a cualquier proyecto React — funciona sin backend.

### GPT en OpenAI Builder
Ver `docs/DEPLOYMENT.md` para instrucciones de configuración del GPT Action.

## Deploy

- **API**: Vercel (`cd calculadora && vercel --prod`)
- **GPT**: OpenAI Builder con `gpt/gpt_action_schema.yaml`

## Documentación

- [**Pasos a seguir (setup completo)**](docs/NEXT_STEPS.md)
- [Backlog ejecutable por sprint (BMC Uruguay)](docs/BMC_URUGUAY_BACKLOG_SPRINTS.md)
- [ADR-001 Naming oficial (BMC Uruguay)](docs/BMC_URUGUAY_ADR_001_NAMING.md)
- [Maquina de estados de cotizacion (BMC Uruguay)](docs/BMC_URUGUAY_STATE_MACHINE.md)
- [Contratos de datos y esquemas (BMC Uruguay)](docs/BMC_URUGUAY_DATA_CONTRACTS.md)
- [Estructura final del tracker (BMC Uruguay)](docs/BMC_URUGUAY_TRACKER_COLUMNS.md)
- [BMC-005 Tracker base operativo (setup)](docs/BMC_URUGUAY_BMC005_TRACKER_SETUP.md)
- [BMC-006 Dashboard gerencial minimo (setup)](docs/BMC_URUGUAY_BMC006_DASHBOARD_SETUP.md)
- [BMC-007 Correlativo robusto con lock (setup)](docs/BMC_URUGUAY_BMC007_CORRELATIVO_SETUP.md)
- [BMC-008 Carpetas Drive y LINK_CARPETA (setup)](docs/BMC_URUGUAY_BMC008_DRIVE_FOLDERS_SETUP.md)
- [BMC-009 Editable por cotizacion y LINK_EDITABLE (setup)](docs/BMC_URUGUAY_BMC009_EDITABLE_SETUP.md)
- [BMC-010/011/012 Pipeline PDF + LINK_PDF + versionado](docs/BMC_URUGUAY_BMC010_011_012_PIPELINE.md)
- [BMC-013/014 Seguimiento automático y cola de follow-up](docs/BMC_URUGUAY_BMC013_BMC014_AUTOMATIONS.md)
- [BMC-015 Endpoints mínimos de cotización](docs/BMC_URUGUAY_BMC015_API_ENDPOINTS.md)
- [BMC-016 Integración frontend con backend emisión](docs/BMC_URUGUAY_BMC016_FRONTEND_INTEGRATION.md)
- [BMC-017 QA checklist E2E y regresión](docs/BMC_URUGUAY_BMC017_QA_CHECKLIST.md)
- [BMC-018 Runbook operativo y rollback](docs/BMC_URUGUAY_BMC018_RUNBOOK.md)
- [Cloud agents: setup base y caché recomendado](docs/CLOUD_AGENT_ENV_SETUP.md)
- [AI Console multi-provider (OpenAI/Gemini/Grok)](docs/BMC_AI_AUTOMATION_CONSOLE.md)
- [Integración completa](docs/INTEGRATION.md)
- [Arquitectura v4.0](docs/ARCHITECTURE.md)
- [Migración desde v3](docs/MIGRATION_FROM_V3.md)
- [Guía de deploy](docs/DEPLOYMENT.md)

## Empresa

**METALOG SAS — BMC Uruguay**  
RUT: 120403630012 | Maldonado, Uruguay  
🌐 https://bmcuruguay.com.uy