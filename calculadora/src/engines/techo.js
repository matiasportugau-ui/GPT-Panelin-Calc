'use strict';

const {
  getPanelByFamilyAndThickness,
  getAccessoryPrice,
  resolveGoteroFrontal,
  resolveGoteroSuperior,
  resolveGoteroLateral,
  resolveCanalon,
  resolveCumbrera,
  resolveSoporteCanalon,
} = require('../data/catalog');

/**
 * Calcula el BOM completo para un techo de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia
 * @param {number} params.espesor_mm
 * @param {number} [params.ancho_m]
 * @param {number} params.largo_m
 * @param {number} [params.cant_paneles]
 * @param {number} [params.apoyos]
 * @param {boolean} [params.tiene_cumbrera]
 * @param {boolean} [params.tiene_canalon]
 * @param {'venta'|'web'} [params.lista_precios]
 * @returns {Object}
 */
function calcTechoCompleto({
  familia, espesor_mm, ancho_m, largo_m,
  cant_paneles, apoyos = 0,
  tiene_cumbrera = false, tiene_canalon = true,
  lista_precios = 'venta',
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

  // 2. Gotero Frontal (borde inferior)
  const gfSku = resolveGoteroFrontal(familia, espesor_mm);
  if (gfSku) {
    const cantGF = Math.ceil(ancho_m / 3.03);
    const precioGF = getAccessoryPrice(gfSku, lista_precios);
    items.push({
      sku: gfSku,
      descripcion: `Gotero Frontal`,
      cantidad: cantGF,
      unidad: 'pieza',
      precio_unit: precioGF,
      subtotal: Math.round(cantGF * precioGF * 100) / 100,
    });
    subtotal += cantGF * precioGF;
  }

  // 3. Gotero Superior (borde superior)
  const gsSku = resolveGoteroSuperior(familia, espesor_mm);
  if (gsSku) {
    const cantGS = Math.ceil(ancho_m / 3.03);
    const precioGS = getAccessoryPrice(gsSku, lista_precios);
    items.push({
      sku: gsSku,
      descripcion: `Gotero Superior`,
      cantidad: cantGS,
      unidad: 'pieza',
      precio_unit: precioGS,
      subtotal: Math.round(cantGS * precioGS * 100) / 100,
    });
    subtotal += cantGS * precioGS;
  }

  // 4. Goteros Laterales (izq + der)
  const glSku = resolveGoteroLateral(familia, espesor_mm);
  if (glSku) {
    const cantGL = Math.ceil(largo_m / 3) * 2;
    const precioGL = getAccessoryPrice(glSku, lista_precios);
    items.push({
      sku: glSku,
      descripcion: `Gotero Lateral (x2 lados)`,
      cantidad: cantGL,
      unidad: 'pieza',
      precio_unit: precioGL,
      subtotal: Math.round(cantGL * precioGL * 100) / 100,
    });
    subtotal += cantGL * precioGL;
  }

  // 5. Cumbrera (solo si tiene_cumbrera)
  if (tiene_cumbrera) {
    const cumSku = resolveCumbrera(familia);
    if (cumSku) {
      const cantCum = Math.ceil(ancho_m / 3.03);
      const precioCum = getAccessoryPrice(cumSku, lista_precios);
      items.push({
        sku: cumSku,
        descripcion: `Cumbrera`,
        cantidad: cantCum,
        unidad: 'pieza',
        precio_unit: precioCum,
        subtotal: Math.round(cantCum * precioCum * 100) / 100,
      });
      subtotal += cantCum * precioCum;
    }
  }

  // 6. Canalon (solo si tiene_canalon)
  if (tiene_canalon) {
    const canSku = resolveCanalon(familia, espesor_mm);
    if (canSku) {
      const cantCan = Math.ceil(ancho_m / 3.03);
      const precioCan = getAccessoryPrice(canSku, lista_precios);
      items.push({
        sku: canSku,
        descripcion: `Canalón`,
        cantidad: cantCan,
        unidad: 'pieza',
        precio_unit: precioCan,
        subtotal: Math.round(cantCan * precioCan * 100) / 100,
      });
      subtotal += cantCan * precioCan;

      // Soporte de canalon: 1 cada 1.5m del ancho del canalon
      const sopSku = resolveSoporteCanalon(familia);
      if (sopSku) {
        const cantSop = Math.ceil(ancho_m / 1.5);
        const precioSop = getAccessoryPrice(sopSku, lista_precios);
        items.push({
          sku: sopSku,
          descripcion: `Soporte Canalón`,
          cantidad: cantSop,
          unidad: 'pieza',
          precio_unit: precioSop,
          subtotal: Math.round(cantSop * precioSop * 100) / 100,
        });
        subtotal += cantSop * precioSop;
      }
    }
  }

  // 7. Fijaciones: ~6 por m2
  const cantTornillos = Math.ceil(area_m2 * 6);
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

  // 8. Sellado: Cinta butilo entre paneles
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

  // 9. Silicona: 1 cartucho cada 15m2
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
    tipo: 'techo',
    familia,
    espesor_mm,
    ancho_m: Math.round(ancho_m * 100) / 100,
    largo_m,
    area_m2: Math.round(area_m2 * 100) / 100,
    cant_paneles: cantP,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = { calcTechoCompleto };
