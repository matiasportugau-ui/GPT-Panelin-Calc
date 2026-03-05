'use strict';

const fs = require('fs');
const path = require('path');

const IVA_RATE = 0.22;

// Parse a single CSV line handling quoted fields (some names contain commas)
function parseLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += c;
    }
  }
  fields.push(field.trim());
  return fields;
}

// Safely parse a float (handles "on demand", "N/A", European "22,5" notation)
function parseNum(s) {
  if (!s || s === '' || /demand|n\/a/i.test(s)) return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Build SKU map from CSV
// Columns: supplier(0), family(1), category(2), sub_family(3), sku(4), name(5),
//   thickness_mm(6), length_m(7), unit_base(8), length_range(9), compatibility(10),
//   composition(11), cost_excl_vat(12), cost_incl_vat(13), sale_excl_vat(14),
//   sale_incl_vat(15), margin_percent(16), profit(17), consumer_final(18),
//   web_price_excl_vat(19), web_sale_incl_vat(20), web_sale_incl_vat_alt(21),
//   web_price_incl_vat(22), price_public(23)
const CSV_PATH = path.join(__dirname, 'catalog_real.csv');
const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter(l => l.trim());

const skuMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const c = parseLine(lines[i]);
  const sku = c[4] ? c[4].trim() : null;
  if (!sku) continue;

  let venta = parseNum(c[14]); // sale_excl_vat
  const saleIncl = parseNum(c[15]); // sale_incl_vat
  let web = parseNum(c[19]); // web_price_excl_vat
  const webIncl = parseNum(c[20]); // web_sale_incl_vat

  // Fallback: derive excl-VAT from incl-VAT when needed
  if (venta === null && saleIncl !== null) venta = saleIncl / (1 + IVA_RATE);
  if (web === null && webIncl !== null) web = webIncl / (1 + IVA_RATE);
  if (web === null && venta !== null) web = venta;

  skuMap.set(sku, {
    sku,
    family: (c[1] || '').trim(),
    category: (c[2] || '').trim(),
    name: (c[5] || '').trim(),
    thickness_mm: parseNum(c[6]),
    length_m: parseNum(c[7]),
    unit_base: (c[8] || 'unit').trim(),
    composition: (c[11] || '').trim(),
    venta: venta !== null ? Math.round(venta * 10000) / 10000 : null,
    web: web !== null ? Math.round(web * 10000) / 10000 : null,
  });
}

// Panel definition map: internalFamily → { thickness_mm → { sku, au_m, [hardcoded prices] } }
// au_m = ancho útil en metros (effective panel width)
const PANEL_DEFS = {
  ISOROOF_3G: {
    30: { sku: 'IROOF30', au_m: 1.10 },
    40: { sku: 'IROOF40', au_m: 1.10 },
    50: { sku: 'IROOF50', au_m: 1.10 },
    80: { sku: 'IROOF80', au_m: 1.10 },
    100: { sku: 'IROOF100', au_m: 1.10 },
  },
  ISOROOF_FOIL: {
    30: { sku: 'IAGRO30', au_m: 1.10 },
    50: { sku: 'IAGRO50', au_m: 1.10 },
  },
  ISOROOF_PLUS: {
    50: { sku: 'IROOF50-PLS', au_m: 1.10 },
    80: { sku: 'IROOF80-PLS', au_m: 1.10 },
  },
  ISODEC_PIR: {
    50: { sku: 'ISD50PIR', au_m: 1.12 },
    80: { sku: 'ISD80PIR', au_m: 1.12 },
  },
  // ISODEC_EPS: NOT in CSV — use Wolf API prices (hardcoded temporarily)
  ISODEC_EPS: {
    100: { sku: 'ISODEC_EPS_100', au_m: 1.12, venta: 46.07, web: 46.07, name: 'ISODEC EPS 100mm' },
    150: { sku: 'ISODEC_EPS_150', au_m: 1.12, venta: 51.50, web: 51.50, name: 'ISODEC EPS 150mm' },
    200: { sku: 'ISODEC_EPS_200', au_m: 1.12, venta: 57.00, web: 57.00, name: 'ISODEC EPS 200mm' },
    250: { sku: 'ISODEC_EPS_250', au_m: 1.12, venta: 62.50, web: 62.50, name: 'ISODEC EPS 250mm' },
  },
  ISOPANEL_EPS: {
    50: { sku: 'ISD50EPS', au_m: 1.00 },
    100: { sku: 'ISD100EPS', au_m: 1.00 },
    150: { sku: 'ISD150EPS', au_m: 1.00 },
    200: { sku: 'ISD200EPS', au_m: 1.00 },
    250: { sku: 'ISD250EPS', au_m: 1.00 },
  },
  ISOWALL_PIR: {
    50: { sku: 'IW50', au_m: 1.00 },
    80: { sku: 'IW80', au_m: 1.00 },
    100: { sku: 'IW100', au_m: 1.00 },
  },
  ISOFRIG_PIR: {
    40: { sku: 'IF40', au_m: 1.00 },
    60: { sku: 'IF60 - IFSL60', au_m: 1.00 },
    80: { sku: 'IF80 - IFSL80', au_m: 1.00 },
    100: { sku: 'IF100 - IFSL100', au_m: 1.00 },
    150: { sku: 'IF150 - IFSL150', au_m: 1.00 },
  },
};

