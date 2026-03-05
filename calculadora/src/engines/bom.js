'use strict';

const { v4: uuidv4 } = require('uuid');
const { calcTechoCompleto } = require('./techo');
const { calcParedCompleto } = require('./pared');
const { validarAutoportancia } = require('./autoportancia');
const { ivaRate, envioReferencia } = require('./precios');

const ESCENARIOS_VALIDOS = ['solo_techo', 'solo_fachada', 'techo_fachada', 'camara_frigorifica'];

/**
 * Orquestador principal. Genera una cotización completa según el escenario.
 *
 * @param {Object} params
 * @param {'solo_techo'|'solo_fachada'|'techo_fachada'|'camara_frigorifica'} params.escenario
 * @param {string}  params.familia
 * @param {number}  params.espesor_mm
 * @param {number}  params.ancho_m
 * @param {number}  params.largo_m
 * @param {'venta'|'web'} params.lista_precios
 * @param {number}  [params.apoyos]         - Solo techo
 * @param {number}  [params.num_aberturas]  - Solo fachada/pared
 * @param {string}  [params.estructura]     - Solo fachada/pared
 * @returns {Object} Cotización completa con IVA y warnings
 */
function generarCotizacion(params) {
  const {
    escenario,
    familia,
    espesor_mm,
    ancho_m,
    largo_m,
    lista_precios = 'venta',
    apoyos = 0,
    num_aberturas = 0,
    estructura = 'metal',
  } = params;

  if (!ESCENARIOS_VALIDOS.includes(escenario)) {
    throw new Error(`Escenario inválido: ${escenario}. Válidos: ${ESCENARIOS_VALIDOS.join(', ')}`);
  }

  const warnings = [];
  const secciones = [];

  // Validación autoportancia: valida la luz entre apoyos, no el largo total
  const luzReal = apoyos > 0 ? largo_m / (apoyos + 1) : largo_m;
  const autop = validarAutoportancia(familia, espesor_mm, luzReal);
  if (!autop.valido) {
    warnings.push(autop.mensaje);
  }

  // Calcular según escenario
  if (escenario === 'solo_techo' || escenario === 'techo_fachada') {
    const techo = calcTechoCompleto({ familia, espesor_mm, ancho_m, largo_m, apoyos, lista_precios });
    secciones.push(techo);
  }

  if (escenario === 'solo_fachada' || escenario === 'techo_fachada') {
    const pared = calcParedCompleto({ familia, espesor_mm, ancho_m, largo_m, num_aberturas, estructura, lista_precios });
    secciones.push(pared);
  }

  if (escenario === 'camara_frigorifica') {
    // Cámara: techo + 4 paredes
    const techo = calcTechoCompleto({ familia, espesor_mm, ancho_m, largo_m, apoyos, lista_precios });
    secciones.push(techo);
    // Pared frontal/posterior (ancho × alto estimado)
    const alto_m = 3; // altura default para cámara
    const paredFrontal = calcParedCompleto({ familia, espesor_mm, ancho_m, largo_m: alto_m, num_aberturas, estructura, lista_precios });
    paredFrontal.tipo = 'pared_frontal_posterior';
    secciones.push(paredFrontal);
    // Paredes laterales
    const paredLateral = calcParedCompleto({ familia, espesor_mm, ancho_m: largo_m, largo_m: alto_m, num_aberturas: 0, estructura, lista_precios });
    paredLateral.tipo = 'pared_lateral';
    secciones.push(paredLateral);
  }

  // Totales
  const subtotal_sin_iva = secciones.reduce((acc, s) => acc + s.subtotal, 0);
  const iva = subtotal_sin_iva * ivaRate();
  const total_con_iva = subtotal_sin_iva + iva;

  return {
    cotizacion_id: uuidv4(),
    fecha: new Date().toISOString().split('T')[0],
    escenario,
    familia,
    espesor_mm,
    lista_precios,
    secciones,
    resumen: {
      subtotal_sin_iva: Math.round(subtotal_sin_iva * 100) / 100,
      iva_22: Math.round(iva * 100) / 100,
      total_con_iva: Math.round(total_con_iva * 100) / 100,
      moneda: 'USD',
    },
    warnings,
    envio_referencia_usd: envioReferencia(),
    nota: 'Precios sin IVA. IVA 22% aplicado al total final. Consultar disponibilidad de stock.',
  };
}

module.exports = { generarCotizacion };
