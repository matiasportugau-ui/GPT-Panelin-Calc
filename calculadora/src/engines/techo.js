'use strict';

const { getPanelInfo, getAccessoryInfo } = require('../data/catalog');
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

/**
 * Add an accessory item to the BOM list. Skips if sku is null, cantidad is not finite, or cantidad <= 0.
 * @returns {number} subtotal added
 */
function addItem(items, { sku, descripcion, cantidad, unidad, lista_precios }) {
  if (!sku || !Number.isFinite(cantidad) || cantidad <= 0) return 0;
  const acc = getAccessoryInfo(sku, lista_precios);
  const precio_unit = acc.precio;
  const subtotal = Math.round(cantidad * precio_unit * 100) / 100;
  items.push({ sku, descripcion, cantidad, unidad, precio_unit, subtotal });
  return subtotal;
}

// Fastening system by panel family
// varilla_tuerca: structural bolt system (ISODEC heavy panels)
// caballete_tornillo: saddle bracket + needle screw (ISOROOF light panels)
// tmome: TMOME screw + ARATRAP washer (default / other families)
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
 * Calcula el BOM completo para un techo de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia           - e.g. 'ISODEC_EPS', 'ISOROOF_3G'
 * @param {number} params.espesor_mm        - Espesor en mm
 * @param {number} [params.ancho_m]         - Ancho del techo en metros (alternativo a cant_paneles)
 * @param {number} [params.cant_paneles]    - Cantidad de paneles (alternativo a ancho_m)
 * @param {number} params.largo_m           - Largo del techo en metros
 * @param {number} [params.apoyos]          - Apoyos intermedios (default 0)
 * @param {'metal'|'hormigon'|'mixto'} [params.estructura]
 * @param {'venta'|'web'} [params.lista_precios]
 * @param {boolean} [params.tiene_cumbrera] - Incluir cumbrera (default false)
 * @param {boolean} [params.tiene_canalon]  - Incluir canalón (default false)
 * @param {'liso'|'greca'} [params.tipo_gotero_frontal] - Tipo gotero frontal para ISOROOF (default 'liso')
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcTechoCompleto({
  familia, espesor_mm, ancho_m, cant_paneles, largo_m,
  apoyos = 0, estructura = 'metal', lista_precios = 'venta',
  tiene_cumbrera = false, tiene_canalon = false,
  tipo_gotero_frontal = 'liso',
}) {
  const panelInfo = getPanelInfo(familia, espesor_mm, lista_precios);
  const { sku: panelSku, name: panelName, precio_m2, au_m } = panelInfo;

  // Resolve panel count and effective width
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
  const costo_paneles = Math.round(areaRaw * precio_m2 * 100) / 100;
  const precio_unit_panel = Math.round(precio_m2 * au_m * largo_m * 100) / 100;

  const items = [];
  let subtotal = costo_paneles;

  // 1. Panels
  items.push({
    sku: panelSku,
    descripcion: panelName || `Panel ${familia} ${espesor_mm}mm`,
    cantidad: cantP,
    unidad: 'panel',
    precio_unit: precio_unit_panel,
    subtotal: costo_paneles,
  });

  const gotero = resolverGoteroData(familia, espesor_mm);

  if (gotero) {
    // 2. Gotero frontal (borde inferior — donde cae el agua)
    // Para ISOROOF: puede ser liso o greca según tipo_gotero_frontal
    let frontalSku = gotero.frontal_sku;
    if (tipo_gotero_frontal === 'greca' &&
        (familia === 'ISOROOF_3G' || familia === 'ISOROOF_FOIL' || familia === 'ISOROOF_PLUS')) {
      frontalSku = 'GFCGR30'; // gotero frontal greca universal para ISOROOF
    }
    const cantFrontal = Math.ceil(anchoEfectivo / gotero.frontal_length);
    subtotal += addItem(items, {
      sku: frontalSku,
      descripcion: `Gotero Frontal ${tipo_gotero_frontal === 'greca' ? 'Greca' : ''} (${familia} ${espesor_mm}mm)`.trim(),
      cantidad: cantFrontal,
      unidad: 'pieza',
      lista_precios,
    });

    // 3. Gotero superior (borde contra muro/cumbrera)
    const cantSuperior = Math.ceil(anchoEfectivo / gotero.superior_length);
    subtotal += addItem(items, {
      sku: gotero.superior_sku,
      descripcion: `Gotero Superior / Babeta (${familia} ${espesor_mm}mm)`,
      cantidad: cantSuperior,
      unidad: 'pieza',
      lista_precios,
    });

    // 4. Goteros laterales (izquierdo + derecho)
    const cantLateral = Math.ceil(largo_m / gotero.lateral_length) * 2;
    subtotal += addItem(items, {
      sku: gotero.lateral_sku,
      descripcion: `Gotero Lateral × 2 (${familia} ${espesor_mm}mm)`,
      cantidad: cantLateral,
      unidad: 'pieza',
      lista_precios,
    });

    // 5. Cumbrera (optional, 2 aguas)
    if (tiene_cumbrera) {
      const cantCumbrera = Math.ceil(anchoEfectivo / 3.0);
      subtotal += addItem(items, {
        sku: gotero.cumbrera_sku,
        descripcion: `Cumbrera (${familia})`,
        cantidad: cantCumbrera,
        unidad: 'pieza',
        lista_precios,
      });
    }

    // 6. Canalón (optional)
    if (tiene_canalon && gotero.canalon_sku) {
      const cantCanalon = Math.ceil(anchoEfectivo / gotero.canalon_length);
      subtotal += addItem(items, {
        sku: gotero.canalon_sku,
        descripcion: `Canalón (${familia} ${espesor_mm}mm)`,
        cantidad: cantCanalon,
        unidad: 'pieza',
        lista_precios,
      });

      // 7. Soporte canalón (1 each 1.5m of canalón width)
      const cantSoporte = Math.ceil(anchoEfectivo / 1.5);
      subtotal += addItem(items, {
        sku: gotero.soporte_canalon_sku,
        descripcion: 'Soporte Canalón',
        cantidad: cantSoporte,
        unidad: 'pieza',
        lista_precios,
      });
    }
  }

  // ── Fijaciones según sistema de fijación de la familia ──────────────────
  const sist = SIST_FIJACION_TECHO[familia] || 'tmome';

  const fp = getConfig().formula_params.techo;

  if (sist === 'varilla_tuerca') {
    // ptos = (paneles × apoyos × laterales) + (largo × 2 / intervalo_largo)
    const apoyosReales = apoyos > 0 ? apoyos : fp.varilla_tuerca.apoyos_minimos_default;
    const ptosFij = Math.ceil((cantP * apoyosReales * fp.varilla_tuerca.laterales_por_punto) + (largo_m * 2 / fp.varilla_tuerca.intervalo_largo_m));
    const cantVarillas = Math.ceil(ptosFij * fp.varilla_tuerca.varillas_por_punto);
    const cantTuercas  = cantVarillas * 2;
    const cantArcCarr  = cantVarillas * 2;
    const cantArPP     = cantVarillas * 2;

    subtotal += addItem(items, { sku: 'VARILLA38',  descripcion: 'Varilla roscada 3/8"',          cantidad: cantVarillas, unidad: 'unid', lista_precios });
    subtotal += addItem(items, { sku: 'TUERCA38',   descripcion: 'Tuerca 3/8" galv.',              cantidad: cantTuercas,  unidad: 'unid', lista_precios });
    subtotal += addItem(items, { sku: 'ARCA38',     descripcion: 'Arandela carrocero 3/8"',        cantidad: cantArcCarr,  unidad: 'unid', lista_precios });
    subtotal += addItem(items, { sku: 'ARAPP',      descripcion: 'Tortuga PVC (arandela PP)',       cantidad: cantArPP,     unidad: 'unid', lista_precios });
    if (estructura === 'hormigon') {
      subtotal += addItem(items, { sku: 'TACEXP38', descripcion: 'Taco expansivo 3/8"',             cantidad: ptosFij,      unidad: 'unid', lista_precios });
    }

  } else if (sist === 'caballete_tornillo') {
    // caballetes = ceil(paneles × tramos × (largo/paso + 1) + (largo × 2 / intervalo_perim))
    const cantCaballetes = Math.ceil(
      (cantP * fp.caballete.tramos_por_panel * (largo_m / fp.caballete.paso_apoyo_m + 1)) +
      (largo_m * 2 / fp.caballete.intervalo_perimetro_m)
    );
    const cajasAgujas = Math.ceil(cantCaballetes * 2 / 100);

    subtotal += addItem(items, { sku: 'CABALLETE',  descripcion: 'Caballete (arandela trapezoidal)', cantidad: cantCaballetes, unidad: 'unid', lista_precios });
    subtotal += addItem(items, { sku: 'TORN_AGUJA', descripcion: 'Tornillo aguja 5" (caja ×100)',    cantidad: cajasAgujas,    unidad: 'caja', lista_precios });

  } else {
    const cantTornillos = Math.ceil(areaRaw * fp.tornillos_por_m2_tmome);
    subtotal += addItem(items, { sku: 'TMOME',   descripcion: 'Tornillo TMOME (madera/metal)',    cantidad: cantTornillos, unidad: 'und', lista_precios });
    subtotal += addItem(items, { sku: 'ARATRAP', descripcion: 'Arandela Trapezoidal ARATRAP',     cantidad: cantTornillos, unidad: 'und', lista_precios });
  }

  // ── Selladores ───────────────────────────────────────────────────────────
  const cantButilo = Math.max(1, Math.ceil((cantP - 1) * largo_m / fp.butilo_ml_por_rollo_m));
  subtotal += addItem(items, {
    sku: 'C.But.',
    descripcion: `Cinta Butilo C.But. (${fp.butilo_ml_por_rollo_m}m)`,
    cantidad: cantButilo,
    unidad: 'rollo',
    lista_precios,
  });

  const cantSilicona = Math.ceil(cantP * fp.silicona_cartuchos_por_panel);
  subtotal += addItem(items, {
    sku: 'Bromplast',
    descripcion: 'Silicona Bromplast (600ml)',
    cantidad: cantSilicona,
    unidad: 'cartucho',
    lista_precios,
  });

  return {
    tipo: 'techo',
    familia,
    espesor_mm,
    ancho_m: anchoEfectivo,
    largo_m,
    area_m2,
    cant_paneles: cantP,
    sist_fijacion: sist,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = { calcTechoCompleto };
