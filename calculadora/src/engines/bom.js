'use strict';

const { v4: uuidv4 } = require('uuid');
const { calcTechoCompleto } = require('./techo');
const { calcParedCompleto } = require('./pared');
const { validarAutoportancia } = require('./autoportancia');
const { ivaRate } = require('../data/catalog');

const ESCENARIOS_VALIDOS = ['solo_techo', 'solo_fachada', 'techo_fachada', 'camara_frigorifica'];

/**
 * Orquestador principal. Genera una cotizacion completa segun el escenario.
 */
function generarCotizacion(params) {
  const {
    escenario,
    familia,
    espesor_mm,
    ancho_m,
    largo_m,
    cant_paneles,
    lista_precios = 'venta',
    apoyos = 0,
    num_aberturas = 0,
    estructura = 'metal',
    tiene_cumbrera = false,
    tiene_canalon = true,
    envio_usd,
  } = params;

  if (!ESCENARIOS_VALIDOS.includes(escenario)) {
    throw new Error(`Escenario invalido: ${escenario}. Validos: ${ESCENARIOS_VALIDOS.join(', ')}`);
  }

  const warnings = [];
  const secciones = [];

  // Autoportancia validation
  const luzReal = apoyos > 0 ? largo_m / (apoyos + 1) : largo_m;
  const autop = validarAutoportancia(familia, espesor_mm, luzReal);
  if (!autop.valido) {
    warnings.push(autop.mensaje);
  }

  const techoParams = {
    familia, espesor_mm, ancho_m, largo_m, cant_paneles,
    apoyos, tiene_cumbrera, tiene_canalon, lista_precios,
  };
  const paredParams = {
    familia, espesor_mm, ancho_m, largo_m, cant_paneles,
    num_aberturas, estructura, lista_precios,
  };

  if (escenario === 'solo_techo' || escenario === 'techo_fachada') {
    secciones.push(calcTechoCompleto(techoParams));
  }

  if (escenario === 'solo_fachada' || escenario === 'techo_fachada') {
    secciones.push(calcParedCompleto(paredParams));
  }

  if (escenario === 'camara_frigorifica') {
    secciones.push(calcTechoCompleto(techoParams));
    const alto_m = 3;
    const paredFrontal = calcParedCompleto({
      familia, espesor_mm, ancho_m, largo_m: alto_m,
      num_aberturas, estructura, lista_precios,
    });
    paredFrontal.tipo = 'pared_frontal_posterior';
    secciones.push(paredFrontal);
    const paredLateral = calcParedCompleto({
      familia, espesor_mm, ancho_m: largo_m, largo_m: alto_m,
      num_aberturas: 0, estructura, lista_precios,
    });
    paredLateral.tipo = 'pared_lateral';
    secciones.push(paredLateral);
  }

  const subtotal_sin_iva = secciones.reduce((acc, s) => acc + s.subtotal, 0);
  const iva = subtotal_sin_iva * ivaRate();
  const total_con_iva = subtotal_sin_iva + iva;

  const result = {
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

  // Only include envio if explicitly provided
  if (envio_usd !== undefined && envio_usd !== null) {
    result.envio_usd = Number(envio_usd);
  }

  return result;
}

module.exports = { generarCotizacion };
