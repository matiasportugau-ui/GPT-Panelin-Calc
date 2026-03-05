'use strict';

const { resolverPanelInfo, resolverPrecio } = require('./precios');

/**
 * Calcula el BOM completo para una fachada/pared de paneles Panelin.
 *
 * @param {Object} params
 * @param {string} params.familia          - e.g. 'ISOPANEL_EPS', 'ISOWALL_PIR'
 * @param {number} params.espesor_mm
 * @param {number} params.ancho_m          - Ancho total de la pared en metros
 * @param {number} params.largo_m          - Altura de la pared en metros
 * @param {number} params.num_aberturas    - Cantidad de aberturas (puertas/ventanas)
 * @param {'metal'|'hormigon'|'mixto'} params.estructura
 * @param {'venta'|'web'} params.lista_precios
 * @returns {Object} BOM detallado con items y subtotal
 */
function calcParedCompleto({
  familia,
  espesor_mm,
  ancho_m,
  largo_m,
  num_aberturas = 0,
  estructura = 'metal',
  lista_precios = 'venta',
}) {
  const panelInfo = resolverPanelInfo(familia, espesor_mm, lista_precios);
  const { precio_m2, au_m } = panelInfo;

  const cantP = Math.ceil(ancho_m / au_m);
  const area_m2 = cantP * au_m * largo_m;
  const costo_paneles = area_m2 * precio_m2;

  const items = [];
  let subtotal = costo_paneles;

  // Paneles
  items.push({
    descripcion: `Panel ${familia} ${espesor_mm}mm`,
    cantidad: cantP,
    unidad: 'panel',
    precio_unit: precio_m2 * au_m * largo_m,
    subtotal: costo_paneles,
  });

  // Perfil U (soleras superior e inferior)
  const mlPerfilU = 2 * ancho_m;
  const precioU = resolverPrecio('perfil_U_m', lista_precios);
  const costoU = Math.ceil(mlPerfilU) * precioU;
  items.push({
    descripcion: 'Perfil U (soleras)',
    cantidad: Math.ceil(mlPerfilU),
    unidad: 'm',
    precio_unit: precioU,
    subtotal: costoU,
  });
  subtotal += costoU;

  // Perfil K2 (encuentro entre paneles, cada au_m)
  const cantK2 = Math.ceil(ancho_m / au_m) - 1;
  const mlK2 = cantK2 * largo_m;
  const precioK2 = resolverPrecio('perfil_K2_m', lista_precios);
  const costoK2 = Math.ceil(mlK2) * precioK2;
  if (mlK2 > 0) {
    items.push({
      descripcion: 'Perfil K2 (encuentro paneles)',
      cantidad: Math.ceil(mlK2),
      unidad: 'm',
      precio_unit: precioK2,
      subtotal: costoK2,
    });
    subtotal += costoK2;
  }

  // Perfil G2 (esquinas exteriores — 4 por default si es recinto completo)
  const mlG2 = 4 * largo_m;
  const precioG2 = resolverPrecio('perfil_G2_m', lista_precios);
  const costoG2 = Math.ceil(mlG2) * precioG2;
  items.push({
    descripcion: 'Perfil G2 (esquinas)',
    cantidad: Math.ceil(mlG2),
    unidad: 'm',
    precio_unit: precioG2,
    subtotal: costoG2,
  });
  subtotal += costoG2;

  // Kit anclaje H° (cada 0.30m en perímetro inferior)
  const perimetroInf = ancho_m;
  const cantKitAnclaje = Math.ceil(perimetroInf / 0.30);
  const precioAnclaje = resolverPrecio('kit_anclaje_H', lista_precios);
  const costoAnclaje = cantKitAnclaje * precioAnclaje;
  items.push({
    descripcion: 'Kit anclaje H° (c/0.30m)',
    cantidad: cantKitAnclaje,
    unidad: 'und',
    precio_unit: precioAnclaje,
    subtotal: costoAnclaje,
  });
  subtotal += costoAnclaje;

  // Tornillos T2 para estructura metal/mixto (5.5 por m²)
  if (estructura === 'metal' || estructura === 'mixto') {
    const cantT2 = Math.ceil(area_m2 * 5.5);
    const precioT2 = resolverPrecio('tornillo_T2', lista_precios);
    const costoT2 = cantT2 * precioT2;
    items.push({
      descripcion: 'Tornillo auto-tapping T2',
      cantidad: cantT2,
      unidad: 'und',
      precio_unit: precioT2,
      subtotal: costoT2,
    });
    subtotal += costoT2;
  }

  // Remaches POP (2 por panel)
  const cantRemaches = cantP * 2;
  const precioRemache = resolverPrecio('remache_POP', lista_precios);
  const costoRemaches = cantRemaches * precioRemache;
  items.push({
    descripcion: 'Remache POP',
    cantidad: cantRemaches,
    unidad: 'und',
    precio_unit: precioRemache,
    subtotal: costoRemaches,
  });
  subtotal += costoRemaches;

  // Sellador
  const cartuchosSellador = Math.ceil(area_m2 / 10);
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
    tipo: 'pared',
    familia,
    espesor_mm,
    ancho_m,
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
