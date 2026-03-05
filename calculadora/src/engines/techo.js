'use strict';

const { resolverPanelInfo, resolverPrecio } = require('./precios');

/**
 * Calcula el BOM completo para un techo de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia        - e.g. 'ISODEC_EPS', 'ISOROOF_3G'
 * @param {number} params.espesor_mm     - Espesor en mm
 * @param {number} params.ancho_m        - Ancho del techo en metros
 * @param {number} params.largo_m        - Largo del techo en metros
 * @param {number} params.apoyos         - Cantidad de apoyos intermedios (default 0)
 * @param {'venta'|'web'} params.lista_precios
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcTechoCompleto({ familia, espesor_mm, ancho_m, largo_m, apoyos = 0, lista_precios = 'venta' }) {
  const panelInfo = resolverPanelInfo(familia, espesor_mm, lista_precios);
  const { precio_m2, au_m } = panelInfo;

  // Cantidad de paneles (ancho panel = au_m)
  const cantP = Math.ceil(ancho_m / au_m);
  const area_m2 = cantP * au_m * largo_m;
  const costo_paneles = area_m2 * precio_m2;

  const items = [];

  // Paneles
  items.push({
    descripcion: `Panel ${familia} ${espesor_mm}mm`,
    cantidad: cantP,
    unidad: 'panel',
    precio_unit: precio_m2 * au_m * largo_m,
    subtotal: costo_paneles,
  });

  let subtotal = costo_paneles;

  const esISORoof = familia.startsWith('ISOROOF');

  // Fijaciones
  if (esISORoof) {
    // ISOROOF: caballete
    const largoBarra = 2.9;
    const cantCaballete = Math.ceil((cantP * 3 * (largo_m / largoBarra + 1)) + (largo_m * 2 / 0.3));
    const precioCaballete = resolverPrecio('caballete_unidad', lista_precios);
    const costoCaballete = cantCaballete * precioCaballete;
    items.push({
      descripcion: 'Caballete ISOROOF',
      cantidad: cantCaballete,
      unidad: 'und',
      precio_unit: precioCaballete,
      subtotal: costoCaballete,
    });
    subtotal += costoCaballete;

    // Soporte canalón
    const mlSoportes = (cantP + 1) * 0.30;
    const largoBarra3m = 3;
    const barrasSoporte = Math.ceil(mlSoportes / largoBarra3m);
    const precioSoporte = resolverPrecio('barra_soporte_3m', lista_precios);
    const costoSoportes = barrasSoporte * precioSoporte;
    items.push({
      descripcion: 'Barra soporte canalón',
      cantidad: barrasSoporte,
      unidad: 'barra',
      precio_unit: precioSoporte,
      subtotal: costoSoportes,
    });
    subtotal += costoSoportes;
  } else {
    // ISODEC: varilla + tuerca/arandela
    const cantVarillas = Math.ceil((cantP * (apoyos + 2) * 2) + (largo_m * 2 / 2.5));
    const precioVarilla = resolverPrecio('varilla_roscada_m', lista_precios);
    const costoVarillas = cantVarillas * largo_m * precioVarilla;
    items.push({
      descripcion: 'Varilla roscada (m)',
      cantidad: cantVarillas * largo_m,
      unidad: 'm',
      precio_unit: precioVarilla,
      subtotal: costoVarillas,
    });
    subtotal += costoVarillas;

    const cantTuercas = Math.ceil((cantP * apoyos * 2) + (largo_m * 2 / 2.5));
    const precioTuerca = resolverPrecio('tuerca_arandela_set', lista_precios);
    const costoTuercas = cantTuercas * precioTuerca;
    items.push({
      descripcion: 'Set tuerca + arandela',
      cantidad: cantTuercas,
      unidad: 'set',
      precio_unit: precioTuerca,
      subtotal: costoTuercas,
    });
    subtotal += costoTuercas;
  }

  // Perfilería de bordes (perímetro)
  const perimetro = 2 * (ancho_m + largo_m);
  const precioBorde = resolverPrecio('perfil_borde_m', lista_precios);
  const costoBorde = perimetro * precioBorde;
  items.push({
    descripcion: 'Perfil de borde (perímetro)',
    cantidad: Math.ceil(perimetro),
    unidad: 'm',
    precio_unit: precioBorde,
    subtotal: costoBorde,
  });
  subtotal += costoBorde;

  // Sellador (1 cartucho cada 8 m² aprox)
  const cartuchosSellador = Math.ceil(area_m2 / 8);
  const precioSellador = resolverPrecio('sellador_310ml', lista_precios);
  const costoSellador = cartuchosSellador * precioSellador;
  items.push({
    descripcion: 'Sellador poliuretano 310ml',
    cantidad: cartuchosSellador,
    unidad: 'cartucho',
    precio_unit: precioSellador,
    subtotal: costoSellador,
  });
  subtotal += costoSellador;

  return {
    tipo: 'techo',
    familia,
    espesor_mm,
    ancho_m,
    largo_m,
    area_m2: Math.round(area_m2 * 100) / 100,
    cant_paneles: cantP,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = { calcTechoCompleto };
