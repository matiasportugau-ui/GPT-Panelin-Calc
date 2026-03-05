'use strict';

const catalog = require('../data/catalog');

function resolverPrecio(item, listaActiva = 'venta') {
  return catalog.getAccessoryPrice(item, listaActiva);
}

function resolverPanelInfo(familia, espesor_mm, listaActiva = 'venta') {
  const panel = catalog.getPanelByFamilyAndThickness(familia, espesor_mm, listaActiva);
  return {
    precio_m2: panel.precio_m2,
    au_m: panel.au_m,
  };
}

function ivaRate() {
  return catalog.ivaRate();
}

function catalogoFamilias() {
  return catalog.listFamilies();
}

module.exports = { resolverPrecio, resolverPanelInfo, ivaRate, catalogoFamilias };
