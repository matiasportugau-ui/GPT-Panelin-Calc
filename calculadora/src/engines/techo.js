'use strict';

const { getPanelDimensions, batchGetPrices, enrichRawItems } = require('../data/catalog');
const { getConfig } = require('../data/config_loader');

// Gotero SKU lookup tables by family and thickness
const ISOROOF_GOTERO = {
  frontal:  { 30: 'GFS30',   40: 'GFS30',   50: 'GFS50',   80: 'GFS80',   100: 'GFS80'   },
  superior: { 30: 'GFSUP30', 40: 'GFSUP40', 50: 'GFSUP50', 80: 'GFSUP80', 100: 'GFSUP80' },
  lateral:  { 30: 'GL30',    40: 'GL40',    50: 'GL50',    80: 'GL80',    100: 'GL80'    },
  canalon:  { 30: 'CD30',    40: 'CD30',    50: 'CD50',    80: 'CD80',    100: 'CD80'    },
  cumbrera:         'CUMROOF3M',
  soporte_canalon:  'SOPCAN3M',
  frontal_length:   3.03,
  superior_length:  3.03,
  lateral_length:   3.0,
  canalon_length:   3.03,
  soporte_length:   3.0,
};

const ISODEC_PIR_GOTERO = {
  frontal:  { 50: 'GF80DC',    80: 'GF120DC'   },
  superior: { 50: 'GSDECAM50', 80: 'GSDECAM80'  },
  lateral:  { 50: 'GL80DC',    80: 'GL120DC'    },
  canalon:  { 50: 'CAN.ISDC120' },
  cumbrera:         '6847',
  soporte_canalon:  '6805',
  frontal_length:   3.03,
  superior_length:  3.03,
  lateral_length:   3.0,
  canalon_length:   3.03,
  soporte_length:   3.0,
};

const ISODEC_EPS_GOTERO = {
  frontal:  { 100: '6838', 150: '6839', 200: '6840', 250: '6841' },
  superior: 'all:6828',  // babeta de adosar (same for all thicknesses)
  lateral:  { 100: '6842', 150: '6843', 200: '6844', 250: '6845' },
  canalon:  { 100: '6801', 150: '6802', 200: '6803', 250: '6804' },
  cumbrera:         '6847',
  soporte_canalon:  '6805',
  frontal_length:   3.03,
  superior_length:  3.0,  // babeta is 3m
  lateral_length:   3.0,
  canalon_length:   3.03,
  soporte_length:   3.0,
};

/**
 * Resolve gotero SKU data for a given family and thickness.
 * Returns null if family has no defined gotero system.
 */
function resolverGoteroData(familia, espesor_mm) {
  const esp = Number(espesor_mm);

  if (familia === 'ISOROOF_3G' || familia === 'ISOROOF_FOIL' || familia === 'ISOROOF_PLUS') {
    return {
      frontal_sku:          ISOROOF_GOTERO.frontal[esp]  || 'GFS80',
      superior_sku:         ISOROOF_GOTERO.superior[esp] || 'GFSUP80',
      lateral_sku:          ISOROOF_GOTERO.lateral[esp]  || 'GL80',
      canalon_sku:          ISOROOF_GOTERO.canalon[esp]  || 'CD80',
      cumbrera_sku:         ISOROOF_GOTERO.cumbrera,
      soporte_canalon_sku:  ISOROOF_GOTERO.soporte_canalon,
      frontal_length:       ISOROOF_GOTERO.frontal_length,
      superior_length:      ISOROOF_GOTERO.superior_length,
      lateral_length:       ISOROOF_GOTERO.lateral_length,
      canalon_length:       ISOROOF_GOTERO.canalon_length,
      soporte_length:       ISOROOF_GOTERO.soporte_length,
    };
  }

  if (familia === 'ISODEC_PIR') {
    return {
      frontal_sku:          ISODEC_PIR_GOTERO.frontal[esp]  || null,
      superior_sku:         ISODEC_PIR_GOTERO.superior[esp] || null,
      lateral_sku:          ISODEC_PIR_GOTERO.lateral[esp]  || null,
      canalon_sku:          ISODEC_PIR_GOTERO.canalon[esp]  || null,
      cumbrera_sku:         ISODEC_PIR_GOTERO.cumbrera,
      soporte_canalon_sku:  ISODEC_PIR_GOTERO.soporte_canalon,
      frontal_length:       ISODEC_PIR_GOTERO.frontal_length,
      superior_length:      ISODEC_PIR_GOTERO.superior_length,
      lateral_length:       ISODEC_PIR_GOTERO.lateral_length,
      canalon_length:       ISODEC_PIR_GOTERO.canalon_length,
      soporte_length:       ISODEC_PIR_GOTERO.soporte_length,
    };
  }

  if (familia === 'ISODEC_EPS') {
    return {
      frontal_sku:          ISODEC_EPS_GOTERO.frontal[esp]  || null,
      superior_sku:         '6828',  // babeta de adosar (universal)
      lateral_sku:          ISODEC_EPS_GOTERO.lateral[esp]  || null,
      canalon_sku:          ISODEC_EPS_GOTERO.canalon[esp]  || null,
      cumbrera_sku:         ISODEC_EPS_GOTERO.cumbrera,
      soporte_canalon_sku:  ISODEC_EPS_GOTERO.soporte_canalon,
      frontal_length:       ISODEC_EPS_GOTERO.frontal_length,
      superior_length:      ISODEC_EPS_GOTERO.superior_length,
      lateral_length:       ISODEC_EPS_GOTERO.lateral_length,
      canalon_length:       ISODEC_EPS_GOTERO.canalon_length,
      soporte_length:       ISODEC_EPS_GOTERO.soporte_length,
    };
  }

  return null; // ISOPANEL, ISOWALL, ISOFRIG: no defined gotero system
}

