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
 * @param {number}  [params.ancho_m]         - Ancho en metros (alternativo a cant_paneles)
 * @param {number}  [params.cant_paneles]     - Cantidad de paneles (alternativo a ancho_m)
 * @param {number}  params.largo_m
 * @param {'venta'|'web'} [params.lista_precios]
 * @param {number}  [params.apoyos]
 * @param {number}  [params.num_aberturas]
 * @param {string}  [params.estructura]
 * @param {boolean} [params.tiene_cumbrera]
 * @param {boolean} [params.tiene_canalon]
 * @param {number}  [params.envio_usd]        - Costo de envío en USD (solo incluido si se proporciona)
 * @returns {Object} Cotización completa con IVA y warnings
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
    throw new Error(`Escenario inválido: ${escenario}. Válidos: ${ESCENARIOS_VALIDOS.join(', ')}`);
  }

  // Domain validation: require exactly one of ancho_m or cant_paneles with valid values
  const hasAncho = ancho_m !== undefined && ancho_m !== null;
  const hasCantP = cant_paneles !== undefined && cant_paneles !== null;
  if (!hasAncho && !hasCantP) {
    throw new Error('Se requiere ancho_m o cant_paneles');
  }
  if (hasAncho && hasCantP) {
    throw new Error('No se pueden enviar simultaneamente ancho_m y cant_paneles; use solo uno de los dos');
  }
  if (hasAncho && (!Number.isFinite(Number(ancho_m)) || Number(ancho_m) <= 0)) {
    throw new Error('ancho_m debe ser un numero finito > 0');
  }
  if (hasCantP && (!Number.isFinite(Number(cant_paneles)) || Number(cant_paneles) <= 0)) {
    throw new Error('cant_paneles debe ser un numero finito > 0');
  }
  if (!Number.isFinite(Number(largo_m)) || Number(largo_m) <= 0) {
    throw new Error('largo_m debe ser un numero finito > 0');
  }

  const warnings = [];
  const secciones = [];

  // Autoportancia validation: uses the actual span (luz), not total length
  const luzReal = apoyos > 0 ? largo_m / (apoyos + 1) : largo_m;
  const autop = validarAutoportancia(familia, espesor_mm, luzReal);
  if (!autop.valido) {
    warnings.push(autop.mensaje);
  }

  const techoParams = { familia, espesor_mm, ancho_m, cant_paneles, largo_m, apoyos, lista_precios, tiene_cumbrera, tiene_canalon };
  const paredParams = { familia, espesor_mm, ancho_m, cant_paneles, largo_m, num_aberturas, estructura, lista_precios };

  if (escenario === 'solo_techo' || escenario === 'techo_fachada') {
    secciones.push(calcTechoCompleto(techoParams));
  }

  if (escenario === 'solo_fachada' || escenario === 'techo_fachada') {
    secciones.push(calcParedCompleto(paredParams));
  }

  if (escenario === 'camara_frigorifica') {
    secciones.push(calcTechoCompleto(techoParams));

    const alto_m = 3; // fixed height for cold room
    const paredFrontal = calcParedCompleto({
      ...paredParams,
      largo_m: alto_m,
    });
    paredFrontal.tipo = 'pared_frontal_posterior';
    secciones.push(paredFrontal);

    const paredLateral = calcParedCompleto({
      familia,
      espesor_mm,
      ancho_m: largo_m,
      cant_paneles: undefined,
      largo_m: alto_m,
      num_aberturas: 0,
      estructura,
      lista_precios,
    });
    paredLateral.tipo = 'pared_lateral';
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
    warnings,
    nota: 'Precios sin IVA. IVA 22% aplicado al total final. Consultar disponibilidad de stock.',
  };

  // Only include envio_usd if explicitly provided
  if (envio_usd !== undefined && envio_usd !== null) {
    cotizacion.envio_usd = Number(envio_usd);
  }

  return cotizacion;
}

module.exports = { generarCotizacion };
