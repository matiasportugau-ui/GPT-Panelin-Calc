'use strict';

const fs = require('fs');
const path = require('path');

// ─── CSV parser (handles quoted fields with commas) ───────────────────────────
function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  });
}

const csvPath = path.join(__dirname, 'catalog_real.csv');
const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

// ─── Index by trimmed SKU ─────────────────────────────────────────────────────
const bySku = {};
for (const row of rows) {
  const sku = row.sku && row.sku.trim();
  if (sku) bySku[sku] = row;
}

// ─── Price extractor ──────────────────────────────────────────────────────────
// Some fijaciones rows have empty sale_excl_vat → derive from sale_incl_vat / 1.22
function extractPrice(row, type = 'venta') {
  if (type === 'web') {
    const webExcl = parseFloat(row.web_price_excl_vat);
    if (!isNaN(webExcl) && webExcl > 0) return Math.round(webExcl * 10000) / 10000;
    const webIncl = parseFloat(row.web_sale_incl_vat);
    if (!isNaN(webIncl) && webIncl > 0) return Math.round((webIncl / 1.22) * 10000) / 10000;
  }
  const saleExcl = parseFloat(row.sale_excl_vat);
  if (!isNaN(saleExcl) && saleExcl > 0) return Math.round(saleExcl * 10000) / 10000;
  const saleIncl = parseFloat(row.sale_incl_vat);
  if (!isNaN(saleIncl) && saleIncl > 0) return Math.round((saleIncl / 1.22) * 10000) / 10000;
  return 0;
}

// ─── Panel definitions ────────────────────────────────────────────────────────
// ancho_util (au_m) is a physical property not in the CSV
const AU_BY_FAMILY = {
  ISOROOF_3G:    1.10,
  ISOROOF_FOIL:  1.10,
  ISOROOF_PLUS:  1.10,
  ISODEC_PIR:    1.12,
  ISODEC_EPS:    1.12,
  ISOWALL_PIR:   1.00,
  ISOFRIG_PIR:   1.00,
  ISOPANEL_EPS:  1.00,
};

// SKU per family+espesor
const PANEL_SKU = {
  ISOROOF_3G:   { 30: 'IROOF30', 40: 'IROOF40', 50: 'IROOF50', 80: 'IROOF80', 100: 'IROOF100' },
  ISOROOF_FOIL: { 30: 'IAGRO30', 50: 'IAGRO50' },
  ISOROOF_PLUS: { 50: 'IROOF50-PLS', 80: 'IROOF80-PLS' },
  ISODEC_PIR:   { 50: 'ISD50PIR', 80: 'ISD80PIR' },
  ISOWALL_PIR:  { 50: 'IW50', 80: 'IW80', 100: 'IW100' },
  ISOFRIG_PIR:  { 40: 'IF40', 60: 'IF60 - IFSL60', 80: 'IF80 - IFSL80', 100: 'IF100 - IFSL100', 150: 'IF150 - IFSL150' },
  ISOPANEL_EPS: { 50: 'ISD50EPS', 100: 'ISD100EPS', 150: 'ISD150EPS', 200: 'ISD200EPS', 250: 'ISD250EPS' },
};

// ISODEC_EPS: not in CSV, Wolf API prices (hardcoded)
const ISODEC_EPS_PRICES = {
  100: 46.07,
  150: 51.50,
  200: 57.00,
  250: 62.50,
};

// ─── Terminaciones (goteros, canalones, cumbreras) per family+espesor ─────────
const GOTERO_FRONTAL_SKU = {
  ISOROOF_3G:   { 30: 'GFS30',   50: 'GFS50',   80: 'GFS80' },
  ISOROOF_FOIL: { 30: 'GFS30',   50: 'GFS50' },
  ISOROOF_PLUS: { 50: 'GFS50',   80: 'GFS80' },
  ISODEC_PIR:   { 50: 'GF80DC',  80: 'GF120DC' },
  ISODEC_EPS:   { 100: '6838',   150: '6839',   200: '6840',  250: '6841' },
};

