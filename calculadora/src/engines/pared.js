'use strict';

const { getPanelDimensions, batchGetPrices, enrichRawItems } = require('../data/catalog');
const { getConfig } = require('../data/config_loader');

// Perfil U SKU by panel thickness (solera superior + inferior), pieza = 3m
const PERFIL_U_SKU = {
  40:  'PU50MM',
  50:  'PU50MM',
  60:  'PU50MM',
  80:  'PU100MM',
  100: 'PU100MM',
  150: 'PU150MM',
  200: 'PU200MM',
  250: 'PU250MM',
};

// Perfil G2 (alternativo al U para ISOPANEL_EPS ≥ 100mm)
const PERFIL_G2_SKU = {
  100: 'G2-100',
  150: 'G2-150',
  200: 'G2-200',
  250: 'G2-250',
};

const PERFIL_U_LENGTH = 3.0; // piezas de 3m

/**
 * Push a raw (price-free) item to the collector array.
 * Skips items with null/invalid sku or non-positive quantity.
 */
function collectItem(rawItems, { sku, descripcion, cantidad, unidad }) {
  if (!sku || !Number.isFinite(cantidad) || cantidad <= 0) return;
  rawItems.push({ sku, descripcion, cantidad, unidad });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Pure quantity calculation. NO catalog price lookups.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate all BOM quantities for a pared section WITHOUT resolving prices.
 *
 * @param {Object} params  — same signature as calcParedCompleto()
 * @returns {{ tipo, familia, espesor_mm, ancho_m, largo_m,
 *             area_bruta_m2, area_aberturas_m2, area_neta_m2,
 *             cant_paneles, rawItems: Object[] }}
 */
function calcCantidadesPared({
  familia, espesor_mm, ancho_m, cant_paneles, largo_m,
  aberturas = [], num_aberturas = 0,
  num_esq_ext = 0, num_esq_int = 0,
  incl_k2 = true, incl_5852 = false,
  estructura = 'metal',
}) {
  // getPanelDimensions reads only PANEL_DEFS — no CSV, no price
  const { sku: panelSku, name: panelName, au_m } = getPanelDimensions(familia, espesor_mm);

  let cantP, anchoEfectivo;
  if (cant_paneles != null) {
    cantP = Math.ceil(Number(cant_paneles));
    anchoEfectivo = cantP * au_m;
  } else {
    cantP = Math.ceil(ancho_m / au_m);
    anchoEfectivo = cantP * au_m;
  }

  // Area calculation
  const areaBruta = Math.round(cantP * au_m * largo_m * 100) / 100;

  let areaAberturas = 0;
  if (Array.isArray(aberturas) && aberturas.length > 0) {
    for (const ab of aberturas) {
      const ancho = Number(ab.ancho || 0);
      const alto  = Number(ab.alto  || 0);
      const cant  = Number(ab.cant  || 1);
      if (ancho > 0 && alto > 0) areaAberturas += ancho * alto * cant;
    }
  }
  areaAberturas = Math.round(areaAberturas * 100) / 100;
  const areaNeta = Math.round(Math.max(areaBruta - areaAberturas, 0) * 100) / 100;

  const fp = getConfig().formula_params.pared;
  const rawItems = [];

  // 1. Panel — stored with _area/_auM/_largoM for area-based pricing in Phase 2
  //    In pared: _area = areaNeta (net area after deductions), NOT areaBruta.
  rawItems.push({
    sku:         panelSku,
    descripcion: panelName || `Panel ${familia} ${espesor_mm}mm`,
    cantidad:    cantP,
    unidad:      'panel',
    _area:       areaNeta,   // subtotal = areaNeta × precio_m2
    _auM:        au_m,
    _largoM:     largo_m,
    // Extra pared-specific fields (preserved through enrichRawItems spread)
    area_bruta_m2:     areaBruta,
    area_aberturas_m2: areaAberturas,
    area_neta_m2:      areaNeta,
  });

  // 2. Perfil U — solera superior + inferior (2 × anchoEfectivo, piezas de 3m)
  const puSku = PERFIL_U_SKU[Number(espesor_mm)];
  if (puSku) {
    collectItem(rawItems, {
      sku:         puSku,
      descripcion: `Perfil U ${espesor_mm}mm (soleras sup+inf)`,
      cantidad:    Math.ceil(2 * anchoEfectivo / fp.perfil_u_largo_pieza_m),
      unidad:      'pieza',
    });
  }

  // 3. Perfil K2 — juntas verticales entre paneles (cantP-1 juntas × altura)
  if (incl_k2 && cantP > 1) {
    collectItem(rawItems, {
      sku:         'K2',
      descripcion: `Perfil K2 junta interior (${cantP - 1} juntas)`,
      cantidad:    (cantP - 1) * Math.ceil(largo_m / fp.k2_largo_pieza_m),
      unidad:      'pieza',
    });
  }

  // 4. Esquineros exteriores
  if (num_esq_ext > 0) {
    collectItem(rawItems, {
      sku:         'ESQ-EXT',
      descripcion: `Esquinero exterior (${num_esq_ext} esq.)`,
      cantidad:    num_esq_ext * Math.ceil(largo_m / fp.esq_largo_pieza_m),
      unidad:      'pieza',
    });
  }

  // 5. Esquineros interiores
  if (num_esq_int > 0) {
    collectItem(rawItems, {
      sku:         'ESQ-INT',
      descripcion: `Esquinero interior (${num_esq_int} esq.)`,
      cantidad:    num_esq_int * Math.ceil(largo_m / fp.esq_largo_pieza_m),
      unidad:      'pieza',
    });
  }

  // 6. Ángulo aluminio 5852 (opcional)
  if (incl_5852) {
    collectItem(rawItems, {
      sku:         'PLECHU98',
      descripcion: 'Ángulo aluminio 5852 (6.8m)',
      cantidad:    Math.ceil(anchoEfectivo / fp.angulo_5852_largo_pieza_m),
      unidad:      'pieza',
    });
  }

  // 7–8. Tornillos + arandelas (solo para estructuras metálicas)
  if (estructura === 'metal' || estructura === 'mixto') {
    const cantTornillos = Math.ceil(areaNeta * fp.tornillos_por_m2_tmome);
    collectItem(rawItems, { sku: 'TMOME',   descripcion: 'Tornillo TMOME (madera/metal)',  cantidad: cantTornillos, unidad: 'und' });
    collectItem(rawItems, { sku: 'ARATRAP', descripcion: 'Arandela Trapezoidal ARATRAP',   cantidad: cantTornillos, unidad: 'und' });
  }

  // 9. Anclaje H° — siempre presente (1 cada 30cm del ancho efectivo)
  collectItem(rawItems, {
    sku:         'ANCLAJE_H',
    descripcion: 'Kit anclaje H° (1 c/30cm)',
    cantidad:    Math.ceil(anchoEfectivo / fp.anclaje_intervalo_m),
    unidad:      'unid',
  });

  // 10. Remaches POP — siempre presente
  collectItem(rawItems, {
    sku:         'RPOP',
    descripcion: `Remaches POP RPOP (caja 1000u) — ${cantP * fp.remaches_por_panel} remaches`,
    cantidad:    Math.max(1, Math.ceil(cantP * fp.remaches_por_panel / fp.remaches_por_caja)),
    unidad:      'caja',
  });

  // 11. Cinta Butilo — siempre presente
  collectItem(rawItems, {
    sku:         'C.But.',
    descripcion: 'Cinta Butilo C.But. (22.5m)',
    cantidad:    Math.max(1, Math.ceil((cantP - 1) * largo_m / fp.butilo_ml_por_rollo_m)),
    unidad:      'rollo',
  });

  // 12. Silicona — por ML de juntas (más preciso que por m²)
  const mlJuntas    = Math.round(((cantP - 1) * largo_m + anchoEfectivo * 2) * 100) / 100;
  collectItem(rawItems, {
    sku:         'Bromplast',
    descripcion: `Silicona Bromplast (600ml) — ${mlJuntas}ml de juntas`,
    cantidad:    Math.ceil(mlJuntas / fp.silicona_ml_por_cartucho),
    unidad:      'cartucho',
  });

  return {
    tipo:               'pared',
    familia,
    espesor_mm,
    ancho_m:            anchoEfectivo,
    largo_m,
    area_bruta_m2:      areaBruta,
    area_aberturas_m2:  areaAberturas,
    area_neta_m2:       areaNeta,
    cant_paneles:       cantP,
    aberturas: aberturas.length > 0
      ? aberturas
      : (num_aberturas > 0 ? [{ cant: num_aberturas, nota: 'legacy_count' }] : []),
    num_esq_ext,
    num_esq_int,
    estructura,
    rawItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 wrapper — backward-compatible public API.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el BOM completo para una pared/fachada de paneles Panelin.
 * Retains the original public interface. Internally uses two-phase calculation.
 *
 * @param {Object} params  — same params as before
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcParedCompleto(params) {
  const { lista_precios = 'venta' } = params;

  // Phase 1: pure quantities (no catalog price access)
  const raw = calcCantidadesPared(params);

  // Phase 2: resolve all prices in one batch, then enrich
  const priceMap = batchGetPrices(raw.rawItems.map(i => i.sku), lista_precios);
  const { items, subtotal } = enrichRawItems(raw.rawItems, priceMap);

  const { rawItems: _, ...meta } = raw;
  return { ...meta, items, subtotal };
}

module.exports = { calcParedCompleto, calcCantidadesPared };
