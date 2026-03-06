# Calculadora Panelin BMC Uruguay — Technical Reference v5
## Complete Architecture, Source Code & Calculation Logic

**Branch:** `claude/deploy-gpt-panelin-v5-DXeCm`
**Last commit:** `e2e34bd` — Two-phase batch architecture
**Test status:** 69/69 passing
**Date:** 2026-03-06

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Directory Structure](#2-directory-structure)
3. [Two-Phase Architecture](#3-two-phase-architecture)
4. [Data Layer — catalog.js](#4-data-layer--catalogjs)
5. [Engine — techo.js](#5-engine--techojs)
6. [Engine — pared.js](#6-engine--paredjs)
7. [Orchestrator — bom.js](#7-orchestrator--bomjs)
8. [Catalog Data: Families & Dimensions](#8-catalog-data-families--dimensions)
9. [Formula Parameters Reference](#9-formula-parameters-reference)
10. [Accessory Price Table](#10-accessory-price-table)
11. [All Fastening Systems](#11-all-fastening-systems)
12. [Gotero (Drip Edge) Systems](#12-gotero-drip-edge-systems)
13. [Pared Accessories Logic](#13-pared-accessories-logic)
14. [Scenarios: Full BOM Logic](#14-scenarios-full-bom-logic)
15. [Worked Simulations with Real Numbers](#15-worked-simulations-with-real-numbers)
16. [Test Suite Documentation](#16-test-suite-documentation)
17. [API Endpoints Reference](#17-api-endpoints-reference)
18. [Configuration File — logic_config.json](#18-configuration-file--logic_configjson)
19. [Validation Rules](#19-validation-rules)
20. [Architecture Decision Record](#20-architecture-decision-record)

---

## 1. SYSTEM OVERVIEW

The Calculadora Panelin BMC is a Node.js quoting engine for sandwich panel systems
manufactured by Panelin (Uruguay). It generates line-item Bills of Materials (BOMs)
for four construction scenarios across eight panel families, in two pricing modes.

### Key design principles

- **Price-agnostic quantity phase**: all BOM quantities are computed before any
  price lookup is performed. This makes the quantity logic independently testable
  and enables computing multiple price lists from a single quantity pass.

- **Single batch price resolution**: after all section quantities are collected,
  exactly ONE call to `batchGetPrices()` resolves ALL required SKUs across ALL
  sections. Duplicate SKUs shared between sections (e.g. TMOME, C.But., Bromplast)
  are resolved only once.

- **Live configuration**: formula parameters and accessory prices live in
  `logic_config.json` and are re-read on every calculation. No restart needed
  to update prices or formula coefficients.

### Supported scenarios

| Escenario | Sections generated |
|---|---|
| `solo_techo` | 1 × techo |
| `solo_fachada` | 1 × pared |
| `techo_fachada` | 1 × techo + 1 × pared |
| `camara_frigorifica` | 1 × techo + 1 × pared_frontal_posterior + 1 × pared_lateral |

---

## 2. DIRECTORY STRUCTURE

```
calculadora/
├── src/
│   ├── api/
│   │   └── server.js            HTTP API (Express)
│   ├── data/
│   │   ├── catalog.js           ◄ Core data layer (modified in v5)
│   │   ├── catalog_real.csv     Panel & accessory prices (CSV, ~300 rows)
│   │   ├── config_loader.js     Cached loader for logic_config.json
│   │   └── logic_config.json    ◄ Live-editable formulas + accessory prices
│   └── engines/
│       ├── autoportancia.js     Span validation (luz_max per family/thickness)
│       ├── bom.js               ◄ Main orchestrator (modified in v5)
│       ├── pared.js             ◄ Wall BOM engine (modified in v5)
│       └── techo.js             ◄ Roof BOM engine (modified in v5)
├── tests/
│   ├── api.test.js
│   ├── pared.test.js
│   └── techo.test.js
└── docs/
    ├── CALCULADORA_REPORTE.md
    ├── calculadora_spec.json
    ├── EJEMPLO_CALCULO_COMPLETO.md
    └── TECHNICAL_REFERENCE_v5.md   ◄ this file
```

---

## 3. TWO-PHASE ARCHITECTURE

### Before v5 (per-item lookup pattern)

```
calcTechoCompleto()
  └── for each accessory:
        getAccessoryInfo(sku, lista_precios)  ← N individual catalog lookups
```

For `techo_fachada`: ~21 lookups (many duplicates between sections).
For `camara_frigorifica`: ~40 lookups (3 sections × ~13 items each, heavy overlap).

### After v5 (two-phase batch pattern)

```
Phase 1 — Quantity collection (zero price access)
  calcCantidadesTecho()  →  rawItems[]   (items carry _area/_auM/_largoM for panels)
  calcCantidadesPared()  →  rawItems[]

Phase 2 — Single batch price resolution
  allSkus = flatten all rawItems from all sections
  priceMap = batchGetPrices(allSkus, lista_precios)
    └── new Set(skus) — deduplicates before lookup
    └── tries: CSV skuMap → logic_config accesorios → hardcodedPanelPrices

Phase 3 — Enrichment
  enrichRawItems(rawItems, priceMap)
    └── panel item:     subtotal = _area × precio_m2
                        precio_unit = precio_m2 × _auM × _largoM
    └── accessory item: subtotal = cantidad × precio_unit
```

### Efficiency gains

| Scenario | Old lookups | New unique SKUs | Reduction |
|---|---|---|---|
| `techo_fachada` | 21 | 16 | −24% |
| `camara_frigorifica` | ~40 | ~20 | −50% |

### Shared SKUs across sections (why deduplication matters)

These SKUs appear in BOTH techo and pared sections for the same project:
`TMOME`, `ARATRAP`, `C.But.`, `Bromplast`

In `camara_frigorifica` (3 sections), they would otherwise be looked up 3× each.

---

## 4. DATA LAYER — catalog.js

### Full source

```javascript
'use strict';

const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config_loader');

const IVA_RATE = 0.22; // fallback; live value comes from ivaRate()

// CSV parser — handles quoted fields (some names contain commas)
function parseLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { fields.push(field.trim()); field = ''; }
    else { field += c; }
  }
  fields.push(field.trim());
  return fields;
}

// Float parser — handles "on demand", "N/A", European "22,5" format
function parseNum(s) {
  if (!s || s === '' || /demand|n\/a/i.test(s)) return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// CSV columns: [0]supplier [1]family [2]category [3]sub_family [4]sku [5]name
//   [6]thickness_mm [7]length_m [8]unit_base [9]length_range [10]compatibility
//   [11]composition [12]cost_excl_vat [13]cost_incl_vat [14]sale_excl_vat
//   [15]sale_incl_vat [16]margin_percent [17]profit [18]consumer_final
//   [19]web_price_excl_vat [20]web_sale_incl_vat [21]web_sale_incl_vat_alt
//   [22]web_price_incl_vat [23]price_public
const CSV_PATH = path.join(__dirname, 'catalog_real.csv');
const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter(l => l.trim());
const skuMap = new Map();
for (let i = 1; i < lines.length; i++) {
  const c = parseLine(lines[i]);
  const sku = c[4] ? c[4].trim() : null;
  if (!sku) continue;
  let venta = parseNum(c[14]);
  const saleIncl = parseNum(c[15]);
  let web = parseNum(c[19]);
  const webIncl = parseNum(c[20]);
  if (venta === null && saleIncl !== null) venta = saleIncl / (1 + IVA_RATE);
  if (web === null && webIncl !== null) web = webIncl / (1 + IVA_RATE);
  if (web === null && venta !== null) web = venta;
  skuMap.set(sku, {
    sku, family: (c[1]||'').trim(), category: (c[2]||'').trim(),
    name: (c[5]||'').trim(), thickness_mm: parseNum(c[6]), length_m: parseNum(c[7]),
    unit_base: (c[8]||'unit').trim(), composition: (c[11]||'').trim(),
    venta: venta !== null ? Math.round(venta*10000)/10000 : null,
    web:   web   !== null ? Math.round(web*10000)/10000   : null,
  });
}

// Panel definitions: family → thickness_mm → { sku, au_m, [venta, web, name] }
// au_m = ancho útil en metros (effective covered width per panel)
const PANEL_DEFS = {
  ISOROOF_3G:   { 30:{sku:'IROOF30',au_m:1.10}, 40:{sku:'IROOF40',au_m:1.10},
                  50:{sku:'IROOF50',au_m:1.10}, 80:{sku:'IROOF80',au_m:1.10},
                  100:{sku:'IROOF100',au_m:1.10} },
  ISOROOF_FOIL: { 30:{sku:'IAGRO30',au_m:1.10}, 50:{sku:'IAGRO50',au_m:1.10} },
  ISOROOF_PLUS: { 50:{sku:'IROOF50-PLS',au_m:1.10}, 80:{sku:'IROOF80-PLS',au_m:1.10} },
  ISODEC_PIR:   { 50:{sku:'ISD50PIR',au_m:1.12}, 80:{sku:'ISD80PIR',au_m:1.12} },
  // ISODEC_EPS prices NOT in CSV — hardcoded (Wolf API temporary)
  ISODEC_EPS: {
    100:{sku:'ISODEC_EPS_100',au_m:1.12,venta:46.07,web:46.07,name:'ISODEC EPS 100mm'},
    150:{sku:'ISODEC_EPS_150',au_m:1.12,venta:51.50,web:51.50,name:'ISODEC EPS 150mm'},
    200:{sku:'ISODEC_EPS_200',au_m:1.12,venta:57.00,web:57.00,name:'ISODEC EPS 200mm'},
    250:{sku:'ISODEC_EPS_250',au_m:1.12,venta:62.50,web:62.50,name:'ISODEC EPS 250mm'},
  },
  ISOPANEL_EPS: { 50:{sku:'ISD50EPS',au_m:1.00},  100:{sku:'ISD100EPS',au_m:1.00},
                  150:{sku:'ISD150EPS',au_m:1.00}, 200:{sku:'ISD200EPS',au_m:1.00},
                  250:{sku:'ISD250EPS',au_m:1.00} },
  ISOWALL_PIR:  { 50:{sku:'IW50',au_m:1.00}, 80:{sku:'IW80',au_m:1.00},
                  100:{sku:'IW100',au_m:1.00} },
  ISOFRIG_PIR:  { 40:{sku:'IF40',au_m:1.00},          60:{sku:'IF60 - IFSL60',au_m:1.00},
                  80:{sku:'IF80 - IFSL80',au_m:1.00}, 100:{sku:'IF100 - IFSL100',au_m:1.00},
                  150:{sku:'IF150 - IFSL150',au_m:1.00} },
};

// Reverse lookup: panel SKU → {venta, web} for ISODEC_EPS (not in CSV)
const hardcodedPanelPrices = new Map();
for (const thicknesses of Object.values(PANEL_DEFS)) {
  for (const def of Object.values(thicknesses)) {
    if (def.venta !== undefined) {
      hardcodedPanelPrices.set(def.sku, { venta: def.venta, web: def.web ?? def.venta });
    }
  }
}

// getPanelDimensions — Phase 1 only: reads PANEL_DEFS, zero CSV access
function getPanelDimensions(familia, espesor_mm) {
  const familyDef = PANEL_DEFS[familia];
  if (!familyDef) throw new Error(`Familia no encontrada: ${familia}`);
  const def = familyDef[Number(espesor_mm)];
  if (!def) throw new Error(`Espesor ${espesor_mm}mm no disponible para ${familia}`);
  return { sku: def.sku, name: def.name || `${familia} ${espesor_mm}mm`, au_m: def.au_m };
}

// batchGetPrices — deduplicating batch resolver
// Lookup order: CSV skuMap → logic_config accesorios → hardcodedPanelPrices
function batchGetPrices(skus, lista_precios = 'venta') {
  const priceMap = new Map();
  for (const sku of new Set(skus)) {
    const row = skuMap.get(sku);
    if (row) {
      const precio = lista_precios === 'web' ? row.web : row.venta;
      if (precio === null || precio === undefined)
        throw new Error(`Precio no disponible para SKU ${sku}`);
      priceMap.set(sku, precio); continue;
    }
    const hard = getHardcodedAccessory(sku);
    if (hard) {
      priceMap.set(sku, lista_precios === 'web' ? hard.web : hard.venta); continue;
    }
    const panelEntry = hardcodedPanelPrices.get(sku);
    if (panelEntry) {
      priceMap.set(sku, lista_precios === 'web' ? panelEntry.web : panelEntry.venta); continue;
    }
    throw new Error(`Accesorio no encontrado: ${sku}`);
  }
  return priceMap;
}

// enrichRawItems — converts Phase 1 rawItems + priceMap → priced items
function enrichRawItems(rawItems, priceMap) {
  const items = [];
  let subtotal = 0;
  for (const item of rawItems) {
    const { _area, _auM, _largoM, ...clean } = item;
    const precioBase = priceMap.get(item.sku);
    if (precioBase === undefined)
      throw new Error(`SKU sin precio en priceMap: ${item.sku}`);
    let precio_unit, sub;
    if (_area !== undefined) {
      // Panel: price is per m², display unit price is per panel
      sub        = Math.round(_area * precioBase * 100) / 100;
      precio_unit = Math.round(precioBase * _auM * _largoM * 100) / 100;
    } else {
      precio_unit = precioBase;
      sub         = Math.round(item.cantidad * precioBase * 100) / 100;
    }
    items.push({ ...clean, precio_unit, subtotal: sub });
    subtotal += sub;
  }
  return { items, subtotal: Math.round(subtotal * 100) / 100 };
}

module.exports = {
  getPanelInfo, getPanelDimensions, getAccessoryInfo,
  batchGetPrices, enrichRawItems, listFamilies, ivaRate,
};
```

### Key data structures

#### skuMap entry (from CSV)
```javascript
{
  sku: 'IROOF50',
  family: 'ISOROOF_3G',
  category: 'Panel Techo',
  name: 'ISOROOF 3G 50mm',
  thickness_mm: 50,
  length_m: null,           // panels don't have a fixed length
  unit_base: 'M2',
  composition: 'PIR foam',
  venta: 52.48,             // USD/m², excl. IVA
  web: 48.65,               // USD/m², excl. IVA
}
```

#### rawItems panel entry (Phase 1 output)
```javascript
{
  sku: 'IROOF50',
  descripcion: 'ISOROOF_3G 50mm',
  cantidad: 10,             // number of panels (ceiling of ancho_m / au_m)
  unidad: 'panel',
  _area: 66.0,              // m² = cant_paneles × au_m × largo_m  ← stripped in Phase 3
  _auM: 1.10,               // au_m of this family                ← stripped in Phase 3
  _largoM: 6.0,             // largo_m requested                  ← stripped in Phase 3
}
```

#### rawItems accessory entry (Phase 1 output)
```javascript
{
  sku: 'CABALLETE',
  descripcion: 'Caballete (arandela trapezoidal)',
  cantidad: 133,
  unidad: 'unid',
  // No _area/_auM/_largoM fields
}
```

#### Enriched item (Phase 3 output, included in final cotizacion)
```javascript
{
  sku: 'IROOF50',
  descripcion: 'ISOROOF_3G 50mm',
  cantidad: 10,
  unidad: 'panel',
  precio_unit: 290.38,      // USD per panel (precio_m2 × au_m × largo_m)
  subtotal: 2903.81,        // USD (area × precio_m2)
}
```

---

## 5. ENGINE — techo.js

### Full source

```javascript
'use strict';

const { getPanelDimensions, batchGetPrices, enrichRawItems } = require('../data/catalog');
const { getConfig } = require('../data/config_loader');

// ── Gotero SKU tables ──────────────────────────────────────────────────────
const ISOROOF_GOTERO = {
  frontal:  { 30:'GFS30', 40:'GFS30', 50:'GFS50', 80:'GFS80', 100:'GFS80' },
  superior: { 30:'GFSUP30', 40:'GFSUP40', 50:'GFSUP50', 80:'GFSUP80', 100:'GFSUP80' },
  lateral:  { 30:'GL30', 40:'GL40', 50:'GL50', 80:'GL80', 100:'GL80' },
  canalon:  { 30:'CD30', 40:'CD30', 50:'CD50', 80:'CD80', 100:'CD80' },
  cumbrera: 'CUMROOF3M', soporte_canalon: 'SOPCAN3M',
  frontal_length:3.03, superior_length:3.03, lateral_length:3.0,
  canalon_length:3.03, soporte_length:3.0,
};
const ISODEC_PIR_GOTERO = {
  frontal:  { 50:'GF80DC', 80:'GF120DC' },
  superior: { 50:'GSDECAM50', 80:'GSDECAM80' },
  lateral:  { 50:'GL80DC', 80:'GL120DC' },
  canalon:  { 50:'CAN.ISDC120' },
  cumbrera: '6847', soporte_canalon: '6805',
  frontal_length:3.03, superior_length:3.03, lateral_length:3.0,
  canalon_length:3.03, soporte_length:3.0,
};
const ISODEC_EPS_GOTERO = {
  frontal:  { 100:'6838', 150:'6839', 200:'6840', 250:'6841' },
  superior: 'all:6828',   // babeta de adosar (universal for all thicknesses)
  lateral:  { 100:'6842', 150:'6843', 200:'6844', 250:'6845' },
  canalon:  { 100:'6801', 150:'6802', 200:'6803', 250:'6804' },
  cumbrera: '6847', soporte_canalon: '6805',
  frontal_length:3.03, superior_length:3.0, lateral_length:3.0,
  canalon_length:3.03, soporte_length:3.0,
};

// ── Fastening system assignment ─────────────────────────────────────────────
const SIST_FIJACION_TECHO = {
  ISODEC_EPS:   'varilla_tuerca',
  ISODEC_PIR:   'varilla_tuerca',
  ISOROOF_3G:   'caballete_tornillo',
  ISOROOF_FOIL: 'caballete_tornillo',
  ISOROOF_PLUS: 'caballete_tornillo',
  ISOPANEL_EPS: 'tmome',
  ISOWALL_PIR:  'tmome',
  ISOFRIG_PIR:  'tmome',
};

function collectItem(rawItems, { sku, descripcion, cantidad, unidad }) {
  if (!sku || !Number.isFinite(cantidad) || cantidad <= 0) return;
  rawItems.push({ sku, descripcion, cantidad, unidad });
}

// ── Phase 1: pure quantity calculation ──────────────────────────────────────
function calcCantidadesTecho({
  familia, espesor_mm, ancho_m, cant_paneles, largo_m,
  apoyos=0, estructura='metal',
  tiene_cumbrera=false, tiene_canalon=false, tipo_gotero_frontal='liso',
}) {
  const { sku: panelSku, name: panelName, au_m } = getPanelDimensions(familia, espesor_mm);

  let cantP, anchoEfectivo;
  if (cant_paneles != null) {
    cantP = Math.ceil(Number(cant_paneles));
    anchoEfectivo = cantP * au_m;
  } else {
    cantP = Math.ceil(ancho_m / au_m);
    anchoEfectivo = cantP * au_m;
  }

  const areaRaw = cantP * au_m * largo_m;
  const area_m2 = Math.round(areaRaw * 100) / 100;
  const rawItems = [];

  // 1. Panel
  rawItems.push({
    sku: panelSku, descripcion: panelName || `Panel ${familia} ${espesor_mm}mm`,
    cantidad: cantP, unidad: 'panel',
    _area: areaRaw, _auM: au_m, _largoM: largo_m,
  });

  // 2–7. Gotero system
  const gotero = resolverGoteroData(familia, espesor_mm);
  if (gotero) {
    let frontalSku = gotero.frontal_sku;
    if (tipo_gotero_frontal === 'greca' &&
        ['ISOROOF_3G','ISOROOF_FOIL','ISOROOF_PLUS'].includes(familia)) {
      frontalSku = 'GFCGR30';
    }
    collectItem(rawItems, {
      sku: frontalSku,
      descripcion: `Gotero Frontal ${tipo_gotero_frontal==='greca'?'Greca':''} (${familia} ${espesor_mm}mm)`.trim(),
      cantidad: Math.ceil(anchoEfectivo / gotero.frontal_length), unidad: 'pieza',
    });
    collectItem(rawItems, {
      sku: gotero.superior_sku,
      descripcion: `Gotero Superior / Babeta (${familia} ${espesor_mm}mm)`,
      cantidad: Math.ceil(anchoEfectivo / gotero.superior_length), unidad: 'pieza',
    });
    collectItem(rawItems, {
      sku: gotero.lateral_sku,
      descripcion: `Gotero Lateral × 2 (${familia} ${espesor_mm}mm)`,
      cantidad: Math.ceil(largo_m / gotero.lateral_length) * 2, unidad: 'pieza',
    });
    if (tiene_cumbrera) {
      collectItem(rawItems, {
        sku: gotero.cumbrera_sku, descripcion: `Cumbrera (${familia})`,
        cantidad: Math.ceil(anchoEfectivo / 3.0), unidad: 'pieza',
      });
    }
    if (tiene_canalon && gotero.canalon_sku) {
      collectItem(rawItems, {
        sku: gotero.canalon_sku, descripcion: `Canalón (${familia} ${espesor_mm}mm)`,
        cantidad: Math.ceil(anchoEfectivo / gotero.canalon_length), unidad: 'pieza',
      });
      collectItem(rawItems, {
        sku: gotero.soporte_canalon_sku, descripcion: 'Soporte Canalón',
        cantidad: Math.ceil(anchoEfectivo / 1.5), unidad: 'pieza',
      });
    }
  }

  // 8–12. Fastening system
  const sist = SIST_FIJACION_TECHO[familia] || 'tmome';
  const fp   = getConfig().formula_params.techo;

  if (sist === 'varilla_tuerca') {
    const apoyosReales = apoyos > 0 ? apoyos : fp.varilla_tuerca.apoyos_minimos_default;
    const ptosFij      = Math.ceil(
      (cantP * apoyosReales * fp.varilla_tuerca.laterales_por_punto) +
      (largo_m * 2 / fp.varilla_tuerca.intervalo_largo_m)
    );
    const cantVarillas = Math.ceil(ptosFij * fp.varilla_tuerca.varillas_por_punto);
    collectItem(rawItems, {sku:'VARILLA38',descripcion:'Varilla roscada 3/8"',cantidad:cantVarillas,unidad:'unid'});
    collectItem(rawItems, {sku:'TUERCA38',descripcion:'Tuerca 3/8" galv.',cantidad:cantVarillas*2,unidad:'unid'});
    collectItem(rawItems, {sku:'ARCA38',descripcion:'Arandela carrocero 3/8"',cantidad:cantVarillas*2,unidad:'unid'});
    collectItem(rawItems, {sku:'ARAPP',descripcion:'Tortuga PVC (arandela PP)',cantidad:cantVarillas*2,unidad:'unid'});
    if (estructura === 'hormigon') {
      collectItem(rawItems, {sku:'TACEXP38',descripcion:'Taco expansivo 3/8"',cantidad:ptosFij,unidad:'unid'});
    }
  } else if (sist === 'caballete_tornillo') {
    const cantCaballetes = Math.ceil(
      (cantP * fp.caballete.tramos_por_panel * (largo_m / fp.caballete.paso_apoyo_m + 1)) +
      (largo_m * 2 / fp.caballete.intervalo_perimetro_m)
    );
    const cajasAgujas = Math.ceil(cantCaballetes * 2 / 100);
    collectItem(rawItems, {sku:'CABALLETE',descripcion:'Caballete (arandela trapezoidal)',cantidad:cantCaballetes,unidad:'unid'});
    collectItem(rawItems, {sku:'TORN_AGUJA',descripcion:'Tornillo aguja 5" (caja ×100)',cantidad:cajasAgujas,unidad:'caja'});
  } else {
    // tmome (default)
    const cantTornillos = Math.ceil(areaRaw * fp.tornillos_por_m2_tmome);
    collectItem(rawItems, {sku:'TMOME',descripcion:'Tornillo TMOME (madera/metal)',cantidad:cantTornillos,unidad:'und'});
    collectItem(rawItems, {sku:'ARATRAP',descripcion:'Arandela Trapezoidal ARATRAP',cantidad:cantTornillos,unidad:'und'});
  }

  // 13–14. Sealants (always present)
  collectItem(rawItems, {
    sku:'C.But.', descripcion:`Cinta Butilo C.But. (${fp.butilo_ml_por_rollo_m}m)`,
    cantidad: Math.max(1, Math.ceil((cantP-1)*largo_m/fp.butilo_ml_por_rollo_m)), unidad:'rollo',
  });
  collectItem(rawItems, {
    sku:'Bromplast', descripcion:'Silicona Bromplast (600ml)',
    cantidad: Math.ceil(cantP * fp.silicona_cartuchos_por_panel), unidad:'cartucho',
  });

  return { tipo:'techo', familia, espesor_mm, ancho_m:anchoEfectivo, largo_m,
           area_m2, cant_paneles:cantP, sist_fijacion:sist, rawItems };
}

// ── Phase 2 wrapper (backward-compatible public API) ────────────────────────
function calcTechoCompleto(params) {
  const { lista_precios = 'venta' } = params;
  const raw = calcCantidadesTecho(params);
  const priceMap = batchGetPrices(raw.rawItems.map(i => i.sku), lista_precios);
  const { items, subtotal } = enrichRawItems(raw.rawItems, priceMap);
  const { rawItems: _, ...meta } = raw;
  return { ...meta, items, subtotal };
}

module.exports = { calcTechoCompleto, calcCantidadesTecho };
```

---

## 6. ENGINE — pared.js

### Perfil U SKU selection by thickness

```javascript
const PERFIL_U_SKU = {
  40: 'PU50MM', 50: 'PU50MM', 60: 'PU50MM',
  80: 'PU100MM', 100: 'PU100MM', 150: 'PU150MM',
  200: 'PU200MM', 250: 'PU250MM',
};
```

Note: 40mm and 60mm (ISOFRIG_PIR) use `PU50MM` — the U-profile fits both 40 and 60mm
panel thicknesses within the 50mm profile range.

### Phase 1 — calcCantidadesPared

Item generation order:
1. **Panel** — `_area = areaNeta` (net area AFTER deducting abertura area)
2. **Perfil U** — `ceil(2 × anchoEfectivo / 3.0)` piezas
3. **Perfil K2** — only if `incl_k2=true AND cantP > 1`: `(cantP-1) × ceil(largo_m/3.0)` piezas
4. **Esquinero exterior** — if `num_esq_ext > 0`
5. **Esquinero interior** — if `num_esq_int > 0`
6. **Ángulo 5852 (PLECHU98)** — only if `incl_5852=true`
7. **TMOME** — only if `estructura === 'metal' || 'mixto'`: `ceil(areaNeta × 5.5)`
8. **ARATRAP** — same quantity as TMOME
9. **ANCLAJE_H** — `ceil(anchoEfectivo / 0.3)` always
10. **RPOP (remaches POP)** — `max(1, ceil(cantP × 2 / 1000))` caja
11. **C.But.** — `max(1, ceil((cantP-1) × largo_m / 22.5))` rollos
12. **Bromplast** — `ceil(mlJuntas / 8)` cartuchos
    where `mlJuntas = (cantP-1)×largo_m + anchoEfectivo×2`

### Area deduction (aberturas)

```javascript
// aberturas = [{ancho, alto, cant}, ...]
for (const ab of aberturas) {
  areaAberturas += ab.ancho * ab.alto * (ab.cant || 1);
}
areaNeta = max(areaBruta - areaAberturas, 0);
// Panel _area uses areaNeta — customer pays only for net area
```

---

## 7. ORCHESTRATOR — bom.js

### generarCotizacion() — complete flow

```javascript
function generarCotizacion(params) {
  // 1. Validate escenario, ancho_m OR cant_paneles, largo_m
  // 2. Warn if largo_m outside [lmin, lmax] for this family
  // 3. Warn if color restriction applies
  // 4. Validate autoportancia (span check)
  // 5. PHASE 1: collect raw quantities for all sections
  // 6. PHASE 2: batchGetPrices() across all SKUs from all sections
  // 7. PHASE 3: enrichRawItems() per section
  // 8. Compute subtotal_sin_iva, iva_22, total_con_iva
  // 9. Return cotizacion object with UUID, date, secciones, resumen, warnings
}
```

### camara_frigorifica special logic

```javascript
if (escenario === 'camara_frigorifica') {
  const alto_m = 3;  // fixed cold room height

  // Techo: normal call with user's ancho_m × largo_m
  rawSecciones.push(calcCantidadesTecho(techoParams));

  // Pared frontal/posterior: ancho_m = user's ancho_m, largo_m = 3 (height)
  const rawFrontal = calcCantidadesPared({ ...paredParams, largo_m: alto_m });
  rawFrontal.tipo = 'pared_frontal_posterior';
  rawSecciones.push(rawFrontal);

  // Pared lateral: ancho_m = user's largo_m (the long side), largo_m = 3
  const rawLateral = calcCantidadesPared({
    familia, espesor_mm, ancho_m: largo_m, cant_paneles: undefined,
    largo_m: alto_m, num_aberturas: 0, estructura,
  });
  rawLateral.tipo = 'pared_lateral';
  rawSecciones.push(rawLateral);
}
```

### Output structure

```javascript
{
  cotizacion_id: "uuid-v4",
  fecha: "YYYY-MM-DD",
  escenario: "techo_fachada",
  familia: "ISOROOF_3G",
  espesor_mm: 50,
  lista_precios: "venta",
  secciones: [
    {
      tipo: "techo",           // or "pared", "pared_frontal_posterior", "pared_lateral"
      familia: "ISOROOF_3G",
      espesor_mm: 50,
      ancho_m: 11.0,           // effective width (cantP × au_m)
      largo_m: 6.0,
      area_m2: 66.0,           // cantP × au_m × largo_m (techo)
      cant_paneles: 10,
      sist_fijacion: "caballete_tornillo",
      items: [
        { sku, descripcion, cantidad, unidad, precio_unit, subtotal }
        // ...
      ],
      subtotal: 3391.08
    }
  ],
  resumen: {
    subtotal_sin_iva: 6586.44,
    iva_22: 1449.02,
    total_con_iva: 8035.46,
    moneda: "USD"
  },
  warnings: [],
  nota: "Precios sin IVA. IVA 22% aplicado al total final..."
}
```

---

## 8. CATALOG DATA: FAMILIES & DIMENSIONS

### Panel families with au_m (ancho útil)

| Familia | Tipo | au_m (m) | Espesores disponibles (mm) |
|---|---|---|---|
| ISOROOF_3G | Techo nervado 3G | 1.10 | 30, 40, 50, 80, 100 |
| ISOROOF_FOIL | Techo liso agro | 1.10 | 30, 50 |
| ISOROOF_PLUS | Techo plus | 1.10 | 50, 80 |
| ISODEC_PIR | Techo liso PIR | 1.12 | 50, 80 |
| ISODEC_EPS | Techo liso EPS | 1.12 | 100, 150, 200, 250 |
| ISOPANEL_EPS | Pared/techo EPS | 1.00 | 50, 100, 150, 200, 250 |
| ISOWALL_PIR | Pared PIR | 1.00 | 50, 80, 100 |
| ISOFRIG_PIR | Cámara/pared PIR | 1.00 | 40, 60, 80, 100, 150 |

### Panel SKU table

| Familia | 30mm | 40mm | 50mm | 60mm | 80mm | 100mm | 150mm | 200mm | 250mm |
|---|---|---|---|---|---|---|---|---|---|
| ISOROOF_3G | IROOF30 | IROOF40 | IROOF50 | — | IROOF80 | IROOF100 | — | — | — |
| ISOROOF_FOIL | IAGRO30 | — | IAGRO50 | — | — | — | — | — | — |
| ISOROOF_PLUS | — | — | IROOF50-PLS | — | IROOF80-PLS | — | — | — | — |
| ISODEC_PIR | — | — | ISD50PIR | — | ISD80PIR | — | — | — | — |
| ISODEC_EPS | — | — | — | — | — | ISODEC_EPS_100 | ISODEC_EPS_150 | ISODEC_EPS_200 | ISODEC_EPS_250 |
| ISOPANEL_EPS | — | — | ISD50EPS | — | — | ISD100EPS | ISD150EPS | ISD200EPS | ISD250EPS |
| ISOWALL_PIR | — | — | IW50 | — | IW80 | IW100 | — | — | — |
| ISOFRIG_PIR | — | IF40 | — | IF60-IFSL60 | IF80-IFSL80 | IF100-IFSL100 | IF150-IFSL150 | — | — |

### ISODEC_EPS hardcoded prices (USD/m², excl. IVA)

| SKU | venta | web |
|---|---|---|
| ISODEC_EPS_100 | 46.07 | 46.07 |
| ISODEC_EPS_150 | 51.50 | 51.50 |
| ISODEC_EPS_200 | 57.00 | 57.00 |
| ISODEC_EPS_250 | 62.50 | 62.50 |

These prices are temporarily hardcoded in `PANEL_DEFS` (not in CSV). They are
resolved via `hardcodedPanelPrices` Map as the third fallback in `batchGetPrices()`.

---

## 9. FORMULA PARAMETERS REFERENCE

All values live in `logic_config.json → formula_params`. Editable without restart.

### Techo formulas

```
Panel count:
  cantP = ceil(ancho_m / au_m)           [or input directly as cant_paneles]
  anchoEfectivo = cantP × au_m

Area:
  areaRaw = cantP × au_m × largo_m
  area_m2 = round(areaRaw, 2)

Gotero frontal:   ceil(anchoEfectivo / 3.03)  piezas
Gotero superior:  ceil(anchoEfectivo / 3.03)  piezas  [or 3.0m for ISODEC_EPS]
Gotero lateral:   ceil(largo_m / 3.0) × 2    piezas
Cumbrera:         ceil(anchoEfectivo / 3.0)   piezas  [if tiene_cumbrera=true]
Canalón:          ceil(anchoEfectivo / 3.03)  piezas  [if tiene_canalon=true]
Soporte canalón:  ceil(anchoEfectivo / 1.5)   piezas  [if tiene_canalon=true]

Fastening — varilla_tuerca:
  apoyosReales = apoyos || 2  (apoyos_minimos_default)
  ptosFij = ceil(cantP × apoyosReales × 2 + largo_m × 2 / 2.5)
  cantVarillas = ceil(ptosFij × 0.25)
  VARILLA38 = cantVarillas
  TUERCA38  = cantVarillas × 2
  ARCA38    = cantVarillas × 2
  ARAPP     = cantVarillas × 2
  TACEXP38  = ptosFij  [only if estructura='hormigon']

Fastening — caballete_tornillo:
  cantCaballetes = ceil(cantP × 3 × (largo_m/2.9 + 1) + largo_m × 2 / 0.3)
  cajasAgujas = ceil(cantCaballetes × 2 / 100)
  CABALLETE  = cantCaballetes
  TORN_AGUJA = cajasAgujas caja

Fastening — tmome:
  cantTornillos = ceil(areaRaw × 6)
  TMOME   = cantTornillos
  ARATRAP = cantTornillos

Sealants (all families):
  C.But.    = max(1, ceil((cantP-1) × largo_m / 22.5))   rollos
  Bromplast = ceil(cantP × 0.5)                           cartuchos
```

### Pared formulas

```
Panel count:
  cantP = ceil(ancho_m / au_m)
  anchoEfectivo = cantP × au_m
  areaBruta = round(cantP × au_m × largo_m, 2)

Aberturas:
  areaAberturas = Σ (ab.ancho × ab.alto × ab.cant)
  areaNeta = max(areaBruta - areaAberturas, 0)

Panel pricing:
  _area = areaNeta    ← customer pays net area, not gross

Perfil U:       ceil(2 × anchoEfectivo / 3.0)  piezas
Perfil K2:      (cantP-1) × ceil(largo_m / 3.0)  [if incl_k2=true AND cantP>1]
Esq. exterior:  num_esq_ext × ceil(largo_m / 3.0)  [if num_esq_ext>0]
Esq. interior:  num_esq_int × ceil(largo_m / 3.0)  [if num_esq_int>0]
Ángulo 5852:    ceil(anchoEfectivo / 6.8)  [if incl_5852=true]

Fastening (metal/mixto only):
  cantTornillos = ceil(areaNeta × 5.5)
  TMOME   = cantTornillos
  ARATRAP = cantTornillos

Anclaje H°:   ceil(anchoEfectivo / 0.3)   always
Remaches:     max(1, ceil(cantP × 2 / 1000))  caja
Butilo:       max(1, ceil((cantP-1) × largo_m / 22.5))  rollos
Silicona:     ceil(mlJuntas / 8)  cartuchos
  where mlJuntas = (cantP-1) × largo_m + anchoEfectivo × 2
```

---

## 10. ACCESSORY PRICE TABLE

All prices in USD excl. IVA. Source: `logic_config.json → accesorios`.

| SKU | Nombre | venta | web | Unidad |
|---|---|---|---|---|
| VARILLA38 | Varilla roscada 3/8" | 3.12 | 3.64 | unid |
| TUERCA38 | Tuerca 3/8" galv. | 0.12 | 0.07 | unid |
| ARCA38 | Arandela carrocero 3/8" | 1.68 | 0.64 | unid |
| ARAPP | Tortuga PVC (arandela PP) | 1.27 | 1.48 | unid |
| TACEXP38 | Taco expansivo 3/8" | 0.96 | 1.12 | unid |
| CABALLETE | Caballete (arandela trapezoidal) | 0.50 | 0.46 | unid |
| TORN_AGUJA | Tornillo aguja 5" | 17.00 | 17.00 | x100 |
| ANCLAJE_H | Kit anclaje H° | 0.09 | 0.03 | unid |
| K2 | Perfil K2 (junta interior) | 8.59 | 10.48 | pieza/3m |
| ESQ-EXT | Esquinero exterior | 8.59 | 10.48 | pieza/3m |
| ESQ-INT | Esquinero interior | 8.59 | 10.48 | pieza/3m |
| G2-100 | Perfil G2 100mm | 15.34 | 18.72 | pieza/3m |
| G2-150 | Perfil G2 150mm | 17.61 | 21.49 | pieza/3m |
| G2-200 | Perfil G2 200mm | 21.13 | 25.78 | pieza/3m |
| G2-250 | Perfil G2 250mm | 21.30 | 25.99 | pieza/3m |
| PLECHU98 | Ángulo aluminio 5852 (6.8m) | 51.84 | 63.24 | pieza |
| MEMBRANA | Membrana autoadhesiva 30cm×10m | 16.62 | 20.28 | rollo |
| ESPUMA_PU | Espuma poliuretano 750cm³ | 25.46 | 31.06 | unid |
| GFCGR30 | Gotero frontal greca ISOROOF | 17.99 | 19.38 | pieza/3.03m |
| GLDCAM50 | Gotero lateral cámara 50mm | 22.32 | 27.23 | pieza/3m |
| GLDCAM80 | Gotero lateral cámara 80mm | 25.11 | 30.63 | pieza/3m |

Prices for gotero, butilo, silicona, perfil U, and panel accessories come from
`catalog_real.csv` (looked up via `skuMap`). The table above covers only the
`logic_config.json → accesorios` section (items NOT in CSV).

---

## 11. ALL FASTENING SYSTEMS

### System assignment matrix

| Familia | Sistema | Activado en |
|---|---|---|
| ISODEC_EPS | varilla_tuerca | techo |
| ISODEC_PIR | varilla_tuerca | techo |
| ISOROOF_3G | caballete_tornillo | techo |
| ISOROOF_FOIL | caballete_tornillo | techo |
| ISOROOF_PLUS | caballete_tornillo | techo |
| ISOPANEL_EPS | tmome | techo + pared |
| ISOWALL_PIR | tmome | techo + pared |
| ISOFRIG_PIR | tmome | techo + pared |

**Note for pared**: ALL families use the `tmome` system in pared (metal/mixto).
Structure `hormigon` skips TMOME/ARATRAP entirely in pared.

### varilla_tuerca detail

Generated SKUs: `VARILLA38`, `TUERCA38`, `ARCA38`, `ARAPP`, optionally `TACEXP38`

```
ptosFij = ceil(cantP × 2 × 2 + largo_m × 2 / 2.5)   [with apoyos_default=2]
cantVarillas = ceil(ptosFij × 0.25)

VARILLA38 = cantVarillas
TUERCA38  = cantVarillas × 2   (2 per rod — top and bottom)
ARCA38    = cantVarillas × 2   (1 per nut)
ARAPP     = cantVarillas × 2   (1 per nut — TPV washer)
TACEXP38  = ptosFij            (only when estructura='hormigon')
```

### caballete_tornillo detail

Generated SKUs: `CABALLETE`, `TORN_AGUJA`

```
cantCaballetes = ceil(cantP × 3 × (largo_m/2.9 + 1) + largo_m × 2 / 0.3)
cajasAgujas    = ceil(cantCaballetes × 2 / 100)

CABALLETE  = cantCaballetes
TORN_AGUJA = cajasAgujas × caja ×100
```

### tmome detail

Generated SKUs: `TMOME`, `ARATRAP`

```
cantTornillos = ceil(areaRaw × 6)      [techo]
cantTornillos = ceil(areaNeta × 5.5)   [pared, metal only]

TMOME   = cantTornillos
ARATRAP = cantTornillos
```

---

## 12. GOTERO (DRIP EDGE) SYSTEMS

Only families ISOROOF_3G/FOIL/PLUS, ISODEC_PIR, and ISODEC_EPS have defined
gotero systems. ISOPANEL_EPS, ISOWALL_PIR, ISOFRIG_PIR have NO gotero.

### ISOROOF families (3G / FOIL / PLUS)

| Piece | SKU (50mm) | Length | Qty formula |
|---|---|---|---|
| Frontal liso | GFS50 | 3.03m | ceil(anchoEfectivo / 3.03) |
| Frontal greca | GFCGR30 | 3.03m | same (when tipo_gotero_frontal='greca') |
| Superior | GFSUP50 | 3.03m | ceil(anchoEfectivo / 3.03) |
| Lateral | GL50 | 3.0m | ceil(largo_m / 3.0) × 2 |
| Cumbrera | CUMROOF3M | 3.0m | ceil(anchoEfectivo / 3.0) |
| Canalón | CD50 | 3.03m | ceil(anchoEfectivo / 3.03) |
| Soporte canalón | SOPCAN3M | 3.0m | ceil(anchoEfectivo / 1.5) |

### ISODEC_EPS (babeta system, not drip edge)

| Piece | SKU (100mm) | Length | Qty formula |
|---|---|---|---|
| Gotero frontal | 6838 | 3.03m | ceil(anchoEfectivo / 3.03) |
| Babeta adosar (superior) | 6828 | 3.0m | ceil(anchoEfectivo / 3.0) |
| Gotero lateral | 6842 | 3.0m | ceil(largo_m / 3.0) × 2 |
| Canalón | 6801 | 3.03m | ceil(anchoEfectivo / 3.03) |
| Cumbrera | 6847 | 3.0m | ceil(anchoEfectivo / 3.0) |
| Soporte canalón | 6805 | 3.0m | ceil(anchoEfectivo / 1.5) |

Note: `6828` (babeta de adosar) is universal for ALL ISODEC_EPS thicknesses.
Other gotero SKUs are thickness-specific: 100→6838/6842/6801, 150→6839/6843/6802, etc.

---

## 13. PARED ACCESSORIES LOGIC

### Conditional accessories

| Item | Condition | Default |
|---|---|---|
| Perfil K2 | `incl_k2=true AND cantP > 1` | **included** |
| Esquinero ext. | `num_esq_ext > 0` | excluded |
| Esquinero int. | `num_esq_int > 0` | excluded |
| Ángulo 5852 | `incl_5852=true` | excluded |
| TMOME + ARATRAP | `estructura === 'metal' OR 'mixto'` | **included for metal** |

### Items always present in pared (regardless of params)

- Perfil U (`PU50MM` or `PU100MM` etc.) — always
- ANCLAJE_H — always
- RPOP (remaches POP) — always
- C.But. (butilo) — always
- Bromplast (silicona) — always

---

## 14. SCENARIOS: FULL BOM LOGIC

### solo_techo

```
rawSecciones = [calcCantidadesTecho(params)]
```

Output: 1 section, type `techo`

### solo_fachada

```
rawSecciones = [calcCantidadesPared(params)]
```

Output: 1 section, type `pared`

### techo_fachada

```
rawSecciones = [
  calcCantidadesTecho(params),
  calcCantidadesPared(params),
]
```

Both sections use the same `familia`, `espesor_mm`, `ancho_m`, `largo_m`.
Output: 2 sections, types `techo` + `pared`

### camara_frigorifica

```
alto_m = 3  (hardcoded)

rawSecciones = [
  calcCantidadesTecho({ ...params }),                     // ancho_m × largo_m
  calcCantidadesPared({ ...params, largo_m: alto_m }),    // ancho_m × 3m
  calcCantidadesPared({
    familia, espesor_mm,
    ancho_m: params.largo_m,                             // long side → wall width
    largo_m: alto_m,                                     // height = 3m
    num_aberturas: 0,
    estructura,
  }),
]

rawSecciones[1].tipo = 'pared_frontal_posterior'
rawSecciones[2].tipo = 'pared_lateral'
```

Output: 3 sections — `techo` + `pared_frontal_posterior` + `pared_lateral`

---

## 15. WORKED SIMULATIONS WITH REAL NUMBERS

### Simulation A — ISODEC_EPS 100mm, 5×11m, solo_techo

**Parameters:** `familia=ISODEC_EPS, espesor_mm=100, ancho_m=5, largo_m=11`

**Panel calculation:**
```
au_m       = 1.12 m
cantP      = ceil(5 / 1.12) = ceil(4.464) = 5 panels
anchoEfectivo = 5 × 1.12 = 5.6 m
areaRaw    = 5 × 1.12 × 11 = 61.6 m²
area_m2    = 61.60
```

**Sistema: varilla_tuerca**
```
apoyosReales = 2 (default)
ptosFij = ceil(5×2×2 + 11×2/2.5) = ceil(20 + 8.8) = ceil(28.8) = 29
cantVarillas = ceil(29 × 0.25) = ceil(7.25) = 8
```

**BOM — venta vs web (USD excl. IVA):**

| SKU | Descripción | Cant | Precio venta | Sub venta | Precio web | Sub web |
|---|---|---|---|---|---|---|
| ISODEC_EPS_100 | ISODEC EPS 100mm | 5 panel | 567.58 | 2,837.91 | 567.58 | 2,837.91 |
| 6838 | Gotero Frontal 100mm | 2 pz | 15.67 | 31.34 | 18.28 | 36.57 |
| 6828 | Babeta adosar | 2 pz | 12.19 | 24.38 | 14.22 | 28.45 |
| 6842 | Gotero Lateral 100mm | 8 pz | 20.77 | 166.18 | 24.23 | 193.87 |
| VARILLA38 | Varilla roscada | 8 | 3.12 | 24.96 | 3.64 | 29.12 |
| TUERCA38 | Tuerca 3/8" | 16 | 0.12 | 1.92 | 0.07 | 1.12 |
| ARCA38 | Arandela carrocero | 16 | 1.68 | 26.88 | 0.64 | 10.24 |
| ARAPP | Tortuga PVC | 16 | 1.27 | 20.32 | 1.48 | 23.68 |
| C.But. | Cinta Butilo | 2 rollos | 14.89 | 29.79 | 18.13 | 36.26 |
| Bromplast | Silicona | 3 cartuchos | 9.49 | 28.48 | 11.07 | 33.22 |
| **TOTAL** | | | | **3,192.16** | | **3,230.44** |

**Con IVA 22%:**
```
venta: 3,192.16 × 1.22 = 3,894.44 USD
web:   3,230.44 × 1.22 = 3,941.14 USD
```

Note: `precio_unit` for panel = `precio_m2 × au_m × largo_m = 46.07 × 1.12 × 11 = 567.58 USD/panel`
Note: ISODEC_EPS prices are identical in venta and web (46.07 USD/m² for 100mm).

---

### Simulation B — ISOROOF_3G 50mm, 10×6m, techo_fachada

**Parameters:** `familia=ISOROOF_3G, espesor_mm=50, ancho_m=10, largo_m=6`

**Panel calculation:**
```
au_m = 1.10 m
cantP = ceil(10 / 1.10) = ceil(9.09) = 10 panels
anchoEfectivo = 10 × 1.10 = 11.0 m
areaRaw = 10 × 1.10 × 6 = 66.0 m²
```

**Techo — caballete_tornillo:**
```
cantCaballetes = ceil(10×3×(6/2.9+1) + 6×2/0.3)
               = ceil(30×3.069 + 40)
               = ceil(92.07 + 40) = ceil(132.07) = 133
cajasAgujas    = ceil(133×2/100) = ceil(2.66) = 3 cajas
```

**TECHO BOM (venta):**

| SKU | Cant | Subtotal USD |
|---|---|---|
| IROOF50 (panel) | 10 | 2,903.81 |
| GFS50 (gotero frontal) | 4 | 67.06 |
| GFSUP50 (gotero superior) | 4 | 116.30 |
| GL50 (gotero lateral) | 4 | 94.27 |
| CABALLETE | 133 | 66.50 |
| TORN_AGUJA | 3 cajas | 51.00 |
| C.But. | 3 rollos | 44.68 |
| Bromplast | 5 cartuchos | 47.46 |
| **Subtotal techo** | | **3,391.08** |

**PARED BOM (venta) — same panel, same dimensions:**

| SKU | Cant | Subtotal USD |
|---|---|---|
| IROOF50 (panel) | 10 | 2,903.81 |
| PU50MM (perfil U) | 8 | 90.72 |
| K2 (junta) | 9×2=18 piezas | 154.62 |
| TMOME | 363 | 237.89 |
| ARATRAP | 363 | 264.67 |
| ANCLAJE_H | 37 | 3.33 |
| RPOP | 1 caja | 49.18 |
| C.But. | 3 rollos | 44.68 |
| Bromplast | 7 cartuchos | 66.44 |
| **Subtotal pared** | | **3,815.34** |

```
Subtotal total sin IVA = 3,391.08 + 3,815.34 = 7,206.42 USD
IVA 22% = 1,585.41 USD
Total con IVA = 8,791.83 USD
```

---

### Simulation C — ISOFRIG_PIR 80mm, 6×4m, camara_frigorifica

**Parameters:** `familia=ISOFRIG_PIR, espesor_mm=80, ancho_m=6, largo_m=4`

```
au_m = 1.00 m
Techo:             cantP = ceil(6/1) = 6  → 6 × 1 × 4 = 24 m²
Pared frontal:     cantP = ceil(6/1) = 6  → 6 × 1 × 3 = 18 m² (alto_m=3)
Pared lateral:     cantP = ceil(4/1) = 4  → 4 × 1 × 3 = 12 m² (ancho_m=largo_m=4)
```

| Sección | cant_paneles | área m² | Subtotal USD |
|---|---|---|---|
| techo | 6 | 24.0 | 1,497.86 |
| pared_frontal_posterior | 6 | 18.0 | 1,274.87 |
| pared_lateral | 4 | 12.0 | 875.78 |

```
Subtotal sin IVA = 3,648.51 USD
IVA 22%         =   802.67 USD
Total con IVA   = 4,451.18 USD
```

**Cross-section deduplication in effect:**
SKUs `TMOME`, `ARATRAP`, `C.But.`, `Bromplast` appear in all 3 sections
but are resolved only once by `batchGetPrices()`.

---

## 16. TEST SUITE DOCUMENTATION

**Status: 69/69 passing** (as of commit `e2e34bd`)

### techo.test.js — 18 tests

| Describe | Test | Assertion |
|---|---|---|
| ISODEC EPS 100mm 5×11m | tipo techo | `result.tipo === 'techo'` |
| | cant_paneles = 5 | `ceil(5/1.12) = 5` |
| | subtotal > 0 | |
| | panel SKU ISODEC_EPS_100 | cantidad = 5 |
| | gotero frontal 6838 | present, qty > 0 |
| | gotero lateral 6842 | present, qty > 0 |
| | babeta 6828 | present |
| | **VARILLA38 presente** | sist. varilla_tuerca ← corrected in v5 |
| | **ARCA38 presente** | sist. varilla_tuerca ← corrected in v5 |
| | C.But. presente | |
| | Bromplast presente | |
| | area_m2 correcto | `ceil(5/1.12) × 1.12 × 11` |
| | NO incluye canalón por defecto | SKU 6801 undefined |
| ISODEC EPS canalón+cumbrera | canalón 6801 presente | |
| | soporte canalón 6805 | |
| | cumbrera 6847 | |
| ISOROOF 3G 50mm 4×8m | panel IROOF50 | |
| | gotero frontal GFS50 | |
| | gotero superior GFSUP50 | |
| | gotero lateral GL50 | |
| | **incluye CABALLETE** | sist. caballete_tornillo ← corrected in v5 |
| | NO incluye varilla | ISOROOF uses caballete, not varilla |
| input por cant_paneles | cant_paneles=10, IROROOF 50mm | |
| NaN guards | todos finite con IROROOF | |
| | todos finite con ISODEC+canalón | |

### pared.test.js — 12 tests

| Test key | Assertion |
|---|---|
| tipo pared | `result.tipo === 'pared'` |
| cant_paneles = 3 | `ceil(3/1.0) = 3` |
| subtotal > 0 | |
| panel SKU ISD100EPS, qty=3 | |
| perfil U PU100MM present | |
| TMOME presente (metal) | |
| ARATRAP presente | |
| RPOP presente | |
| C.But. presente | |
| Bromplast presente | |
| **K2 incluido; NO G2** | `incl_k2=true, cantP=3>1` ← corrected in v5 |
| NO TMOME para hormigon | estructura='hormigon' |
| ISOFRIG 40mm → PU50MM | thickness 40mm maps to PU50MM |
| ISOFRIG 60mm → PU50MM | thickness 60mm maps to PU50MM |
| cant_paneles=5 ISOWALL | |

### api.test.js — 39 tests

Key test groups:
- `GET /health` — status ok
- `GET /api/productos` — returns all 8 families
- `GET /api/autoportancia` — span validation
- `POST /api/cotizar` — full quote with real SKUs
- `POST /api/cotizar` — validation errors (400)
- `POST /api/pdf` — PDF generation
- `GET /api/logica` — logic config access
- `PATCH /api/logica` — config update
- `DELETE /api/logica/reset` — config reset

### Corrected tests (5 tests fixed in v5)

| File | Old assertion | Corrected assertion | Reason |
|---|---|---|---|
| techo.test.js | TMOME presente (ISODEC_EPS) | VARILLA38 presente | ISODEC_EPS → varilla_tuerca |
| techo.test.js | ARATRAP presente (ISODEC_EPS) | ARCA38 presente | same |
| techo.test.js | NO incluye caballete (IROROOF) | CABALLETE presente | IROROOF_3G → caballete_tornillo |
| pared.test.js | NO incluye K2 | K2 definido, NO G2 | K2 included by default |
| api.test.js | TMOME en ISODEC_EPS | VARILLA38 + ARCA38 | same as above |

---

## 17. API ENDPOINTS REFERENCE

### GET /health
Returns: `{ status: "ok" }`

### GET /api/productos
Returns: `{ ok: true, catalogo: [{ familia, espesores }] }`

### GET /api/autoportancia[?familia&espesor&luz]
Returns span validation table or single-point check.
`{ ok, tabla, valido, luz_max, mensaje }`

### POST /api/cotizar
Body:
```json
{
  "escenario": "techo_fachada",
  "familia": "ISOROOF_3G",
  "espesor_mm": 50,
  "ancho_m": 10,
  "largo_m": 6,
  "lista_precios": "venta",
  "estructura": "metal",
  "tiene_cumbrera": false,
  "tiene_canalon": false,
  "tipo_gotero_frontal": "liso",
  "incl_k2": true,
  "incl_5852": false,
  "num_esq_ext": 0,
  "num_esq_int": 0,
  "aberturas": []
}
```

Returns: `{ ok: true, cotizacion: { cotizacion_id, fecha, escenario, familia, espesor_mm, lista_precios, secciones, resumen, warnings, nota } }`

Error (400): `{ ok: false, error: "message" }`

### POST /api/pdf
Same body as /api/cotizar. Returns PDF binary (`Content-Type: application/pdf`).

### GET /api/logica
Returns current `logic_config.json` contents.

### PATCH /api/logica
Body: partial update to `logic_config.json`.
Takes effect immediately (no restart needed).

### DELETE /api/logica/reset
Resets `logic_config.json` to defaults.

### GET /api/logica/html
Returns HTML visual view of logic_config for browser reading.

---

## 18. CONFIGURATION FILE — logic_config.json

Located at: `calculadora/src/data/logic_config.json`

Structure:
```json
{
  "_version": "...",
  "_actualizado": "...",
  "_nota": "...",
  "iva_rate": 0.22,
  "formula_params": {
    "techo": { ... },
    "pared": { ... }
  },
  "panel_largos": {
    "ISOROOF_3G": { "lmin": 3.5, "lmax": 8.5 },
    "ISODEC_EPS":  { "lmin": 2.3, "lmax": 14.0 },
    ...
  },
  "colores": { ... },
  "autoportancia": { ... },
  "accesorios": {
    "VARILLA38": { "nombre": "...", "precio_venta": 3.12, "precio_web": 3.64, ... },
    ...
  }
}
```

**Live-edit behavior**: `config_loader.js` caches with `_config` variable but
the PATCH endpoint invalidates the cache, so changes take effect on the next request.
CSV is read once at module load (synchronous) and never re-read — requires restart
for CSV price changes.

---

## 19. VALIDATION RULES

### Input validation (bom.js)

1. `escenario` must be one of the 4 valid values
2. Exactly ONE of `ancho_m` OR `cant_paneles` must be provided (not both, not neither)
3. `ancho_m` must be a finite positive number
4. `cant_paneles` must be a finite positive number
5. `largo_m` must be a finite positive number

### Soft warnings (included in output, don't block quote)

- `largo_m < lmin` for this family → warning
- `largo_m > lmax` for this family → warning
- Color not available for this family → warning
- Color only available up to certain thickness → warning
- Autoportancia: span (luz) exceeds `luz_max` for this family+thickness → warning

### Span validation (autoportancia)

`luz = largo_m / (apoyos + 1)`

The autoportancia table is read from `logic_config.json`. Each family+thickness
has a `luz_max` in meters. If `luz > luz_max`, a warning is added.

### collectItem guard

Any item with `sku = null`, `cantidad = 0`, `NaN`, or `Infinity` is silently
dropped before being added to rawItems. This prevents phantom zero-qty items.

---

## 20. ARCHITECTURE DECISION RECORD

### ADR-001: Two-phase calculation separation

**Decision**: Separate quantity calculation (Phase 1) from price resolution (Phase 2).

**Rationale**:
- Quantity logic is deterministic, price-agnostic, and can be tested without
  catalog access
- Enables computing venta+web prices from a single quantity pass
- Enables cross-section SKU deduplication in batchGetPrices()

**Trade-off**: Slightly more complex flow (3 phases vs 1), but the abstraction
cost is minimal given the performance and testability gains.

### ADR-002: hardcodedPanelPrices Map for ISODEC_EPS

**Decision**: Build a reverse lookup Map (SKU → {venta, web}) from PANEL_DEFS at
module load, used as a third fallback in batchGetPrices().

**Rationale**: ISODEC_EPS prices are temporarily hardcoded in PANEL_DEFS (not in
CSV). When batchGetPrices() encounters these SKUs, it needs a path to resolve them.
Building the Map at module load is O(1) per lookup and avoids iterating PANEL_DEFS
on every price resolution call.

**Future**: When ISODEC_EPS prices are added to `catalog_real.csv`, remove the
`venta`/`web` fields from PANEL_DEFS and the `hardcodedPanelPrices` fallback.

### ADR-003: Panel item _area carries areaNeta (pared), not areaBruta

**Decision**: In `calcCantidadesPared`, the panel rawItem's `_area` field is set
to `areaNeta` (area after deducting openings).

**Rationale**: Customer pays for the net panel area installed, not the gross
footprint. A wall with 2 windows is cheaper than a solid wall of the same
dimensions.

**Implication**: `enrichRawItems()` computes `subtotal = areaNeta × precio_m2`.
The `cant_paneles` field still reflects the physical panel count (ceiling of
gross width / au_m) — panels are ordered whole.

### ADR-004: camara_frigorifica uses fixed alto_m = 3

**Decision**: Cold room height is hardcoded to 3 meters.

**Rationale**: Panelin's standard cold room configuration. The variable dimension
is the floor footprint (ancho_m × largo_m passed as input).

**Future**: Expose `alto_m` as an optional parameter with default 3.

---

## APPENDIX A — Git commit history (v5 branch)

```
e2e34bd  refactor: implement two-phase batch architecture for catalog price resolution
b426fa6  docs: add complete step-by-step calculation trace with real prices
7f92814  docs: add comprehensive system report and structured spec for Calculadora Panelin
1f0bb63  feat(v5.3): manual visual HTML + endpoint /api/logica/html
e9190f0  feat(v5.2): logic_config.json — archivo maestro de precios y fórmulas editable
1782b01  feat(v5.1): evolución compartida — paridad funcional con v3.1 Calculadora-BMC
```

---

## APPENDIX B — Comparison checklist for parallel implementations

Use this checklist when comparing this implementation against another codebase ("Guido"):

- [ ] `au_m` values match per family/thickness
- [ ] Panel count formula: `ceil(ancho_m / au_m)` — not floor, not round
- [ ] Area formula: `cantP × au_m × largo_m` — uses actual panel width, not requested ancho_m
- [ ] Fastening system assignment matrix matches (ISODEC→varilla, ISOROOF→caballete, rest→tmome)
- [ ] Varilla formula: `ptosFij × 0.25` varillas, each needing 2 tuercas + 2 arandelas
- [ ] Caballete formula: `cantP × 3 × (largo_m/2.9+1) + largo_m×2/0.3`
- [ ] TMOME techo: 6/m², TMOME pared: 5.5/m²
- [ ] Gotero lateral qty: `ceil(largo_m/3.0) × 2` — factor 2 for both sides
- [ ] Gotero frontal/superior qty: based on `anchoEfectivo`, not `ancho_m`
- [ ] Pared panel pricing: net area (after aberturas), not gross
- [ ] Butilo rollos: `max(1, ceil((cantP-1)×largo_m/22.5))`
- [ ] Silicona techo: `ceil(cantP × 0.5)`, pared: `ceil(mlJuntas/8)`
- [ ] IVA: 22% applied once to `subtotal_sin_iva` total (not per section)
- [ ] camara_frigorifica: 3 sections, fixed height=3m, lateral uses `ancho_m=params.largo_m`
- [ ] ISODEC_EPS prices resolved via hardcodedPanelPrices fallback (not CSV)
- [ ] `precio_unit` for panels = `precio_m2 × au_m × largo_m` (per-panel display price)

---

*End of Technical Reference v5 — Calculadora Panelin BMC Uruguay*
*Branch: claude/deploy-gpt-panelin-v5-DXeCm | Tests: 69/69 | Date: 2026-03-06*