const GOTERO_SUPERIOR_SKU = {
  ISOROOF_3G:   { 30: 'GFSUP30', 40: 'GFSUP40', 50: 'GFSUP50', 80: 'GFSUP80' },
  ISOROOF_FOIL: { 30: 'GFSUP30', 50: 'GFSUP50' },
  ISOROOF_PLUS: { 50: 'GFSUP50', 80: 'GFSUP80' },
  ISODEC_PIR:   { 50: '6828',    80: '6828' },   // babeta de adosar
  ISODEC_EPS:   { 100: '6828',   150: '6828',   200: '6828',  250: '6828' },
};

const GOTERO_LATERAL_SKU = {
  ISOROOF_3G:   { 30: 'GL30',    40: 'GL40',    50: 'GL50',   80: 'GL80' },
  ISOROOF_FOIL: { 30: 'GL30',    50: 'GL50' },
  ISOROOF_PLUS: { 50: 'GL50',    80: 'GL80' },
  ISODEC_PIR:   { 50: 'GL80DC',  80: 'GL120DC' },
  ISODEC_EPS:   { 100: '6842',   150: '6843',   200: '6844',  250: '6845' },
};

const CUMBRERA_SKU = {
  ISOROOF_3G:   'CUMROOF3M',
  ISOROOF_FOIL: 'CUMROOF3M',
  ISOROOF_PLUS: 'CUMROOF3M',
  ISODEC_PIR:   '6847',
  ISODEC_EPS:   '6847',
};

const CANALON_SKU = {
  ISOROOF_3G:   { 30: 'CD30',        50: 'CD50',       80: 'CD80' },
  ISOROOF_FOIL: { 30: 'CD30',        50: 'CD50' },
  ISOROOF_PLUS: { 50: 'CD50',        80: 'CD80' },
  ISODEC_PIR:   { 50: 'CAN.ISDC120' },
  ISODEC_EPS:   { 100: '6801',       150: '6802',      200: '6803', 250: '6804' },
};

const SOPORTE_CANALON_SKU = {
  ISOROOF_3G:   'SOPCAN3M',
  ISOROOF_FOIL: 'SOPCAN3M',
  ISOROOF_PLUS: 'SOPCAN3M',
  ISODEC_PIR:   '6805',
  ISODEC_EPS:   '6805',
};

