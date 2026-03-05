'use strict';

const precios = require('../data/precios.json');

/**
 * Resuelve el precio de un ítem según la lista activa ('venta' o 'web').
 * @param {string} item - Clave del accesorio (e.g. 'varilla_roscada_m')
 * @param {'venta'|'web'} listaActiva - Lista de precios a usar
 * @returns {number} Precio sin IVA
 */
function resolverPrecio(item, listaActiva = 'venta') {
  const acc = precios.accesorios[item];
  if (!acc) throw new Error(`Accesorio no encontrado: ${item}`);
  return acc[listaActiva];
}

/**
 * Resuelve el precio por m² de un panel según familia, espesor y lista.
 * @param {string} familia - Familia del panel (e.g. 'ISODEC_EPS')
 * @param {number|string} espesor_mm - Espesor en mm
 * @param {'venta'|'web'} listaActiva
 * @returns {{ precio_m2: number, au_m: number, largo_min: number, largo_max: number }}
 */
function resolverPanelInfo(familia, espesor_mm, listaActiva = 'venta') {
  const familiaData = precios.familias[familia];
  if (!familiaData) throw new Error(`Familia no encontrada: ${familia}`);
  const espData = familiaData[String(espesor_mm)];
  if (!espData) throw new Error(`Espesor ${espesor_mm}mm no encontrado en familia ${familia}`);
  return {
    precio_m2: espData[listaActiva],
    au_m: espData.au_m,
    largo_min: espData.largo_min,
    largo_max: espData.largo_max,
  };
}

/**
 * Devuelve la tasa de IVA configurada.
 */
function ivaRate() {
  return precios.iva_rate;
}

/**
 * Devuelve la referencia de envío en USD desde precios.json.
 */
function envioReferencia() {
  return precios.envio_referencia_usd;
}

/**
 * Catálogo completo de familias disponibles.
 */
function catalogoFamilias() {
  return Object.entries(precios.familias).map(([familia, espesores]) => ({
    familia,
    espesores: Object.keys(espesores).map(Number),
  }));
}

module.exports = { resolverPrecio, resolverPanelInfo, ivaRate, envioReferencia, catalogoFamilias };