/**
 * Get panel info by internal family name and thickness.
 * @param {string} familia - e.g. 'ISODEC_EPS', 'ISOROOF_3G'
 * @param {number} espesor_mm
 * @param {'venta'|'web'} lista_precios
 * @returns {{ sku, name, au_m, precio_m2 }}
 */
function getPanelInfo(familia, espesor_mm, lista_precios = 'venta') {
  const familyDef = PANEL_DEFS[familia];
  if (!familyDef) {
    throw new Error(`Familia no encontrada: ${familia}. Disponibles: ${Object.keys(PANEL_DEFS).join(', ')}`);
  }
  const def = familyDef[Number(espesor_mm)];
  if (!def) {
    throw new Error(`Espesor ${espesor_mm}mm no disponible para ${familia}`);
  }

  // ISODEC_EPS has hardcoded prices (not in CSV)
  if (def.venta !== undefined) {
    return {
      sku: def.sku,
      name: def.name || `${familia} ${espesor_mm}mm`,
      au_m: def.au_m,
      precio_m2: lista_precios === 'web' ? def.web : def.venta,
    };
  }

  const row = skuMap.get(def.sku);
  if (!row) throw new Error(`SKU no encontrado en catálogo: ${def.sku}`);
  const precio = lista_precios === 'web' ? row.web : row.venta;
  if (precio === null || precio === undefined) {
    throw new Error(`Precio no disponible para ${def.sku}`);
  }
  return {
    sku: def.sku,
    name: row.name,
    au_m: def.au_m,
    precio_m2: precio,
  };
}

