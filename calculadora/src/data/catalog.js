'use strict';

const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config_loader');

// IVA comes from logic_config.json; fallback to 0.22 during module load
const IVA_RATE = 0.22; // kept for backward compat — use ivaRate() which reads live config

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

// Reverse lookup: panel SKU → { venta, web } for families whose prices are
// hardcoded inside PANEL_DEFS (currently only ISODEC_EPS, not in CSV).
// Built once at module load. Used by batchGetPrices() as a fallback.
const hardcodedPanelPrices = new Map();
for (const thicknesses of Object.values(PANEL_DEFS)) {
  for (const def of Object.values(thicknesses)) {
    if (def.venta !== undefined) {
      hardcodedPanelPrices.set(def.sku, { venta: def.venta, web: def.web ?? def.venta });
    }
  }
}

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

/**
 * Read hardcoded accessories from live config (logic_config.json).
 * This is called on every lookup so price updates take effect immediately.
 */
function getHardcodedAccessory(sku) {
  const acc = getConfig().accesorios[sku];
  if (!acc) return null;
  return {
    name:      acc.nombre,
    venta:     acc.precio_venta,
    web:       acc.precio_web  != null ? acc.precio_web : acc.precio_venta,
    unit_base: acc.unidad  || 'unid',
    length_m:  acc.largo_m != null ? acc.largo_m : null,
  };
}

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

  const hard = getHardcodedAccessory(sku);
  if (hard) {
    const precio = lista_precios === 'web' ? hard.web : hard.venta;
    return { sku, name: hard.name, precio, length_m: hard.length_m, unit_base: hard.unit_base };
  }

  throw new Error(`Accesorio no encontrado: ${sku}`);
}

/**
 * Get panel dimensional data WITHOUT accessing the CSV or price columns.
 * Reads only PANEL_DEFS (hardcoded constants). Safe to call in Phase 1 (quantity-only).
 * @param {string} familia
 * @param {number} espesor_mm
 * @returns {{ sku: string, name: string, au_m: number }}
 */
function getPanelDimensions(familia, espesor_mm) {
  const familyDef = PANEL_DEFS[familia];
  if (!familyDef) {
    throw new Error(`Familia no encontrada: ${familia}. Disponibles: ${Object.keys(PANEL_DEFS).join(', ')}`);
  }
  const def = familyDef[Number(espesor_mm)];
  if (!def) {
    throw new Error(`Espesor ${espesor_mm}mm no disponible para ${familia}`);
  }
  return { sku: def.sku, name: def.name || `${familia} ${espesor_mm}mm`, au_m: def.au_m };
}

/**
 * Resolve prices for multiple SKUs in a single deduplicating pass.
 * Much more efficient than calling getAccessoryInfo() per item when processing
 * multiple sections (techo + pared share SKUs like TMOME, ARATRAP, C.But., Bromplast).
 *
 * @param {string[]} skus  - Array of SKUs (duplicates are deduplicated automatically)
 * @param {'venta'|'web'} lista_precios
 * @returns {Map<string, number>}  sku → precio
 */
function batchGetPrices(skus, lista_precios = 'venta') {
  const priceMap = new Map();
  for (const sku of new Set(skus)) {
    const row = skuMap.get(sku);
    if (row) {
      const precio = lista_precios === 'web' ? row.web : row.venta;
      if (precio === null || precio === undefined) {
        throw new Error(`Precio no disponible para SKU ${sku}`);
      }
      priceMap.set(sku, precio);
      continue;
    }
    const hard = getHardcodedAccessory(sku);
    if (hard) {
      const precio = lista_precios === 'web' ? hard.web : hard.venta;
      priceMap.set(sku, precio);
      continue;
    }
    // Last resort: panel SKU with hardcoded price in PANEL_DEFS (e.g. ISODEC_EPS)
    const panelEntry = hardcodedPanelPrices.get(sku);
    if (panelEntry) {
      priceMap.set(sku, lista_precios === 'web' ? panelEntry.web : panelEntry.venta);
      continue;
    }
    throw new Error(`Accesorio no encontrado: ${sku}`);
  }
  return priceMap;
}

/**
 * Enrich raw BOM items (Phase 1 output) with prices from a pre-resolved price map.
 *
 * Raw items for accessories carry: { sku, descripcion, cantidad, unidad }
 * Raw items for panels carry additionally: { _area, _auM, _largoM }
 *   where _area is the m² to multiply by precio_m2, and _auM/_largoM allow
 *   computing the per-panel display price.
 *
 * @param {Object[]} rawItems  - Phase 1 items (may contain _area/_auM/_largoM)
 * @param {Map<string,number>} priceMap  - From batchGetPrices()
 * @returns {{ items: Object[], subtotal: number }}
 */
function enrichRawItems(rawItems, priceMap) {
  const items = [];
  let subtotal = 0;
  for (const item of rawItems) {
    const { _area, _auM, _largoM, ...clean } = item;
    const precioBase = priceMap.get(item.sku);
    if (precioBase === undefined) {
      throw new Error(`SKU sin precio en priceMap: ${item.sku}`);
    }
    let precio_unit, sub;
    if (_area !== undefined) {
      // Panel: unit = precio_m2; subtotal = area × precio_m2; display price = precio per panel
      sub        = Math.round(_area * precioBase * 100) / 100;
      precio_unit = Math.round(precioBase * _auM * _largoM * 100) / 100;
    } else {
      // Accessory: straightforward unit pricing
      precio_unit = precioBase;
      sub         = Math.round(item.cantidad * precioBase * 100) / 100;
    }
    items.push({ ...clean, precio_unit, subtotal: sub });
    subtotal += sub;
  }
  return { items, subtotal: Math.round(subtotal * 100) / 100 };
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
  // Read live from config so POST /api/logica updates IVA immediately
  return getConfig().iva_rate || IVA_RATE;
}

module.exports = {
  getPanelInfo,
  getPanelDimensions,
  getAccessoryInfo,
  batchGetPrices,
  enrichRawItems,
  listFamilies,
  ivaRate,
};