// Perfil U for paredes, by family+espesor
const PERFIL_U_SKU = {
  ISOFRIG_PIR:  { 40: 'PU50MM',  60: 'PU100MM', 80: 'PU100MM', 100: 'PU100MM', 150: 'PU150MM' },
  ISOPANEL_EPS: { 50: 'PU50MM',  100: 'PU100MM', 150: 'PU150MM', 200: 'PU200MM', 250: 'PU250MM' },
  ISOWALL_PIR:  { 50: 'PU100MM', 80: 'PU100MM', 100: 'PU100MM' },
  ISODEC_PIR:   { 50: 'PU50MM',  80: 'PU100MM' },
  ISODEC_EPS:   { 100: 'PU100MM', 150: 'PU150MM', 200: 'PU200MM', 250: 'PU250MM' },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns panel info: sku, au_m, precio_m2, nombre
 */
function getPanelByFamilyAndThickness(familia, espesor_mm, lista_precios = 'venta') {
  const esp = Number(espesor_mm);
  const au = AU_BY_FAMILY[familia];
  if (!au) throw new Error(`Familia desconocida: ${familia}`);

  if (familia === 'ISODEC_EPS') {
    const precio = ISODEC_EPS_PRICES[esp];
    if (!precio) throw new Error(`ISODEC_EPS no tiene espesor ${esp}mm. Disponibles: ${Object.keys(ISODEC_EPS_PRICES).join(', ')}mm`);
    return { sku: `ISODEC_EPS_${esp}MM`, au_m: 1.12, precio_m2: precio, nombre: `ISODEC EPS ${esp}mm` };
  }

  const skuMap = PANEL_SKU[familia];
  if (!skuMap) throw new Error(`Familia ${familia} sin mapa de SKUs`);
  const sku = skuMap[esp];
  if (!sku) throw new Error(`${familia} no tiene espesor ${esp}mm. Disponibles: ${Object.keys(skuMap).join(', ')}mm`);

  const row = bySku[sku];
  if (!row) throw new Error(`SKU de panel no encontrado en catálogo: ${sku}`);

  return {
    sku,
    au_m: AU_BY_FAMILY[familia],
    precio_m2: extractPrice(row, lista_precios),
    nombre: row.name,
  };
}

/**
 * Returns accessory by SKU: sku, nombre, precio, largo_m, unidad
 */
function getAccessoryBySKU(sku, lista_precios = 'venta') {
  const row = bySku[sku];
  if (!row) throw new Error(`SKU accesorio no encontrado: ${sku}`);
  return {
    sku,
    nombre: row.name,
    precio: extractPrice(row, lista_precios),
    largo_m: parseFloat(row.length_m) || null,
    unidad: row.unit_base || 'unit',
  };
}

/**
 * Returns list of accessories filtered by family and/or category
 */
function getAccessoriesByFamily(family, category) {
  return rows
    .filter(r => {
      const matchFam = !family || r.family === family;
      const matchCat = !category || r.category === category;
      return matchFam && matchCat && r.sku && r.sale_excl_vat;
    })
    .map(r => ({ sku: r.sku.trim(), nombre: r.name, categoria: r.category }));
}

/** Returns available families with espesores */
function listFamilies() {
  return [
    { familia: 'ISOROOF_3G',   espesores: [30, 40, 50, 80, 100], composicion: 'PIR' },
    { familia: 'ISOROOF_FOIL', espesores: [30, 50],              composicion: 'PIR' },
    { familia: 'ISOROOF_PLUS', espesores: [50, 80],              composicion: 'PIR', nota: 'Mínimo 800m²' },
    { familia: 'ISODEC_PIR',   espesores: [50, 80],              composicion: 'PIR', nota: '50mm: EVITAR' },
    { familia: 'ISODEC_EPS',   espesores: [100, 150, 200, 250],  composicion: 'EPS' },
    { familia: 'ISOWALL_PIR',  espesores: [50, 80, 100],         composicion: 'PIR' },
    { familia: 'ISOFRIG_PIR',  espesores: [40, 60, 80, 100, 150], composicion: 'PIR' },
    { familia: 'ISOPANEL_EPS', espesores: [50, 100, 150, 200, 250], composicion: 'EPS' },
  ];
}

// ─── SKU resolvers used by engines ───────────────────────────────────────────

function resolveFromMap(map, familia, espesor_mm) {
  const familyMap = map[familia];
  if (!familyMap) return null;
  return familyMap[Number(espesor_mm)] || null;
}

function getGoteroFrontalSKU(familia, espesor_mm) { return resolveFromMap(GOTERO_FRONTAL_SKU, familia, espesor_mm); }
function getGoteroSuperiorSKU(familia, espesor_mm) { return resolveFromMap(GOTERO_SUPERIOR_SKU, familia, espesor_mm); }
function getGoteroLateralSKU(familia, espesor_mm)  { return resolveFromMap(GOTERO_LATERAL_SKU, familia, espesor_mm); }
function getCumbraSKU(familia)                      { return CUMBRERA_SKU[familia] || null; }
function getCaalonSKU(familia, espesor_mm)         { return resolveFromMap(CANALON_SKU, familia, espesor_mm); }
function getSoporteCaalonSKU(familia)              { return SOPORTE_CANALON_SKU[familia] || null; }
function getPerfilUSKU(familia, espesor_mm)        { return resolveFromMap(PERFIL_U_SKU, familia, espesor_mm); }

const ivaRate = () => 0.22;

module.exports = {
  getPanelByFamilyAndThickness,
  getAccessoryBySKU,
  getAccessoriesByFamily,
  listFamilies,
  getGoteroFrontalSKU,
  getGoteroSuperiorSKU,
  getGoteroLateralSKU,
  getCumbraSKU,
  getCaalonSKU,
  getSoporteCaalonSKU,
  getPerfilUSKU,
  ivaRate,
};