// Hardcoded accessories not present in catalog_real.csv
// Prices from v3.1 Calculadora-BMC reference (USD excl. IVA)
const HARDCODED_ACCESSORIES = {
  // --- Fijaciones techo varilla-tuerca (ISODEC_EPS / ISODEC_PIR) ---
  'VARILLA38':    { name: 'Varilla roscada 3/8"',           venta: 3.12,  web: 3.64,  unit_base: 'unid',  length_m: null },
  'TUERCA38':     { name: 'Tuerca 3/8" galv.',               venta: 0.12,  web: 0.07,  unit_base: 'unid',  length_m: null },
  'ARCA38':       { name: 'Arandela carrocero 3/8"',         venta: 1.68,  web: 0.64,  unit_base: 'unid',  length_m: null },
  'ARAPP':        { name: 'Tortuga PVC (arandela PP)',        venta: 1.27,  web: 1.48,  unit_base: 'unid',  length_m: null },
  'TACEXP38':     { name: 'Taco expansivo 3/8"',             venta: 0.96,  web: 1.12,  unit_base: 'unid',  length_m: null },
  // --- Fijaciones techo caballete-tornillo (ISOROOF_*) ---
  'CABALLETE':    { name: 'Caballete (arandela trapezoidal)', venta: 0.50,  web: 0.46,  unit_base: 'unid',  length_m: null },
  'TORN_AGUJA':   { name: 'Tornillo aguja 5"',               venta: 17.00, web: 17.00, unit_base: 'x100',  length_m: null },
  // --- Fijaciones pared ---
  'ANCLAJE_H':    { name: 'Kit anclaje H°',                  venta: 0.09,  web: 0.03,  unit_base: 'unid',  length_m: null },
  'TORN_T1':      { name: 'Tornillo T1 (perfilería)',         venta: 5.00,  web: 5.00,  unit_base: 'x100',  length_m: null },
  'TORN_T2':      { name: 'Tornillo T2 (fachada)',            venta: 5.00,  web: 5.00,  unit_base: 'x100',  length_m: null },
  // --- Perfilería pared ---
  'K2':           { name: 'Perfil K2 (junta interior)',       venta: 8.59,  web: 10.48, unit_base: 'pieza', length_m: 3.0  },
  'ESQ-EXT':      { name: 'Esquinero exterior',               venta: 8.59,  web: 10.48, unit_base: 'pieza', length_m: 3.0  },
  'ESQ-INT':      { name: 'Esquinero interior',               venta: 8.59,  web: 10.48, unit_base: 'pieza', length_m: 3.0  },
  'G2-100':       { name: 'Perfil G2 100mm',                  venta: 15.34, web: 18.72, unit_base: 'pieza', length_m: 3.0  },
  'G2-150':       { name: 'Perfil G2 150mm',                  venta: 17.61, web: 21.49, unit_base: 'pieza', length_m: 3.0  },
  'G2-200':       { name: 'Perfil G2 200mm',                  venta: 21.13, web: 25.78, unit_base: 'pieza', length_m: 3.0  },
  'G2-250':       { name: 'Perfil G2 250mm',                  venta: 21.30, web: 25.99, unit_base: 'pieza', length_m: 3.0  },
  'PLECHU98':     { name: 'Ángulo aluminio 5852 (6.8m)',       venta: 51.84, web: 63.24, unit_base: 'pieza', length_m: 6.8  },
  // --- Selladores extra ---
  'MEMBRANA':     { name: 'Membrana autoadhesiva 30cm×10m',   venta: 16.62, web: 20.28, unit_base: 'rollo', length_m: null },
  'ESPUMA_PU':    { name: 'Espuma poliuretano 750cm³',         venta: 25.46, web: 31.06, unit_base: 'unid',  length_m: null },
  // --- Goteros extra techo ---
  'GFCGR30':      { name: 'Gotero frontal greca ISOROOF',      venta: 17.99, web: 19.38, unit_base: 'pieza', length_m: 3.03 },
  'GLDCAM50':     { name: 'Gotero lateral cámara 50mm',        venta: 22.32, web: 27.23, unit_base: 'pieza', length_m: 3.0  },
  'GLDCAM80':     { name: 'Gotero lateral cámara 80mm',        venta: 25.11, web: 30.63, unit_base: 'pieza', length_m: 3.0  },
};

/**
 * Get accessory info by SKU.
 * Looks up catalog_real.csv first; falls back to HARDCODED_ACCESSORIES.
 * @param {string} sku
 * @param {'venta'|'web'} lista_precios
 * @returns {{ sku, name, precio, length_m, unit_base }}
 */
function getAccessoryInfo(sku, lista_precios = 'venta') {
  const row = skuMap.get(sku);
  if (row) {
    const precio = lista_precios === 'web' ? row.web : row.venta;
    if (precio === null || precio === undefined) {
      throw new Error(`Precio no disponible para SKU ${sku}`);
    }
    return { sku: row.sku, name: row.name, precio, length_m: row.length_m, unit_base: row.unit_base };
  }

  const hard = HARDCODED_ACCESSORIES[sku];
  if (hard) {
    const precio = lista_precios === 'web' ? hard.web : hard.venta;
    return { sku, name: hard.name, precio, length_m: hard.length_m, unit_base: hard.unit_base };
  }

  throw new Error(`Accesorio no encontrado: ${sku}`);
}

/**
 * List all available panel families with thicknesses.
 * @returns {Array<{ familia: string, espesores: number[] }>}
 */
function listFamilies() {
  return Object.entries(PANEL_DEFS).map(([familia, thicknesses]) => ({
    familia,
    espesores: Object.keys(thicknesses).map(Number).sort((a, b) => a - b),
  }));
}

function ivaRate() {
  return IVA_RATE;
}

module.exports = { getPanelInfo, getAccessoryInfo, listFamilies, ivaRate };
