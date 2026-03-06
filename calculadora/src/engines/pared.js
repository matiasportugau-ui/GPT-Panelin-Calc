'use strict';

const {
  getPanelByFamilyAndThickness,
  getAccessoryBySKU,
  getPerfilUSKU,
} = require('../data/catalog');

const CINTA_BUTILO_ML = 22.5;

function addItem(items, warnings, sku, cantidad, lista_precios, descripcion_fallback) {
  try {
    const acc = getAccessoryBySKU(sku, lista_precios);
    const precio_unit = Math.round(acc.precio * 100) / 100;
    const sub = Math.round(cantidad * precio_unit * 100) / 100;
    items.push({ sku, descripcion: acc.nombre, cantidad, unidad: 'unidad', precio_unit, subtotal: sub });
    return sub;
  } catch (e) {
    warnings.push('Accesorio no encontrado: ' + (descripcion_fallback || sku));
    return 0;
  }
}

/**
 * Calcula el BOM completo para una pared de paneles Panelin.
 *
 * @param {Object} params
 * @param {string}  params.familia
 * @param {number}  params.espesor_mm
 * @param {number}  [params.ancho_m]        - Ancho total en metros (alternativo a cant_paneles)
 * @param {number}  [params.cant_paneles]   - Cantidad de paneles (alternativo a ancho_m)
 * @param {number}  params.largo_m          - Altura de la pared en metros
 * @param {number}  [params.num_aberturas]
 * @param {'metal'|'hormigon'|'mixto'} [params.estructura]
 * @param {'venta'|'web'} [params.lista_precios]
 * @returns {Object} BOM con items (SKUs reales), subtotal
 */
function calcParedCompleto({
  familia,
  espesor_mm,
  ancho_m,
  cant_paneles,
  largo_m,
  num_aberturas = 0,
  estructura = 'metal',
  lista_precios = 'venta',
}) {
  const panelInfo = getPanelByFamilyAndThickness(familia, espesor_mm, lista_precios);
  const { sku: skuPanel, au_m, precio_m2, nombre: nombrePanel } = panelInfo;

  let cantP, anchoReal;
  if (cant_paneles != null && Number(cant_paneles) > 0) {
    cantP = Math.ceil(Number(cant_paneles));
    anchoReal = cantP * au_m;
  } else {
    cantP = Math.ceil(Number(ancho_m) / au_m);
    anchoReal = cantP * au_m;
  }

  const area_m2 = cantP * au_m * largo_m;
  const items = [];
  const warnings = [];
  let subtotal = 0;

  // Paneles
  const precioPanel = Math.round(precio_m2 * au_m * largo_m * 100) / 100;
  const costoPanel  = Math.round(cantP * precioPanel * 100) / 100;
  items.push({ sku: skuPanel, descripcion: nombrePanel, cantidad: cantP, unidad: 'panel', precio_unit: precioPanel, subtotal: costoPanel });
  subtotal += costoPanel;

  // Perfil U (solera superior + inferior): 2 × ceil(anchoReal / 3) piezas de 3m
  const skuPU = getPerfilUSKU(familia, espesor_mm);
  if (skuPU) {
    const cantPU = 2 * Math.ceil(anchoReal / 3);
    subtotal += addItem(items, warnings, skuPU, cantPU, lista_precios, 'Perfil U solera sup/inf');
  } else {
    warnings.push('No hay Perfil U definido en catálogo para ' + familia + ' ' + espesor_mm + 'mm');
  }

  // Fijaciones según estructura
  if (estructura === 'metal' || estructura === 'mixto') {
    const cantFij = Math.ceil(area_m2 * 5.5);
    subtotal += addItem(items, warnings, 'TMOME', cantFij, lista_precios, 'Tornillo madera/metal');
    subtotal += addItem(items, warnings, 'ARATRAP', cantFij, lista_precios, 'Arandela Trapezoidal');
  } else if (estructura === 'hormigon') {
    // Sistema Varilla Roscada para paredes sobre hormigón
    const varillas = Math.max(3, cantP + 1);
    subtotal += addItem(items, warnings, 'VR1M38', varillas, lista_precios, 'Varilla Roscada BSW 1m 3/8"');
    subtotal += addItem(items, warnings, 'TUE38G', varillas * 8, lista_precios, 'Tuerca Galvanizada BSW 3/8"');
    subtotal += addItem(items, warnings, 'ARD38C', varillas * 4, lista_precios, 'Arandela Carrocero Galv. 3/8"');
    subtotal += addItem(items, warnings, 'ARD38P', varillas * 4, lista_precios, 'Arandela Plana Galv. 3/8"');
    subtotal += addItem(items, warnings, 'ARD38PP', varillas * 4, lista_precios, 'Arandela Blanca Polipropileno 3/8"');
    subtotal += addItem(items, warnings, 'TACOEXP', cantP * 4, lista_precios, 'Taco Expansivo P. Hormigón 3/8"');
  }

  // Remaches POP: 2 por panel (unión entre paneles)
  // RPOP: caja 1000u — se vende por caja
  const cantRemaches = cantP * 2;
  const cajasRemaches = Math.ceil(cantRemaches / 1000);
  if (cajasRemaches > 0) {
    subtotal += addItem(items, warnings, 'RPOP', cajasRemaches, lista_precios, 'Remaches POP (caja 1000u)');
  }

  // Sellado: cinta butilo entre paneles
  const cantButilo = Math.ceil((cantP - 1) * largo_m / CINTA_BUTILO_ML);
  if (cantButilo > 0) {
    subtotal += addItem(items, warnings, 'C.But.', cantButilo, lista_precios, 'Cinta Butilo');
  }
  // Silicona: 1 cada 10m²
  subtotal += addItem(items, warnings, 'Bromplast', Math.ceil(area_m2 / 10), lista_precios, 'Silicona Neutra Bromplast');

  return {
    tipo: 'pared',
    familia,
    espesor_mm,
    ancho_m: Math.round(anchoReal * 100) / 100,
    largo_m,
    area_m2: Math.round(area_m2 * 100) / 100,
    cant_paneles: cantP,
    num_aberturas,
    estructura,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    warnings,
  };
}

module.exports = { calcParedCompleto };
