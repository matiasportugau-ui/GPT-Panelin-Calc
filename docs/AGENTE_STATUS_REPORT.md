# STATUS REPORT — Calculadora BMC Panelin
**Fecha:** 2026-03-07 | **Versión API:** 5.1.0 | **Branch:** claude/deploy-gpt-panelin-v5-DXeCm

---

## 1. RESUMEN EJECUTIVO

El sistema está en **producción funcional**. La API corre en Vercel como serverless function, tiene 69 tests pasando, y genera cotizaciones deterministas con BOM completo, precios reales del catálogo, IVA 22% y warnings de autoportancia.

El último ciclo de desarrollo (v5.1 → v5.3) completó:
- Paridad funcional con el frontend standalone (v5.1)
- Archivo maestro `logic_config.json` editable en caliente (v5.2)
- Manual visual HTML en `/api/logica/html` (v5.3)
- Arquitectura two-phase batch para resolución de precios (refactor)
- Documentación técnica completa (1436 líneas)
- Prompt para agente QA en Chrome Extension

---

## 2. COMPONENTES — ESTADO DETALLADO

### 2.1 API Backend (`calculadora/`)

**Estado: PRODUCCIÓN**

| Archivo | Función | Estado |
|---|---|---|
| `src/api/server.js` | Express app, middlewares, CORS | OK |
| `src/api/routes.js` | 10 endpoints definidos | OK |
| `src/api/logica_html.js` | Generador HTML del manual | OK |
| `src/engines/bom.js` | Orquestador `generarCotizacion()` | OK |
| `src/engines/techo.js` | Cálculo BOM techo — 2 fases | OK |
| `src/engines/pared.js` | Cálculo BOM pared — 2 fases | OK |
| `src/engines/autoportancia.js` | Tabla luces máximas + validación | OK |
| `src/data/catalog.js` | Resolución de precios (CSV + config + PANEL_DEFS) | OK |
| `src/data/catalog_real.csv` | Catálogo maestro 422 líneas | OK |
| `src/data/logic_config.json` | Config editable: fórmulas, accesorios, IVA | OK |
| `src/data/config_loader.js` | Cache + hot-reload | OK |
| `src/pdf/generator.js` | PDF con jsPDF | OK |
| `api/index.js` | Entry point Vercel | OK |
| `vercel.json` | Serverless config con CSV incluido | OK |

### 2.2 Tests

**Estado: 69/69 PASSING**

```
tests/api.test.js     35 tests
  · GET /health, /api/productos, /api/autoportancia
  · POST /api/cotizar — todos los escenarios
  · Validaciones de borde (campos faltantes, tipos inválidos, ambigüedad ancho+cant)
  · SKUs reales verificados en respuesta
  · Escenario camara_frigorifica — 3 secciones
  · POST /api/pdf — los 3 modos de invocación
  · GET/POST /api/logica — edición en caliente

tests/techo.test.js   22 tests
  · calcCantidadesTecho — todas las familias
  · Sistema varilla_tuerca (ISODEC_EPS, ISODEC_PIR)
  · Sistema caballete_tornillo (ISOROOF_*)
  · Sistema tmome (ISOPANEL, ISOWALL, ISOFRIG)
  · Input por cant_paneles
  · NaN guards con ISOROOF y ISODEC+canalón

tests/pared.test.js   12 tests
  · calcCantidadesPared — área neta vs bruta
  · Aberturas (descuento correcto)
  · Perfiles U, K2, esquineros
  · Remaches, selladores, anclajes
```

### 2.3 GPT Config (`gpt/`)

**Estado: CONFIGURADO** *(pendiente verificar URL del GPT Action)*

| Archivo | Contenido | Estado |
|---|---|---|
| `Panelin_GPT_config_v5.json` | Instrucciones del GPT + reglas de presentación | OK |
| `gpt_action_schema.yaml` | OpenAPI 3.1 — cotizar, pdf, productos, autoportancia | OK |
| `kb/` | Knowledge Base con flujo de cotización | OK |

> **Atención:** El schema apunta a `https://calculadora-five-sand.vercel.app`. Verificar que esta URL esté activa o actualizar a `https://calculadora-bmc.vercel.app`.

### 2.4 Frontend React (`frontend/`)

**Estado: DISPONIBLE — standalone**

