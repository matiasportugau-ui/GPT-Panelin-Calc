'use strict';

const { getPanelInfo, getAccessoryInfo } = require('../data/catalog');

// Perfil U SKU by panel thickness (solera superior + inferior)
// Piece length = 3m
const PERFIL_U_SKU = {
  40:  'PU50MM',   // ISOFRIG 40mm
  50:  'PU50MM',   // closest available (no PU for 50mm wall panels)
  80:  'PU100MM',  // closest above 80mm
  100: 'PU100MM',
  150: 'PU150MM',
  200: 'PU200MM',
  250: 'PU250MM',
};

const PERFIL_U_LENGTH = 3.0; // each piece is 3m

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

/**
 * Calcula el BOM completo para una pared/fachada de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia          - e.g. 'ISOPANEL_EPS', 'ISOWALL_PIR'
 * @param {number} params.espesor_mm
 * @param {number} [params.ancho_m]        - Ancho total de la pared en metros (alternativo a cant_paneles)
 * @param {number} [params.cant_paneles]   - Cantidad de paneles (alternativo a ancho_m)
 * @param {number} params.largo_m          - Altura de la pared en metros
 * @param {number} [params.num_aberturas]  - Cantidad de aberturas (default 0)
 * @param {'metal'|'hormigon'|'mixto'} [params.estructura]
 * @param {'venta'|'web'} [params.lista_precios]
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcParedCompleto({
  familia, espesor_mm, ancho_m, cant_paneles, largo_m,
  num_aberturas = 0, estructura = 'metal', lista_precios = 'venta',
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

  const area_m2 = Math.round(cantP * au_m * largo_m * 100) / 100;
  const costo_paneles = Math.round(area_m2 * precio_m2 * 100) / 100;
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

  // 2. Perfil U — solera superior + inferior (2 × ancho_m, piezas de 3m)
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

  // 3. Tornillos TMOME (~5.5 per m² for metal/mixto structure)
  if (estructura === 'metal' || estructura === 'mixto') {
    const cantTornillos = Math.ceil(area_m2 * 5.5);
    subtotal += addItem(items, {
      sku: 'TMOME',
      descripcion: 'Tornillo TMOME (madera/metal)',
      cantidad: cantTornillos,
      unidad: 'und',
      lista_precios,
    });

    // 4. Arandelas ARATRAP (same qty as tornillos)
    subtotal += addItem(items, {
      sku: 'ARATRAP',
      descripcion: 'Arandela Trapezoidal ARATRAP',
      cantidad: cantTornillos,
      unidad: 'und',
      lista_precios,
    });
  }

  // 5. Remaches POP — RPOP (caja 1000u): 2 per panel for panel-to-panel union
  // Show in boxes: ceil(cant_remaches / 1000) cajas
  const cantRemaches = cantP * 2;
  const cantCajasRPOP = Math.max(1, Math.ceil(cantRemaches / 1000));
  subtotal += addItem(items, {
    sku: 'RPOP',
    descripcion: `Remaches POP RPOP (caja 1000u) — ${cantRemaches} remaches`,
    cantidad: cantCajasRPOP,
    unidad: 'caja',
    lista_precios,
  });

  // 6. Cinta butilo (1 roll per (cant_paneles-1)*largo_m / 22.5m)
  const cantButilo = Math.max(1, Math.ceil((cantP - 1) * largo_m / 22.5));
  subtotal += addItem(items, {
    sku: 'C.But.',
    descripcion: 'Cinta Butilo C.But. (22.5m)',
    cantidad: cantButilo,
    unidad: 'rollo',
    lista_precios,
  });

  // 7. Silicona Bromplast (1 cartucho per 15 m²)
  const cantSilicona = Math.ceil(area_m2 / 15);
  subtotal += addItem(items, {
    sku: 'Bromplast',
    descripcion: 'Silicona Bromplast (600ml)',
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
    area_m2,
    cant_paneles: cantP,
    num_aberturas,
    estructura,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = { calcParedCompleto };