// Fastening system by panel family
const SIST_FIJACION_TECHO = {
  ISODEC_EPS:    'varilla_tuerca',
  ISODEC_PIR:    'varilla_tuerca',
  ISOROOF_3G:    'caballete_tornillo',
  ISOROOF_FOIL:  'caballete_tornillo',
  ISOROOF_PLUS:  'caballete_tornillo',
  ISOPANEL_EPS:  'tmome',
  ISOWALL_PIR:   'tmome',
  ISOFRIG_PIR:   'tmome',
};

/**
 * Push a raw (price-free) item to the collector array.
 * Skips items with null/invalid sku or non-positive quantity.
 * Phase 1 counterpart to the old addItem().
 */
function collectItem(rawItems, { sku, descripcion, cantidad, unidad }) {
  if (!sku || !Number.isFinite(cantidad) || cantidad <= 0) return;
  rawItems.push({ sku, descripcion, cantidad, unidad });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Pure quantity calculation. NO catalog price lookups.
// Reads: PANEL_DEFS (au_m, via getPanelDimensions) + logic_config (formula params)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate all BOM quantities for a techo section WITHOUT resolving prices.
 *
 * Returns raw items where:
 *   - Accessories: { sku, descripcion, cantidad, unidad }
 *   - Panel:       { sku, descripcion, cantidad, unidad, _area, _auM, _largoM }
 *     (_area/_auM/_largoM are used by enrichRawItems() for m²-based panel pricing)
 *
 * @param {Object} params  — same signature as calcTechoCompleto()
 * @returns {{ tipo, familia, espesor_mm, ancho_m, largo_m, area_m2,
 *             cant_paneles, sist_fijacion, rawItems: Object[] }}
 */
function calcCantidadesTecho({
  familia, espesor_mm, ancho_m, cant_paneles, largo_m,
  apoyos = 0, estructura = 'metal',
  tiene_cumbrera = false, tiene_canalon = false,
  tipo_gotero_frontal = 'liso',
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

  const areaRaw = cantP * au_m * largo_m;
  const area_m2 = Math.round(areaRaw * 100) / 100;

  const rawItems = [];

  // 1. Panel — stored with _area/_auM/_largoM for area-based pricing in Phase 2
  rawItems.push({
    sku:         panelSku,
    descripcion: panelName || `Panel ${familia} ${espesor_mm}mm`,
    cantidad:    cantP,
    unidad:      'panel',
    _area:       areaRaw,   // subtotal = _area × precio_m2
    _auM:        au_m,      // precio_unit = precio_m2 × _auM × _largoM
    _largoM:     largo_m,
  });

  // 2–7. Gotero system (only for families that have one)
  const gotero = resolverGoteroData(familia, espesor_mm);

  if (gotero) {
    let frontalSku = gotero.frontal_sku;
    if (tipo_gotero_frontal === 'greca' &&
        (familia === 'ISOROOF_3G' || familia === 'ISOROOF_FOIL' || familia === 'ISOROOF_PLUS')) {
      frontalSku = 'GFCGR30';
    }
    collectItem(rawItems, {
      sku:         frontalSku,
      descripcion: `Gotero Frontal ${tipo_gotero_frontal === 'greca' ? 'Greca' : ''} (${familia} ${espesor_mm}mm)`.trim(),
      cantidad:    Math.ceil(anchoEfectivo / gotero.frontal_length),
      unidad:      'pieza',
    });

    collectItem(rawItems, {
      sku:         gotero.superior_sku,
      descripcion: `Gotero Superior / Babeta (${familia} ${espesor_mm}mm)`,
      cantidad:    Math.ceil(anchoEfectivo / gotero.superior_length),
      unidad:      'pieza',
    });

    collectItem(rawItems, {
      sku:         gotero.lateral_sku,
      descripcion: `Gotero Lateral × 2 (${familia} ${espesor_mm}mm)`,
      cantidad:    Math.ceil(largo_m / gotero.lateral_length) * 2,
      unidad:      'pieza',
    });

    if (tiene_cumbrera) {
      collectItem(rawItems, {
        sku:         gotero.cumbrera_sku,
        descripcion: `Cumbrera (${familia})`,
        cantidad:    Math.ceil(anchoEfectivo / 3.0),
        unidad:      'pieza',
      });
    }

    if (tiene_canalon && gotero.canalon_sku) {
      collectItem(rawItems, {
        sku:         gotero.canalon_sku,
        descripcion: `Canalón (${familia} ${espesor_mm}mm)`,
        cantidad:    Math.ceil(anchoEfectivo / gotero.canalon_length),
        unidad:      'pieza',
      });
      collectItem(rawItems, {
        sku:         gotero.soporte_canalon_sku,
        descripcion: 'Soporte Canalón',
        cantidad:    Math.ceil(anchoEfectivo / 1.5),
        unidad:      'pieza',
      });
    }
  }

  // 8–12. Fijaciones — one of three exclusive branches
  const sist = SIST_FIJACION_TECHO[familia] || 'tmome';
  const fp   = getConfig().formula_params.techo;

  if (sist === 'varilla_tuerca') {
    const apoyosReales = apoyos > 0 ? apoyos : fp.varilla_tuerca.apoyos_minimos_default;
    const ptosFij      = Math.ceil(
      (cantP * apoyosReales * fp.varilla_tuerca.laterales_por_punto) +
      (largo_m * 2 / fp.varilla_tuerca.intervalo_largo_m)
    );
    const cantVarillas = Math.ceil(ptosFij * fp.varilla_tuerca.varillas_por_punto);

    collectItem(rawItems, { sku: 'VARILLA38', descripcion: 'Varilla roscada 3/8"',       cantidad: cantVarillas,     unidad: 'unid' });
    collectItem(rawItems, { sku: 'TUERCA38',  descripcion: 'Tuerca 3/8" galv.',           cantidad: cantVarillas * 2, unidad: 'unid' });
    collectItem(rawItems, { sku: 'ARCA38',    descripcion: 'Arandela carrocero 3/8"',     cantidad: cantVarillas * 2, unidad: 'unid' });
    collectItem(rawItems, { sku: 'ARAPP',     descripcion: 'Tortuga PVC (arandela PP)',   cantidad: cantVarillas * 2, unidad: 'unid' });
    if (estructura === 'hormigon') {
      collectItem(rawItems, { sku: 'TACEXP38', descripcion: 'Taco expansivo 3/8"', cantidad: ptosFij, unidad: 'unid' });
    }

  } else if (sist === 'caballete_tornillo') {
    const cantCaballetes = Math.ceil(
      (cantP * fp.caballete.tramos_por_panel * (largo_m / fp.caballete.paso_apoyo_m + 1)) +
      (largo_m * 2 / fp.caballete.intervalo_perimetro_m)
    );
    const cajasAgujas = Math.ceil(cantCaballetes * 2 / 100);

    collectItem(rawItems, { sku: 'CABALLETE',  descripcion: 'Caballete (arandela trapezoidal)', cantidad: cantCaballetes, unidad: 'unid' });
    collectItem(rawItems, { sku: 'TORN_AGUJA', descripcion: 'Tornillo aguja 5" (caja ×100)',    cantidad: cajasAgujas,    unidad: 'caja' });

  } else {
    // tmome (default)
    const cantTornillos = Math.ceil(areaRaw * fp.tornillos_por_m2_tmome);
    collectItem(rawItems, { sku: 'TMOME',   descripcion: 'Tornillo TMOME (madera/metal)',  cantidad: cantTornillos, unidad: 'und' });
    collectItem(rawItems, { sku: 'ARATRAP', descripcion: 'Arandela Trapezoidal ARATRAP',   cantidad: cantTornillos, unidad: 'und' });
  }

  // 13–14. Selladores — always present
  collectItem(rawItems, {
    sku:         'C.But.',
    descripcion: `Cinta Butilo C.But. (${fp.butilo_ml_por_rollo_m}m)`,
    cantidad:    Math.max(1, Math.ceil((cantP - 1) * largo_m / fp.butilo_ml_por_rollo_m)),
    unidad:      'rollo',
  });
  collectItem(rawItems, {
    sku:         'Bromplast',
    descripcion: 'Silicona Bromplast (600ml)',
    cantidad:    Math.ceil(cantP * fp.silicona_cartuchos_por_panel),
    unidad:      'cartucho',
  });

  return {
    tipo:          'techo',
    familia,
    espesor_mm,
    ancho_m:       anchoEfectivo,
    largo_m,
    area_m2,
    cant_paneles:  cantP,
    sist_fijacion: sist,
    rawItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 wrapper — backward-compatible public API.
// Internally calls calcCantidadesTecho + batchGetPrices + enrichRawItems.
// External callers (tests, API) continue to use this function unchanged.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el BOM completo para un techo de paneles Panelin.
 * Retains the original public interface. Internally uses two-phase calculation.
 *
 * @param {Object} params  — same params as before
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcTechoCompleto(params) {
  const { lista_precios = 'venta' } = params;

  // Phase 1: pure quantities (no catalog price access)
  const raw = calcCantidadesTecho(params);

  // Phase 2: resolve all prices in one batch, then enrich
  const priceMap = batchGetPrices(raw.rawItems.map(i => i.sku), lista_precios);
  const { items, subtotal } = enrichRawItems(raw.rawItems, priceMap);

  const { rawItems: _, ...meta } = raw;
  return { ...meta, items, subtotal };
}

module.exports = { calcTechoCompleto, calcCantidadesTecho };
