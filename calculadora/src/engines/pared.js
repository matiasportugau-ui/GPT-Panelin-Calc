'use strict';

const {
  getPanelByFamilyAndThickness,
  getAccessoryPrice,
  resolvePerfilU,
} = require('../data/catalog');

/**
 * Calcula el BOM completo para una pared de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia
 * @param {number} params.espesor_mm
 * @param {number} [params.ancho_m]
 * @param {number} params.largo_m  (altura de la pared)
 * @param {number} [params.cant_paneles]
 * @param {number} [params.num_aberturas]
 * @param {'metal'|'hormigon'|'mixto'} [params.estructura]
 * @param {'venta'|'web'} [params.lista_precios]
 * @returns {Object}
 */
function calcParedCompleto({
  familia, espesor_mm, ancho_m, largo_m,
  cant_paneles, num_aberturas = 0,
  estructura = 'metal', lista_precios = 'venta',
}) {
  const panel = getPanelByFamilyAndThickness(familia, espesor_mm, lista_precios);
  const { precio_m2, au_m, sku: panelSku, name: panelName } = panel;

  // Resolve ancho from cant_paneles or ancho_m
  let cantP;
  if (cant_paneles) {
    cantP = cant_paneles;
    ancho_m = cantP * au_m;
  } else if (ancho_m) {
    cantP = Math.ceil(ancho_m / au_m);
  } else {
    throw new Error('Se requiere ancho_m o cant_paneles');
  }

  const area_m2 = cantP * au_m * largo_m;
  const costo_paneles = area_m2 * precio_m2;

  const items = [];
  let subtotal = 0;

  // 1. Paneles
  items.push({
    sku: panelSku,
    descripcion: `Panel ${panelName}`,
    cantidad: cantP,
    unidad: 'panel',
    precio_unit: Math.round(precio_m2 * au_m * largo_m * 100) / 100,
    subtotal: Math.round(costo_paneles * 100) / 100,
  });
  subtotal += costo_paneles;

  // 2. Perfil U (solera superior + inferior): 2 x ceil(ancho_m / 3) piezas
  const puSku = resolvePerfilU(espesor_mm);
  if (puSku) {
    const cantPU = 2 * Math.ceil(ancho_m / 3);
    const precioPU = getAccessoryPrice(puSku, lista_precios);
    items.push({
      sku: puSku,
      descripcion: `Perfil U (soleras)`,
      cantidad: cantPU,
      unidad: 'pieza (3m)',
      precio_unit: precioPU,
      subtotal: Math.round(cantPU * precioPU * 100) / 100,
    });
    subtotal += cantPU * precioPU;
  }

  // 3. Tornillos: ~5.5 por m2 para metal/mixto
  if (estructura === 'metal' || estructura === 'mixto') {
    const cantTornillos = Math.ceil(area_m2 * 5.5);
    const precioTornillo = getAccessoryPrice('TMOME', lista_precios);
    items.push({
      sku: 'TMOME',
      descripcion: `Tornillo madera/metal`,
      cantidad: cantTornillos,
      unidad: 'und',
      precio_unit: precioTornillo,
      subtotal: Math.round(cantTornillos * precioTornillo * 100) / 100,
    });
    subtotal += cantTornillos * precioTornillo;

    // Arandelas: misma cantidad que tornillos
    const precioArandela = getAccessoryPrice('ARATRAP', lista_precios);
    items.push({
      sku: 'ARATRAP',
      descripcion: `Arandela Trapezoidal`,
      cantidad: cantTornillos,
      unidad: 'und',
      precio_unit: precioArandela,
      subtotal: Math.round(cantTornillos * precioArandela * 100) / 100,
    });
    subtotal += cantTornillos * precioArandela;
  }

  // 4. Remaches POP: 2 por panel
  const cantRemaches = cantP * 2;
  const precioRemache = getAccessoryPrice('REMPOP', lista_precios);
  items.push({
    sku: 'REMPOP',
    descripcion: `Remache POP`,
    cantidad: cantRemaches,
    unidad: 'und',
    precio_unit: precioRemache,
    subtotal: Math.round(cantRemaches * precioRemache * 100) / 100,
  });
  subtotal += cantRemaches * precioRemache;

  // 5. Sellado: Cinta butilo entre paneles
  const rollosCinta = Math.ceil((cantP - 1) * largo_m / 22.5);
  if (rollosCinta > 0) {
    const precioCinta = getAccessoryPrice('C.But.', lista_precios);
    items.push({
      sku: 'C.But.',
      descripcion: `Cinta Butilo (22.5m)`,
      cantidad: rollosCinta,
      unidad: 'rollo',
      precio_unit: precioCinta,
      subtotal: Math.round(rollosCinta * precioCinta * 100) / 100,
    });
    subtotal += rollosCinta * precioCinta;
  }

  // 6. Silicona: 1 cartucho cada 15m2
  const cantSilicona = Math.ceil(area_m2 / 15);
  const precioSilicona = getAccessoryPrice('Bromplast', lista_precios);
  items.push({
    sku: 'Bromplast',
    descripcion: `Silicona Neutra`,
    cantidad: cantSilicona,
    unidad: 'cartucho',
    precio_unit: precioSilicona,
    subtotal: Math.round(cantSilicona * precioSilicona * 100) / 100,
  });
  subtotal += cantSilicona * precioSilicona;

  return {
    tipo: 'pared',
    familia,
    espesor_mm,
    ancho_m: Math.round(ancho_m * 100) / 100,
    largo_m,
    area_m2: Math.round(area_m2 * 100) / 100,
    cant_paneles: cantP,
    num_aberturas,
    estructura,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = { calcParedCompleto };
