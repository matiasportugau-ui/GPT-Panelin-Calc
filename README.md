# GPT-Panelin-Calc

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18%2B-blue)
![Tests](https://img.shields.io/badge/Tests-69%20passing-brightgreen)
![Version](https://img.shields.io/badge/API-v5.1.0-blue)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)

Monorepo que unifica **GPT Panelin** (agente conversacional en ChatGPT) con **Calculadora BMC** (motor programático de cálculo de paneles sándwich) para **METALOG SAS — BMC Uruguay**.

---

## Arquitectura

```
Usuario (lenguaje natural)
        │
        ▼
GPT Panelin v5          Agente conversacional en ChatGPT
  · Extrae parámetros   · NO calcula — solo interpreta y presenta
  · Asesora al cliente  · Llama a la API para todo cálculo
        │ GPT Action (REST)
        ▼
Calculadora BMC API     Motor determinista (Node.js + Express + Vercel)
  · BOM con SKUs reales · Precios desde catalog_real.csv
  · Autoportancia       · IVA 22% al total final
  · PDF                 · logic_config.json editable en caliente
```

---

## Estado Actual — v5.1.0 (marzo 2026)

| Componente | Estado | Notas |
|---|---|---|
| API Backend | **Producción** | Vercel serverless, 8 endpoints activos |
| Tests | **69/69 passing** | 3 suites: api, techo, pared |
| GPT Config | **Configurado** | v5 con GPT Action schema |
| Frontend React | **Disponible** | PanelinCalculadoraV3.jsx standalone |
| PDF | **Funcional** | jsPDF en Node.js, descarga directa |
| logic_config | **Editable en caliente** | POST /api/logica sin reiniciar |
| Agente QA Chrome | **Documentado** | Ver docs/AGENTE_QA_CHROME_PROMPT.md |

---

## Estructura del Monorepo

```
GPT-Panelin-Calc/
├── calculadora/                    # Motor programático — API REST
│   ├── api/
│   │   └── index.js                # Entry point Vercel
│   ├── src/
│   │   ├── api/
│   │   │   ├── server.js           # Express app
│   │   │   ├── routes.js           # Todos los endpoints
│   │   │   └── logica_html.js      # Generador manual HTML
│   │   ├── engines/
│   │   │   ├── bom.js              # Orquestador — generarCotizacion()
│   │   │   ├── techo.js            # Cálculo BOM techo (dos fases)
│   │   │   ├── pared.js            # Cálculo BOM pared/fachada (dos fases)
│   │   │   └── autoportancia.js    # Tabla de luces máximas
│   │   ├── data/
│   │   │   ├── catalog.js          # Resuelve precios desde CSV + config
│   │   │   ├── catalog_real.csv    # Catálogo maestro BMC (422 líneas)
│   │   │   ├── logic_config.json   # Fórmulas, accesorios, IVA — editable
│   │   │   └── config_loader.js    # Cache + hot-reload de config
│   │   └── pdf/
│   │       └── generator.js        # PDF con jsPDF
│   ├── tests/
│   │   ├── api.test.js             # 35 tests de integración
│   │   ├── techo.test.js           # 22 tests del engine techo
│   │   └── pared.test.js           # 12 tests del engine pared
│   ├── vercel.json                 # Config serverless Vercel
│   └── package.json
│
├── gpt/                            # Agente conversacional GPT
│   ├── Panelin_GPT_config_v5.json  # Instrucciones del GPT
│   ├── gpt_action_schema.yaml      # OpenAPI 3.1 schema para GPT Actions
│   └── kb/                         # Knowledge Base del GPT
│
├── frontend/                       # UI standalone React
│   └── PanelinCalculadoraV3.jsx    # Calculadora completa, sin backend
│
└── docs/
    ├── TECHNICAL_REFERENCE_v5.md   # Referencia técnica completa (1436 líneas)
    ├── AGENTE_QA_CHROME_PROMPT.md  # Prompt agente QA Chrome Extension
    ├── EJEMPLO_CALCULO_COMPLETO.md # Traza paso a paso con precios reales
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    └── INTEGRATION.md
```

---

## Quick Start

### Correr la API localmente

```bash
cd calculadora/
npm install
npm start          # Puerto 3000
npm run dev        # Con hot-reload (nodemon)
npm test           # 69 tests
```

### Verificar que funciona

```bash
curl http://localhost:3000/health
# → {"status":"ok","service":"calculadora-bmc","version":"5.1.0"}
```

### Cotización de ejemplo

```bash
curl -X POST http://localhost:3000/api/cotizar \
  -H "Content-Type: application/json" \
  -d '{
    "escenario": "solo_techo",
    "familia": "ISODEC_EPS",
    "espesor_mm": 100,
    "ancho_m": 5,
    "largo_m": 11,
    "lista_precios": "venta"
  }'
```

**Resultado esperado:** Total ~USD 3.894 con IVA + warning de autoportancia (luz 11m > máx 4.5m).

---

## Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/api/productos` | Catálogo: 8 familias con espesores disponibles |
| GET | `/api/autoportancia` | Tabla completa de luces máximas |
| GET | `/api/autoportancia?familia=X&espesor=Y&luz=Z` | Validar una luz específica |
| POST | `/api/cotizar` | Cotización completa con BOM, precios e IVA |
| POST | `/api/pdf` | PDF descargable de la cotización |
| GET | `/api/logica` | Ver logic_config.json completo (JSON) |
| GET | `/api/logica/md` | Ver lógica en Markdown |
| GET | `/api/logica/html` | Manual visual HTML imprimible |
| POST | `/api/logica` | Actualizar config en caliente (sin reiniciar) |

### Parámetros de POST /api/cotizar

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `escenario` | string | SI | `solo_techo` \| `solo_fachada` \| `techo_fachada` \| `camara_frigorifica` |
| `familia` | string | SI | Ver tabla de familias más abajo |
| `espesor_mm` | number | SI | Espesor del panel en mm |
| `ancho_m` | number | SI* | Ancho en metros (*usar esto O `cant_paneles`, nunca ambos) |
| `cant_paneles` | number | SI* | Cantidad de paneles (alternativa a `ancho_m`) |
| `largo_m` | number | SI | Largo/alto en metros |
| `lista_precios` | string | NO | `venta` (default) \| `web` |
| `apoyos` | number | NO | Apoyos intermedios (default: 0) |
| `estructura` | string | NO | `metal` (default) \| `hormigon` \| `mixto` |
| `tiene_cumbrera` | boolean | NO | Incluir cumbrera (default: false) |
| `tiene_canalon` | boolean | NO | Incluir canalón (default: false) |
| `tipo_gotero_frontal` | string | NO | `liso` (default) \| `greca` (solo ISOROOF) |
| `aberturas` | array | NO | `[{ancho, alto, cant}]` — deduce área neta en pared |
| `num_esq_ext` | number | NO | Esquineros exteriores (pared) |
| `num_esq_int` | number | NO | Esquineros interiores (pared) |
| `incl_k2` | boolean | NO | Incluir perfil K2 (default: true) |
| `color` | string | NO | Genera warnings si hay restricciones de color |
| `envio_usd` | number | NO | Costo de envío a incluir en cotización |

---

## Familias y Espesores Disponibles

### Techo

| Familia | Espesores (mm) | Ancho útil | Sistema fijación |
|---|---|---|---|
| ISODEC_EPS | 100, 150, 200, 250 | 1.12 m | Varilla-tuerca 3/8" |
| ISODEC_PIR | 50, 80 | 1.12 m | Varilla-tuerca 3/8" |
| ISOROOF_3G | 30, 40, 50, 80, 100 | 1.10 m | Caballete-tornillo |
| ISOROOF_FOIL | 30, 50 | 1.10 m | Caballete-tornillo |
| ISOROOF_PLUS | 50, 80 | 1.10 m | Caballete-tornillo |

### Pared / Fachada

| Familia | Espesores (mm) | Ancho útil | Uso típico |
|---|---|---|---|
| ISOPANEL_EPS | 50, 100, 150, 200, 250 | 1.00 m | Paredes y fachadas |
| ISOWALL_PIR | 50, 80, 100 | 1.00 m | Fachadas de alto rendimiento |
| ISOFRIG_PIR | 40, 60, 80, 100, 150 | 1.00 m | Cámaras frigoríficas |

---

## Lógica de Cálculo

### Paneles (techo y pared)
```
cant_paneles = ceil(ancho_m / au_m)
area_m2      = cant_paneles × au_m × largo_m
precio_panel = precio_m2 × au_m × largo_m     [precio unitario por panel]
subtotal     = precio_m2 × area_m2             [subtotal total de paneles]
```

En **pared**, el panel se cotiza sobre el **área neta** (descontando aberturas):
```
area_neta = area_bruta - suma(ancho × alto × cant de cada abertura)
```

### IVA
```
IVA = 22%
total_con_iva = subtotal_sin_iva × 1.22
```
Los precios unitarios son SIEMPRE sin IVA. El IVA aparece solo en `resumen`.

### Autoportancia — luz evaluada
```
luz_real = largo_m / (apoyos + 1)   [con apoyos intermedios]
luz_real = largo_m                   [sin apoyos]
```
Si `luz_real > luz_max` para la familia+espesor, la API devuelve un `warning` en el array `warnings[]`.

---

## Fuentes de Precios

El sistema resuelve precios en este orden:

1. **`catalog_real.csv`** — catálogo maestro (422 líneas, ~200 SKUs: goteros, paneles ISOROOF, ISOPANEL, etc.)
2. **`logic_config.json → accesorios`** — SKUs hardcodeados: varillas, tuercas, K2, caballetes, anclajes, selladores
3. **`catalog.js → PANEL_DEFS`** — precios hardcodeados para ISODEC_EPS (fuente: Wolf API, actualizar manualmente)

---

## Deploy

### API en Vercel
```bash
cd calculadora/
vercel --prod
```
`vercel.json` incluye `catalog_real.csv` en el bundle de la serverless function.

**URL producción:** `https://calculadora-bmc.vercel.app`
**GPT Action apunta a:** `https://calculadora-five-sand.vercel.app` *(verificar y actualizar si cambia)*

### Frontend React
`PanelinCalculadoraV3.jsx` es un componente standalone — copiar a cualquier proyecto React. Tiene precios propios hardcodeados para uso sin backend.

---

## Tests

```bash
cd calculadora && npm test
```

```
PASS tests/api.test.js      35 tests — endpoints, validaciones, escenarios completos
PASS tests/techo.test.js    22 tests — BOM techo, fijaciones, goteros, NaN guards
PASS tests/pared.test.js    12 tests — BOM pared, aberturas, perfiles

Tests: 69 passed | 3 suites | ~3s
```

---

## Documentación

| Documento | Descripción |
|---|---|
| [`docs/TECHNICAL_REFERENCE_v5.md`](docs/TECHNICAL_REFERENCE_v5.md) | Referencia técnica completa — fórmulas, SKUs, decisiones de diseño |
| [`docs/AGENTE_QA_CHROME_PROMPT.md`](docs/AGENTE_QA_CHROME_PROMPT.md) | Prompt para agente QA navegando la app en Chrome Extension |
| [`docs/EJEMPLO_CALCULO_COMPLETO.md`](docs/EJEMPLO_CALCULO_COMPLETO.md) | Traza completa de un cálculo real paso a paso |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Decisiones de arquitectura y trade-offs |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Guía de deploy Vercel + configuración GPT Action |
| [`docs/INTEGRATION.md`](docs/INTEGRATION.md) | Integración GPT ↔ API — flujo completo |

---

## Empresa

**METALOG SAS — BMC Uruguay**
RUT: 120403630012 | Maldonado, Uruguay
https://bmcuruguay.com.uy
