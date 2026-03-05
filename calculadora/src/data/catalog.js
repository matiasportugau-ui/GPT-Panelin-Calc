'use strict';

const fs = require('fs');
const path = require('path');

// Parse CSV with basic quoted-field handling
function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j].trim()] = (values[j] || '').trim();
    }
    rows.push(obj);
  }
  return rows;
}

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseNum(val) {
  if (!val || val === 'N/A' || val === 'on demand') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// Load and index catalog
const csvPath = path.join(__dirname, 'catalog_real.csv');
const csvText = fs.readFileSync(csvPath, 'utf8');
const RAW_ROWS = parseCSV(csvText);

// Index by SKU
const BY_SKU = {};
for (const row of RAW_ROWS) {
  if (!row.sku) continue;
  BY_SKU[row.sku] = row;
}

// ISODEC EPS panels (not in CSV, Wolf API prices)
const ISODEC_EPS_PANELS = {
  100: { sku: 'ISDEC100EPS', name: 'ISODEC EPS 100mm', sale_excl_vat: 46.07, web_price_excl_vat: 46.07, au_m: 1.12 },
  150: { sku: 'ISDEC150EPS', name: 'ISODEC EPS 150mm', sale_excl_vat: 51.50, web_price_excl_vat: 51.50, au_m: 1.12 },
  200: { sku: 'ISDEC200EPS', name: 'ISODEC EPS 200mm', sale_excl_vat: 57.00, web_price_excl_vat: 57.00, au_m: 1.12 },
  250: { sku: 'ISDEC250EPS', name: 'ISODEC EPS 250mm', sale_excl_vat: 62.50, web_price_excl_vat: 62.50, au_m: 1.12 },
};

// Panel ancho util by family
const PANEL_AU = {
  ISOROOF: 1.10,
  ISODEC: 1.12,
  ISOPANEL: 1.00,
  ISOWALL: 1.00,
  ISOFRIG: 1.00,
};

// Panel SKU mapping: family+thickness -> SKU
const PANEL_SKUS = {
  // ISOROOF 3G
  'ISOROOF_3G_30': 'IROOF30', 'ISOROOF_3G_40': 'IROOF40', 'ISOROOF_3G_50': 'IROOF50',
  'ISOROOF_3G_80': 'IROOF80', 'ISOROOF_3G_100': 'IROOF100',
  // ISOROOF FOIL
  'ISOROOF_FOIL_30': 'IAGRO30', 'ISOROOF_FOIL_50': 'IAGRO50',
  // ISOROOF Plus
  'ISOROOF_PLUS_50': 'IROOF50-PLS', 'ISOROOF_PLUS_80': 'IROOF80-PLS',
  // ISODEC PIR
  'ISODEC_PIR_50': 'ISD50PIR', 'ISODEC_PIR_80': 'ISD80PIR',
  // ISOPANEL EPS
  'ISOPANEL_EPS_50': 'ISD50EPS', 'ISOPANEL_EPS_100': 'ISD100EPS',
  'ISOPANEL_EPS_150': 'ISD150EPS', 'ISOPANEL_EPS_200': 'ISD200EPS', 'ISOPANEL_EPS_250': 'ISD250EPS',
  // ISOWALL PIR
  'ISOWALL_PIR_50': 'IW50', 'ISOWALL_PIR_80': 'IW80', 'ISOWALL_PIR_100': 'IW100',
  // ISOFRIG PIR
  'ISOFRIG_PIR_40': 'IF40 ', 'ISOFRIG_PIR_60': 'IF60 - IFSL60',
  'ISOFRIG_PIR_80': 'IF80 - IFSL80', 'ISOFRIG_PIR_100': 'IF100 - IFSL100', 'ISOFRIG_PIR_150': 'IF150 - IFSL150',
};

// Gotero Frontal mapping: family_thickness -> SKU
const GOTERO_FRONTAL = {
  'ISOROOF_3G_30': 'GFS30', 'ISOROOF_3G_40': 'GFS30', 'ISOROOF_3G_50': 'GFS50',
  'ISOROOF_3G_80': 'GFS80', 'ISOROOF_3G_100': 'GFS80',
  'ISOROOF_FOIL_30': 'GFS30', 'ISOROOF_FOIL_50': 'GFS50',
  'ISOROOF_PLUS_50': 'GFS50', 'ISOROOF_PLUS_80': 'GFS80',
  'ISODEC_PIR_50': 'GF80DC', 'ISODEC_PIR_80': 'GF120DC',
  'ISODEC_EPS_100': '6838', 'ISODEC_EPS_150': '6839', 'ISODEC_EPS_200': '6840', 'ISODEC_EPS_250': '6841',
};

// Gotero Superior mapping
const GOTERO_SUPERIOR = {
  'ISOROOF_3G_30': 'GFSUP30', 'ISOROOF_3G_40': 'GFSUP40', 'ISOROOF_3G_50': 'GFSUP50',
  'ISOROOF_3G_80': 'GFSUP80', 'ISOROOF_3G_100': 'GFSUP80',
  'ISOROOF_FOIL_30': 'GFSUP30', 'ISOROOF_FOIL_50': 'GFSUP50',
  'ISOROOF_PLUS_50': 'GFSUP50', 'ISOROOF_PLUS_80': 'GFSUP80',
  'ISODEC_PIR_50': 'GSDECAM50', 'ISODEC_PIR_80': 'GSDECAM80',
  'ISODEC_EPS_100': 'GSDECAM50', 'ISODEC_EPS_150': 'GSDECAM50',
  'ISODEC_EPS_200': 'GSDECAM80', 'ISODEC_EPS_250': 'GSDECAM80',
};

// Gotero Lateral mapping
const GOTERO_LATERAL = {
  'ISOROOF_3G_30': 'GL30', 'ISOROOF_3G_40': 'GL40', 'ISOROOF_3G_50': 'GL50',
  'ISOROOF_3G_80': 'GL80', 'ISOROOF_3G_100': 'GL80',
  'ISOROOF_FOIL_30': 'GL30', 'ISOROOF_FOIL_50': 'GL50',
  'ISOROOF_PLUS_50': 'GL50', 'ISOROOF_PLUS_80': 'GL80',
  'ISODEC_PIR_50': 'GL80DC', 'ISODEC_PIR_80': 'GL120DC',
  'ISODEC_EPS_100': '6842', 'ISODEC_EPS_150': '6843', 'ISODEC_EPS_200': '6844', 'ISODEC_EPS_250': '6845',
};

// Canalon mapping
const CANALON = {
  'ISOROOF_3G_30': 'CD30', 'ISOROOF_3G_40': 'CD50', 'ISOROOF_3G_50': 'CD50',
  'ISOROOF_3G_80': 'CD80', 'ISOROOF_3G_100': 'CD80',
  'ISOROOF_FOIL_30': 'CD30', 'ISOROOF_FOIL_50': 'CD50',
  'ISOROOF_PLUS_50': 'CD50', 'ISOROOF_PLUS_80': 'CD80',
  'ISODEC_PIR_50': 'CAN.ISDC120', 'ISODEC_PIR_80': 'CAN.ISDC120',
  'ISODEC_EPS_100': '6801', 'ISODEC_EPS_150': '6802', 'ISODEC_EPS_200': '6803', 'ISODEC_EPS_250': '6804',
};

// Cumbrera mapping
const CUMBRERA = {
  ISOROOF_3G: 'CUMROOF3M', ISOROOF_FOIL: 'CUMROOF3M', ISOROOF_PLUS: 'CUMROOF3M',
  ISODEC_PIR: '6847', ISODEC_EPS: '6847',
};

// Soporte canalon mapping
const SOPORTE_CANALON = {
  ISOROOF_3G: 'SOPCAN3M', ISOROOF_FOIL: 'SOPCAN3M', ISOROOF_PLUS: 'SOPCAN3M',
  ISODEC_PIR: '6805', ISODEC_EPS: '6805',
};

// Perfil U mapping by thickness
const PERFIL_U = {
  40: 'PU50MM', 50: 'PU50MM', 60: 'PU50MM',
  80: 'PU100MM', 100: 'PU100MM',
  150: 'PU150MM', 200: 'PU200MM', 250: 'PU250MM',
};

function getPrice(row, lista) {
  if (!row) return 0;
  if (lista === 'web') {
    const wp = parseNum(row.web_price_excl_vat);
    if (wp) return wp;
  }
  const sp = parseNum(row.sale_excl_vat);
  if (sp) return sp;
  const wp2 = parseNum(row.web_price_excl_vat);
  if (wp2) return wp2;
  return 0;
}

function getPanelByFamilyAndThickness(family, thickness_mm, lista_precios) {
  lista_precios = lista_precios || 'venta';

  // ISODEC EPS special case
  if (family === 'ISODEC_EPS') {
    const d = ISODEC_EPS_PANELS[thickness_mm];
    if (!d) throw new Error(`Espesor ${thickness_mm}mm no disponible para ${family}`);
    return {
      sku: d.sku,
      name: d.name,
      precio_m2: lista_precios === 'web' ? d.web_price_excl_vat : d.sale_excl_vat,
      au_m: d.au_m,
    };
  }

  const key = `${family}_${thickness_mm}`;
  const sku = PANEL_SKUS[key];
  if (!sku) throw new Error(`Panel no encontrado: ${family} ${thickness_mm}mm`);
  const row = BY_SKU[sku];
  if (!row) throw new Error(`SKU ${sku} no encontrado en catálogo`);

  const baseFamily = family.split('_')[0];
  return {
    sku,
    name: row.name,
    precio_m2: getPrice(row, lista_precios),
    au_m: PANEL_AU[baseFamily] || 1.0,
  };
}

function getAccessoryBySKU(sku, lista_precios) {
  lista_precios = lista_precios || 'venta';
  const row = BY_SKU[sku];
  if (!row) throw new Error(`Accesorio no encontrado: ${sku}`);
  return {
    sku,
    name: row.name,
    precio: getPrice(row, lista_precios),
    length_m: parseNum(row.length_m),
    unit: row.unit_base || 'unit',
  };
}

function getAccessoryPrice(sku, lista_precios) {
  lista_precios = lista_precios || 'venta';

  // Special hardcoded prices for items without prices in CSV
  const HARDCODED = {
    'TMOME': { venta: 0.80, web: 1.016 },
    'ARATRAP': { venta: 0.89, web: 1.13 },
    'TC100U': { venta: 28.65, web: 36.38 },
    'RPOP': { venta: 60, web: 73.20 },
    'REMPOP': { venta: 0.0315, web: 0.0105 },
    'ANCNO10': { venta: 0.0882, web: 0.0294 },
  };

  if (HARDCODED[sku]) {
    return HARDCODED[sku][lista_precios] || HARDCODED[sku].venta;
  }

  const row = BY_SKU[sku];
  if (!row) throw new Error(`Accesorio no encontrado: ${sku}`);
  return getPrice(row, lista_precios);
}

function resolveGoteroFrontal(family, thickness_mm) {
  return GOTERO_FRONTAL[`${family}_${thickness_mm}`] || null;
}

function resolveGoteroSuperior(family, thickness_mm) {
  return GOTERO_SUPERIOR[`${family}_${thickness_mm}`] || null;
}

function resolveGoteroLateral(family, thickness_mm) {
  return GOTERO_LATERAL[`${family}_${thickness_mm}`] || null;
}

function resolveCanalon(family, thickness_mm) {
  return CANALON[`${family}_${thickness_mm}`] || null;
}

function resolveCumbrera(family) {
  return CUMBRERA[family] || null;
}

function resolveSoporteCanalon(family) {
  return SOPORTE_CANALON[family] || null;
}

function resolvePerfilU(thickness_mm) {
  return PERFIL_U[thickness_mm] || PERFIL_U[100];
}

function listFamilies() {
  const families = {};
  for (const [key] of Object.entries(PANEL_SKUS)) {
    const parts = key.split('_');
    const thickness = parseInt(parts[parts.length - 1]);
    const family = parts.slice(0, -1).join('_');
    if (!families[family]) families[family] = [];
    families[family].push(thickness);
  }
  // Add ISODEC_EPS
  families['ISODEC_EPS'] = [100, 150, 200, 250];
  // Sort thicknesses
  for (const f of Object.keys(families)) {
    families[f].sort((a, b) => a - b);
  }
  return Object.entries(families).map(([familia, espesores]) => ({ familia, espesores }));
}

function ivaRate() {
  return 0.22;
}

module.exports = {
  getPanelByFamilyAndThickness,
  getAccessoryBySKU,
  getAccessoryPrice,
  resolveGoteroFrontal,
  resolveGoteroSuperior,
  resolveGoteroLateral,
  resolveCanalon,
  resolveCumbrera,
  resolveSoporteCanalon,
  resolvePerfilU,
  listFamilies,
  ivaRate,
  BY_SKU,
  RAW_ROWS,
};