`PanelinCalculadoraV3.jsx` es un componente React autónomo. Tiene sus propios precios hardcodeados (pueden diferir levemente del catálogo CSV de la API). Funciona sin backend para uso offline o embed directo.

**Diferencia a tener en cuenta:** Los precios del frontend pueden estar desactualizados respecto a `catalog_real.csv`. En caso de discrepancia, la API es la fuente de verdad.

### 2.5 Documentación (`docs/`)

| Documento | Líneas | Estado |
|---|---|---|
| `TECHNICAL_REFERENCE_v5.md` | 1436 | Completo |
| `AGENTE_QA_CHROME_PROMPT.md` | 467 | Completo — nuevo |
| `EJEMPLO_CALCULO_COMPLETO.md` | ~200 | Completo |
| `CALCULADORA_REPORTE.md` | — | Legado |
| `ARCHITECTURE.md` | — | OK |
| `DEPLOYMENT.md` | — | OK (verificar URLs) |
| `INTEGRATION.md` | — | OK |

---

## 3. ENDPOINTS — COMPORTAMIENTO VERIFICADO

### GET /health
```json
{"status":"ok","service":"calculadora-bmc","version":"5.1.0"}
```

### GET /api/productos
Devuelve 8 familias con espesores:
```
ISOROOF_3G:   [30, 40, 50, 80, 100]
ISOROOF_FOIL: [30, 50]
ISOROOF_PLUS: [50, 80]
ISODEC_PIR:   [50, 80]
ISODEC_EPS:   [100, 150, 200, 250]
ISOPANEL_EPS: [50, 100, 150, 200, 250]
ISOWALL_PIR:  [50, 80, 100]
ISOFRIG_PIR:  [40, 60, 80, 100, 150]
```

### POST /api/cotizar — Escenarios soportados
| Escenario | Secciones generadas |
|---|---|
| `solo_techo` | 1: techo |
| `solo_fachada` | 1: pared |
| `techo_fachada` | 2: techo + pared |
| `camara_frigorifica` | 3: techo + pared_frontal_posterior + pared_lateral |

> `camara_frigorifica`: el alto de paredes es **3m fijo** en el código actual.

### POST /api/cotizar — Estructura de respuesta
```json
{
  "ok": true,
  "cotizacion": {
    "cotizacion_id": "uuid-v4",
    "fecha": "2026-03-07",
    "escenario": "solo_techo",
    "familia": "ISODEC_EPS",
    "espesor_mm": 100,
    "lista_precios": "venta",
    "secciones": [{
      "tipo": "techo",
      "familia": "ISODEC_EPS",
      "espesor_mm": 100,
      "ancho_m": 5.6,
      "largo_m": 11,
      "area_m2": 61.6,
      "cant_paneles": 5,
      "sist_fijacion": "varilla_tuerca",
      "items": [{
        "sku": "ISODEC_EPS_100",
        "descripcion": "ISODEC EPS 100mm",
        "cantidad": 5,
        "unidad": "panel",
        "precio_unit": 567.66,
        "subtotal": 2837.91
      }, ...],
      "subtotal": 3192.16
    }],
    "resumen": {
      "subtotal_sin_iva": 3192.16,
      "iva_22": 702.28,
      "total_con_iva": 3894.44,
      "moneda": "USD"
    },
    "warnings": [
      "ADVERTENCIA: luz 11m supera el máximo 4.5m para ISODEC_EPS 100mm. Verificar estructura."
    ],
    "nota": "Precios sin IVA. IVA 22% aplicado al total final. Consultar disponibilidad de stock."
  }
}
```

---

## 4. FÓRMULAS CLAVE — REFERENCIA RÁPIDA

### Paneles
```
cant_paneles    = ceil(ancho_m / au_m)
area_m2         = cant_paneles × au_m × largo_m
precio_unit     = precio_m2 × au_m × largo_m     [por panel]
subtotal_panel  = precio_m2 × area_m2
```

### Fijación Techo — Varilla-Tuerca (ISODEC_EPS, ISODEC_PIR)
```
apoyos_reales   = max(apoyos, 2)
ptos_fijacion   = ceil((cant × apoyos × 2) + (largo × 2 / 2.5))
cant_varillas   = ceil(ptos × 0.25)
tuercas         = varillas × 2
arandelas       = varillas × 2
tortuga_pp      = varillas × 2
[si hormigon: tacos_exp = ptos_fijacion]
```

