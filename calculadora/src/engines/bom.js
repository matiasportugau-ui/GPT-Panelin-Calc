'use strict';

const { v4: uuidv4 } = require('uuid');
const { calcTechoCompleto } = require('./techo');
const { calcParedCompleto } = require('./pared');
const { validarAutoportancia } = require('./autoportancia');
const { ivaRate } = require('../data/catalog');

const ESCENARIOS_VALIDOS = ['solo_techo', 'solo_fachada', 'techo_fachada', 'camara_frigorifica'];

/**
 * Orquestador principal. Genera una cotización completa según el escenario.
 *
 * @param {Object} params
 * @param {'solo_techo'|'solo_fachada'|'techo_fachada'|'camara_frigorifica'} params.escenario
 * @param {string}  params.familia
 * @param {number}  params.espesor_mm
 * @param {number}  [params.ancho_m]        - Alternativo a cant_paneles
 * @param {number}  [params.cant_paneles]   - Alternativo a ancho_m
 * @param {number}  params.largo_m
 * @param {'venta'|'web'} [params.lista_precios]
 * @param {number}  [params.apoyos]
 * @param {number}  [params.num_aberturas]
 * @param {string}  [params.estructura]
 * @param {boolean} [params.tiene_cumbrera]
 * @param {boolean} [params.tiene_canalon]
 * @param {number}  [params.envio_usd]      - Si se pasa, se incluye en respuesta
 * @returns {Object} Cotización completa con IVA
 */
function generarCotizacion(params) {
  const {
    escenario,
    familia,
    espesor_mm,
    ancho_m,
    cant_paneles,
    largo_m,
    lista_precios = 'venta',
    apoyos = 0,
    num_aberturas = 0,
    estructura = 'metal',
    tiene_cumbrera = false,
    tiene_canalon = false,
    envio_usd,
  } = params;

  if (!ESCENARIOS_VALIDOS.includes(escenario)) {
    throw new Error('Escenario inválido: ' + escenario + '. Válidos: ' + ESCENARIOS_VALIDOS.join(', '));
  }

  const warnings = [];
  const secciones = [];

  // Validación autoportancia
  const luzReal = apoyos > 0 ? largo_m / (apoyos + 1) : largo_m;
  const autop = validarAutoportancia(familia, espesor_mm, luzReal);
  if (!autop.valido) {
    warnings.push(autop.mensaje);
  }

  const techoParams = { familia, espesor_mm, ancho_m, cant_paneles, largo_m, apoyos, lista_precios, tiene_cumbrera, tiene_canalon, estructura };
  const paredParams = { familia, espesor_mm, ancho_m, cant_paneles, largo_m, num_aberturas, estructura, lista_precios };

  if (escenario === 'solo_techo' || escenario === 'techo_fachada') {
    const techo = calcTechoCompleto(techoParams);
    if (techo.warnings) warnings.push(...techo.warnings);
    secciones.push(techo);
  }

  if (escenario === 'solo_fachada' || escenario === 'techo_fachada') {
    const pared = calcParedCompleto(paredParams);
    if (pared.warnings) warnings.push(...pared.warnings);
    secciones.push(pared);
  }

  if (escenario === 'camara_frigorifica') {
    const techo = calcTechoCompleto(techoParams);
    if (techo.warnings) warnings.push(...techo.warnings);
    secciones.push(techo);

    const alto_m = 3;
    const paredFrontal = calcParedCompleto({ ...paredParams, largo_m: alto_m });
    paredFrontal.tipo = 'pared_frontal_posterior';
    if (paredFrontal.warnings) warnings.push(...paredFrontal.warnings);
    secciones.push(paredFrontal);

    const paredLateral = calcParedCompleto({ ...paredParams, ancho_m: largo_m, cant_paneles: null, largo_m: alto_m, num_aberturas: 0 });
    paredLateral.tipo = 'pared_lateral';
    if (paredLateral.warnings) warnings.push(...paredLateral.warnings);
    secciones.push(paredLateral);
  }

  const subtotal_sin_iva = secciones.reduce((acc, s) => acc + s.subtotal, 0);
  const iva = subtotal_sin_iva * ivaRate();
  const total_con_iva = subtotal_sin_iva + iva;

  const cotizacion = {
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
    warnings: [...new Set(warnings)],
    nota: 'Precios sin IVA. IVA 22% aplicado al total final. Consultar disponibilidad de stock.',
  };

  // Envío solo si se proporciona explícitamente
  if (envio_usd != null && Number.isFinite(Number(envio_usd))) {
    cotizacion.envio_usd = Number(envio_usd);
  }

  return cotizacion;
}

module.exports = { generarCotizacion };
