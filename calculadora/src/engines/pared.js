'use strict';

const { getPanelInfo, getAccessoryInfo } = require('../data/catalog');

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
 * Add an accessory item to the BOM list.
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

/**
 * Calcula el BOM completo para una pared/fachada de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia           - e.g. 'ISOPANEL_EPS', 'ISOWALL_PIR'
 * @param {number} params.espesor_mm
 * @param {number} [params.ancho_m]         - Ancho total de la pared en metros (alternativo a cant_paneles)
 * @param {number} [params.cant_paneles]    - Cantidad de paneles (alternativo a ancho_m)
 * @param {number} params.largo_m           - Altura de la pared en metros
 * @param {Array}  [params.aberturas]       - [{ancho, alto, cant}] — descuenta área real del coste de paneles
 * @param {number} [params.num_aberturas]   - Compat. legacy: cantidad de aberturas (sin descuento de área)
 * @param {number} [params.num_esq_ext]     - Esquineros exteriores (default 0)
 * @param {number} [params.num_esq_int]     - Esquineros interiores (default 0)
 * @param {boolean} [params.incl_k2]        - Incluir perfil K2 entre paneles (default true)
 * @param {boolean} [params.incl_5852]      - Incluir ángulo aluminio 5852 (default false)
 * @param {'metal'|'hormigon'|'mixto'} [params.estructura]
 * @param {'venta'|'web'} [params.lista_precios]
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcParedCompleto({
  familia, espesor_mm, ancho_m, cant_paneles, largo_m,
  aberturas = [], num_aberturas = 0,
  num_esq_ext = 0, num_esq_int = 0,
  incl_k2 = true, incl_5852 = false,
  estructura = 'metal', lista_precios = 'venta',
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

  // ── Área de paneles ──────────────────────────────────────────────────────
  const areaBruta = Math.round(cantP * au_m * largo_m * 100) / 100;

  // Descuento de aberturas con dimensiones reales
  let areaAberturas = 0;
  if (Array.isArray(aberturas) && aberturas.length > 0) {
    for (const ab of aberturas) {
      const ancho = Number(ab.ancho || 0);
      const alto = Number(ab.alto || 0);
      const cant = Number(ab.cant || 1);
      if (ancho > 0 && alto > 0) areaAberturas += ancho * alto * cant;
    }
  }
  areaAberturas = Math.round(areaAberturas * 100) / 100;
  const areaNeta = Math.round(Math.max(areaBruta - areaAberturas, 0) * 100) / 100;

  const costo_paneles = Math.round(areaNeta * precio_m2 * 100) / 100;
  const precio_unit_panel = Math.round(precio_m2 * au_m * largo_m * 100) / 100;

  const items = [];
  let subtotal = costo_paneles;

  // 1. Paneles
  items.push({
    sku: panelSku,
    descripcion: panelName || `Panel ${familia} ${espesor_mm}mm`,
    cantidad: cantP,
    unidad: 'panel',
    precio_unit: precio_unit_panel,
    subtotal: costo_paneles,
    area_bruta_m2: areaBruta,
    area_aberturas_m2: areaAberturas,
    area_neta_m2: areaNeta,
  });

  // 2. Perfil U — solera superior + inferior (2 × anchoEfectivo, piezas de 3m)
  const puSku = PERFIL_U_SKU[Number(espesor_mm)];
  if (puSku) {
    const mlPerfilU = 2 * anchoEfectivo;
    const cantPU = Math.ceil(mlPerfilU / PERFIL_U_LENGTH);
    subtotal += addItem(items, {
      sku: puSku,
      descripcion: `Perfil U ${espesor_mm}mm (soleras sup+inf)`,
      cantidad: cantPU,
      unidad: 'pieza',
      lista_precios,
    });
  }

  // 3. Perfil K2 — juntas verticales entre paneles (cantP-1 juntas × altura)
  if (incl_k2 && cantP > 1) {
    const juntasK2 = (cantP - 1) * Math.ceil(largo_m / 3.0);
    subtotal += addItem(items, {
      sku: 'K2',
      descripcion: `Perfil K2 junta interior (${cantP - 1} juntas)`,
      cantidad: juntasK2,
      unidad: 'pieza',
      lista_precios,
    });
  }

  // 4. Esquineros exteriores
  if (num_esq_ext > 0) {
    const cantEsqExt = num_esq_ext * Math.ceil(largo_m / 3.0);
    subtotal += addItem(items, {
      sku: 'ESQ-EXT',
      descripcion: `Esquinero exterior (${num_esq_ext} esq.)`,
      cantidad: cantEsqExt,
      unidad: 'pieza',
      lista_precios,
    });
  }

  // 5. Esquineros interiores
  if (num_esq_int > 0) {
    const cantEsqInt = num_esq_int * Math.ceil(largo_m / 3.0);
    subtotal += addItem(items, {
      sku: 'ESQ-INT',
      descripcion: `Esquinero interior (${num_esq_int} esq.)`,
      cantidad: cantEsqInt,
      unidad: 'pieza',
      lista_precios,
    });
  }

  // 6. Ángulo aluminio 5852 (opcional)
  if (incl_5852) {
    const cant5852 = Math.ceil(anchoEfectivo / 6.8);
    subtotal += addItem(items, {
      sku: 'PLECHU98',
      descripcion: 'Ángulo aluminio 5852 (6.8m)',
      cantidad: cant5852,
      unidad: 'pieza',
      lista_precios,
    });
  }

  // ── Fijaciones ───────────────────────────────────────────────────────────
  // Tornillos T2 + anclaje H° para todas las estructuras (pared siempre requiere anclaje)
  if (estructura === 'metal' || estructura === 'mixto') {
    // Tornillos TMOME (~5.5 per m² sobre área neta)
    const cantTornillos = Math.ceil(areaNeta * 5.5);
    subtotal += addItem(items, {
      sku: 'TMOME',
      descripcion: 'Tornillo TMOME (madera/metal)',
      cantidad: cantTornillos,
      unidad: 'und',
      lista_precios,
    });

    subtotal += addItem(items, {
      sku: 'ARATRAP',
      descripcion: 'Arandela Trapezoidal ARATRAP',
      cantidad: cantTornillos,
      unidad: 'und',
      lista_precios,
    });
  }

  // Anclajes H° — 1 cada 0.30m lineal de ancho efectivo (siempre, independiente de estructura)
  const cantAnclajes = Math.ceil(anchoEfectivo / 0.30);
  subtotal += addItem(items, {
    sku: 'ANCLAJE_H',
    descripcion: 'Kit anclaje H° (1 c/30cm)',
    cantidad: cantAnclajes,
    unidad: 'unid',
    lista_precios,
  });

  // Remaches POP — 2 por panel para unión panel-a-panel
  const cantRemaches = cantP * 2;
  const cantCajasRPOP = Math.max(1, Math.ceil(cantRemaches / 1000));
  subtotal += addItem(items, {
    sku: 'RPOP',
    descripcion: `Remaches POP RPOP (caja 1000u) — ${cantRemaches} remaches`,
    cantidad: cantCajasRPOP,
    unidad: 'caja',
    lista_precios,
  });

  // ── Selladores ───────────────────────────────────────────────────────────
  // Cinta butilo entre juntas longitudinales
  const cantButilo = Math.max(1, Math.ceil((cantP - 1) * largo_m / 22.5));
  subtotal += addItem(items, {
    sku: 'C.But.',
    descripcion: 'Cinta Butilo C.But. (22.5m)',
    cantidad: cantButilo,
    unidad: 'rollo',
    lista_precios,
  });

  // Silicona por ML de juntas (más preciso que por m²)
  // Juntas verticales = (cantP-1) × alto
  // Perímetro superior + inferior = anchoEfectivo × 2
  const mlJuntas = Math.round(((cantP - 1) * largo_m + anchoEfectivo * 2) * 100) / 100;
  const cantSilicona = Math.ceil(mlJuntas / 8); // 1 cartucho cubre ~8 ml de junta
  subtotal += addItem(items, {
    sku: 'Bromplast',
    descripcion: `Silicona Bromplast (600ml) — ${mlJuntas}ml de juntas`,
    cantidad: cantSilicona,
    unidad: 'cartucho',
    lista_precios,
  });

  return {
    tipo: 'pared',
    familia,
    espesor_mm,
    ancho_m: anchoEfectivo,
    largo_m,
    area_bruta_m2: areaBruta,
    area_aberturas_m2: areaAberturas,
    area_neta_m2: areaNeta,
    cant_paneles: cantP,
    aberturas: aberturas.length > 0 ? aberturas : (num_aberturas > 0 ? [{ cant: num_aberturas, nota: 'legacy_count' }] : []),
    num_esq_ext,
    num_esq_int,
    estructura,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = { calcParedCompleto };
