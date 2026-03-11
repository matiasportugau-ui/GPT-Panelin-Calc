'use strict';

const {
  calculateFromInput,
  issueQuote,
  patchQuoteStatus,
  getClientHistory,
} = require('../quotes/service');

function normalizeAction(action) {
  return String(action || '').trim().toLowerCase();
}

function mergeClient(a = {}, b = {}) {
  return {
    client_id: b.client_id || a.client_id || undefined,
    nombre: b.nombre || a.nombre || '',
    telefono: b.telefono || a.telefono || '',
    direccion: b.direccion || a.direccion || '',
    origen_principal: b.origen_principal || a.origen_principal || '',
  };
}

function mergeTechnicalInput(a = {}, b = {}) {
  return {
    escenario: b.escenario || a.escenario || '',
    familia: b.familia || a.familia || '',
    espesor_mm: b.espesor_mm ?? a.espesor_mm,
    ancho_m: b.ancho_m ?? a.ancho_m,
    cant_paneles: b.cant_paneles ?? a.cant_paneles,
    largo_m: b.largo_m ?? a.largo_m,
    lista_precios: b.lista_precios || a.lista_precios || 'venta',
    apoyos: b.apoyos ?? a.apoyos ?? 0,
    num_aberturas: b.num_aberturas ?? a.num_aberturas ?? 0,
    estructura: b.estructura || a.estructura || 'metal',
    tiene_canalon: Boolean(b.tiene_canalon ?? a.tiene_canalon),
    tiene_cumbrera: Boolean(b.tiene_cumbrera ?? a.tiene_cumbrera),
    envio_usd: b.envio_usd ?? a.envio_usd,
  };
}

async function executeAutomationFromParsed(parsed, context = {}) {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const action = normalizeAction(parsed.action);
  if (!action) return null;

  const client = mergeClient(context.client || {}, parsed.client || {});
  const technicalInput = mergeTechnicalInput(context.technical_input || {}, parsed.technical_input || {});

  if (action === 'calculate') {
    return {
      action: 'calculate',
      calculation_result: calculateFromInput({
        client,
        technical_input: technicalInput,
      }),
    };
  }

  if (action === 'issue') {
    let calc = parsed.calculation_result || null;
    if (!calc) {
      calc = calculateFromInput({
        client,
        technical_input: technicalInput,
      });
    }
    const issued = await issueQuote({
      quote_ref: parsed.quote_ref,
      version: parsed.version,
      status_target: parsed.estado_cotizacion || 'EMITIDA',
      issued_by: context.issued_by || 'ai-automation',
      client,
      calculation_result: calc,
      links: parsed.links || {},
    });
    return { action: 'issue', issued };
  }

  if (action === 'update_status') {
    if (!parsed.quote_id || !parsed.estado_cotizacion) {
      return { action, warning: 'Falta quote_id o estado_cotizacion' };
    }
    const updated = patchQuoteStatus(parsed.quote_id, parsed.estado_cotizacion);
    return {
      action: 'update_status',
      updated: {
        quote_id: updated.quote_id,
        quote_ref: updated.quote_ref,
        estado_cotizacion: updated.estado_cotizacion,
      },
    };
  }

  if (action === 'history') {
    const clientId = parsed.client?.client_id || context.client?.client_id;
    if (!clientId) return { action, warning: 'Falta client_id para history' };
    const history = getClientHistory(clientId);
    return { action: 'history', history };
  }

  if (action === 'followup') {
    return {
      action: 'followup',
      next_action: parsed.next_action || 'Generar cola de follow-up y priorizar Alta',
    };
  }

  return { action, warning: 'Accion no ejecutable automaticamente' };
}

module.exports = {
  executeAutomationFromParsed,
};