### Fijación Techo — Caballete-Tornillo (ISOROOF_*)
```
caballetes      = ceil((cant × 3 × (largo/2.9 + 1)) + (largo × 2 / 0.30))
cajas_agujas    = ceil(caballetes × 2 / 100)
```

### Goteros Techo
```
gotero_frontal  = ceil(ancho_efectivo / 3.03)
gotero_superior = ceil(ancho_efectivo / 3.03)
gotero_lateral  = ceil(largo_m / 3.0) × 2
```

### Selladores Techo
```
cinta_butilo    = max(1, ceil((cant-1) × largo / 22.5))   [rollos]
silicona        = ceil(cant × 0.5)                         [cartuchos]
```

### Pared
```
area_bruta      = cant × au_m × largo_m
area_neta       = area_bruta - Σ(aberturas)
perfil_u        = ceil(2 × ancho_efec / 3.0)
k2              = (cant - 1) × ceil(largo / 3.0)
anclaje_h       = ceil(ancho_efec / 0.30)
remaches        = max(1, ceil(cant × 2 / 1000))  [cajas]
ml_juntas       = (cant-1) × largo + ancho_efec × 2
silicona        = ceil(ml_juntas / 8)
butilo          = max(1, ceil((cant-1) × largo / 22.5))
tornillos_tmome = ceil(area_neta × 5.5)   [si estructura=metal]
```

### IVA y Totales
```
iva_22          = round(subtotal_sin_iva × 0.22, 2)
total_con_iva   = subtotal_sin_iva + iva_22
```

---

## 5. TABLA DE AUTOPORTANCIA

| Familia | Espesor (mm) | Luz máx (m) |
|---|---|---|
| ISODEC_EPS | 100 | 4.5 |
| ISODEC_EPS | 150 | 5.5 |
| ISODEC_EPS | 200 | 6.5 |
| ISODEC_EPS | 250 | 7.5 |
| ISODEC_PIR | 50 | 3.5 |
| ISODEC_PIR | 80 | 4.5 |
| ISOROOF_3G | 30 | 2.5 |
| ISOROOF_3G | 40 | 3.0 |
| ISOROOF_3G | 50 | 3.5 |
| ISOROOF_3G | 80 | 4.5 |
| ISOROOF_3G | 100 | 5.0 |
| ISOROOF_FOIL | 30 | 2.5 |
| ISOROOF_FOIL | 50 | 3.5 |
| ISOROOF_PLUS | 50 | 3.5 |
| ISOROOF_PLUS | 80 | 4.5 |
| ISOPANEL_EPS | 50 | 3.0 |
| ISOPANEL_EPS | 100 | 5.0 |
| ISOPANEL_EPS | 150 | 6.0 |
| ISOPANEL_EPS | 200 | 7.0 |
| ISOPANEL_EPS | 250 | 7.5 |
| ISOWALL_PIR | 50 | 3.5 |
| ISOWALL_PIR | 80 | 4.5 |
| ISOWALL_PIR | 100 | 5.5 |
| ISOFRIG_PIR | 40 | 3.0 |
| ISOFRIG_PIR | 60 | 3.5 |
| ISOFRIG_PIR | 80 | 4.5 |
| ISOFRIG_PIR | 100 | 5.0 |
| ISOFRIG_PIR | 150 | 6.0 |

---

## 6. PRECIOS DE REFERENCIA (USD excl. IVA — lista venta)

### Paneles ISODEC_EPS (hardcodeados en `catalog.js`)
| Espesor | USD/m² venta |
|---|---|
| 100mm | 46.07 |
| 150mm | 51.50 |
| 200mm | 57.00 |
| 250mm | 62.50 |

### Accesorios clave (hardcodeados en `logic_config.json`)
| SKU | Descripción | Venta | Web |
|---|---|---|---|
| VARILLA38 | Varilla roscada 3/8" | 3.12 | 3.64 |
| TUERCA38 | Tuerca 3/8" galv. | 0.12 | 0.07 |
| ARCA38 | Arandela carrocero 3/8" | 1.68 | 0.64 |
| ARAPP | Tortuga PVC | 1.27 | 1.48 |
| TACEXP38 | Taco expansivo 3/8" | 0.96 | 1.12 |
| CABALLETE | Caballete trapezoidal | 0.50 | 0.46 |
| TORN_AGUJA | Tornillo aguja 5" (×100) | 17.00 | 17.00 |
| K2 | Perfil K2 3m | 8.59 | 10.48 |
| ESQ-EXT | Esquinero exterior 3m | 8.59 | 10.48 |
| ESQ-INT | Esquinero interior 3m | 8.59 | 10.48 |
| ANCLAJE_H | Kit anclaje H° | 0.09 | 0.03 |
| MEMBRANA | Membrana autoadhesiva | 16.62 | 20.28 |
| ESPUMA_PU | Espuma PU 750cm³ | 25.46 | 31.06 |

