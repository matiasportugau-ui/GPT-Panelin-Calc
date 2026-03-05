'use strict';

const {
  getPanelByFamilyAndThickness,
  getAccessoryBySKU,
  getGoteroFrontalSKU,
  getGoteroSuperiorSKU,
  getGoteroLateralSKU,
  getCumbraSKU,
  getCaalonSKU,
  getSoporteCaalonSKU,
} = require('../data/catalog');

const PIEZA_FRONTAL_M = 3.03;
const PIEZA_LATERAL_M = 3.00;
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

function calcTechoCompleto({
  familia,
  espesor_mm,
  ancho_m,
  cant_paneles,
  largo_m,
  apoyos = 0,
  lista_precios = 'venta',
  tiene_cumbrera = false,
  tiene_canalon = false,
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

  // Gotero Frontal Inferior
  const skuGF = getGoteroFrontalSKU(familia, espesor_mm);
  if (skuGF) {
    subtotal += addItem(items, warnings, skuGF, Math.ceil(anchoReal / PIEZA_FRONTAL_M), lista_precios, 'Gotero Frontal ' + familia + ' ' + espesor_mm + 'mm');
  }

  // Gotero Superior
  const skuGS = getGoteroSuperiorSKU(familia, espesor_mm);
  if (skuGS) {
    subtotal += addItem(items, warnings, skuGS, Math.ceil(anchoReal / PIEZA_FRONTAL_M), lista_precios, 'Gotero Superior ' + familia + ' ' + espesor_mm + 'mm');
  }

  // Goteros Laterales (izq + der)
  const skuGL = getGoteroLateralSKU(familia, espesor_mm);
  if (skuGL) {
    subtotal += addItem(items, warnings, skuGL, Math.ceil(largo_m / PIEZA_LATERAL_M) * 2, lista_precios, 'Gotero Lateral ' + familia + ' ' + espesor_mm + 'mm');
  }

  // Cumbrera (solo si tiene 2 aguas)
  if (tiene_cumbrera) {
    const skuCumb = getCumbraSKU(familia);
    if (skuCumb) {
      const piezaM = getAccessoryBySKU(skuCumb, lista_precios).largo_m || 3.0;
      subtotal += addItem(items, warnings, skuCumb, Math.ceil(anchoReal / piezaM), lista_precios, 'Cumbrera');
    } else {
      warnings.push('No hay cumbrera definida en catálogo para familia ' + familia);
    }
  }

  // Canalón + Soporte (solo si tiene canalón)
  if (tiene_canalon) {
    const skuCan = getCaalonSKU(familia, espesor_mm);
    if (skuCan) {
      subtotal += addItem(items, warnings, skuCan, Math.ceil(anchoReal / PIEZA_FRONTAL_M), lista_precios, 'Canalón ' + familia + ' ' + espesor_mm + 'mm');
      const skuSop = getSoporteCaalonSKU(familia);
      if (skuSop) {
        subtotal += addItem(items, warnings, skuSop, Math.ceil(anchoReal / 1.5), lista_precios, 'Soporte Canalón');
      }
    } else {
      warnings.push('No hay canalón definido en catálogo para ' + familia + ' ' + espesor_mm + 'mm');
    }
  }

  // Fijaciones: ISOROOF → Caballete Rojo; otros → TMOME + ARATRAP
  const cantFij = Math.ceil(area_m2 * 6);
  if (familia.startsWith('ISOROOF')) {
    subtotal += addItem(items, warnings, 'Cab. Roj', cantFij, lista_precios, 'Caballete Rojo');
  } else {
    subtotal += addItem(items, warnings, 'TMOME', cantFij, lista_precios, 'Tornillo madera/metal');
    subtotal += addItem(items, warnings, 'ARATRAP', cantFij, lista_precios, 'Arandela Trapezoidal');
  }

  // Sellado: cinta butilo entre paneles
  const cantButilo = Math.ceil((cantP - 1) * largo_m / CINTA_BUTILO_ML);
  if (cantButilo > 0) {
    subtotal += addItem(items, warnings, 'C.But.', cantButilo, lista_precios, 'Cinta Butilo');
  }
  // Silicona: 1 cada 15m²
  subtotal += addItem(items, warnings, 'Bromplast', Math.ceil(area_m2 / 15), lista_precios, 'Silicona Neutra Bromplast');

  return {
    tipo: 'techo',
    familia,
    espesor_mm,
    ancho_m: Math.round(anchoReal * 100) / 100,
    largo_m,
    area_m2: Math.round(area_m2 * 100) / 100,
    cant_paneles: cantP,
    tiene_cumbrera,
    tiene_canalon,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    warnings,
  };
}

module.exports = { calcTechoCompleto };