> Los goteros, babetas, canalones, paneles ISOROOF/ISOPANEL tienen precios en `catalog_real.csv`.

---

## 7. RESTRICCIONES DE COLOR POR FAMILIA

| Familia | Colores | Restricciones |
|---|---|---|
| ISODEC_EPS | Blanco, Gris, Rojo | Gris/Rojo: solo 100-150mm, +20 días hábiles |
| ISODEC_PIR | Blanco, Gris | Sin restricciones |
| ISOROOF_3G | Terracota, Gris, Blanco, Rojo | Blanco: mínimo 500 m² por pedido |
| ISOROOF_FOIL | Gris, Rojo | Sin restricciones |
| IROROOF_PLUS | Blanco, Gris, Rojo | Mínimo 800 m² (todos los colores) |
| ISOPANEL_EPS | Blanco, Gris, Rojo | Sin restricciones |
| ISOWALL_PIR | Blanco, Gris | Sin restricciones |
| ISOFRIG_PIR | Blanco | Solo blanco sanitario |

---

## 8. LONGITUDES MÍNIMAS Y MÁXIMAS POR FAMILIA

| Familia | Mín (m) | Máx (m) |
|---|---|---|
| ISODEC_EPS | 2.3 | 14 |
| ISODEC_PIR | 3.5 | 14 |
| ISOROOF_3G | 3.5 | 8.5 |
| IROROOF_FOIL | 3.5 | 8.5 |
| IROROOF_PLUS | 3.5 | 8.5 |
| ISOPANEL_EPS | 2.3 | 14 |
| ISOWALL_PIR | 3.5 | 14 |
| ISOFRIG_PIR | 2.3 | 14 |

---

## 9. HISTORIAL DE VERSIONES

| Versión | Cambio principal |
|---|---|
| v5.1.0 | Paridad funcional con frontend v3.1 — ISODEC_PIR, ISOROOF_FOIL/PLUS, ISOFRIG_PIR |
| v5.2.0 | `logic_config.json` — archivo maestro editable, POST /api/logica |
| v5.3.0 | Manual visual HTML en /api/logica/html |
| v5.3.1 | Refactor two-phase batch — Phase 1 cantidades, Phase 2 precios en batch único |
| v5.3.2 | TECHNICAL_REFERENCE_v5.md — 1436 líneas de documentación |
| v5.3.3 | AGENTE_QA_CHROME_PROMPT.md — prompt agente QA Chrome Extension |

---

## 10. PENDIENTES / PRÓXIMOS PASOS

### Verificar en producción
- [ ] Confirmar URL activa del GPT Action (`calculadora-five-sand.vercel.app` vs `calculadora-bmc.vercel.app`)
- [ ] Ejecutar los 4 casos canónicos del AGENTE_QA_CHROME_PROMPT contra la URL deployada
- [ ] Verificar que el PDF se descarga correctamente desde la app en producción

### Mejoras identificadas
- [ ] Actualizar precios ISODEC_EPS en `catalog.js` si hay cambio en Wolf API (actualmente hardcodeados)
- [ ] Altura de paredes en `camara_frigorifica` es fija en 3m — considerar hacerla parametrizable
- [ ] Frontend (`PanelinCalculadoraV3.jsx`) tiene precios propios que pueden divergir del CSV — evaluar si unificar
- [ ] GPT Action schema: verificar que todos los campos del POST /api/cotizar estén documentados (aberturas array, esquineros, etc.)

### Bugs conocidos / a evaluar
- [ ] Sin evaluación formal en producción todavía — ejecutar protocolo QA del `AGENTE_QA_CHROME_PROMPT.md`

---

*Generado: 2026-03-07 | Branch: claude/deploy-gpt-panelin-v5-DXeCm*
