'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { generarCotizacion } = require('../engines/bom');
const { tablaAutoportancia, validarAutoportancia } = require('../engines/autoportancia');
const { listFamilies } = require('../data/catalog');
const { generarPDF } = require('../pdf/generator');
const {
  calculateFromInput,
  issueQuote,
  patchQuoteStatus,
  getClientHistory,
  getQuoteVersionFile,
  getQuoteFolderPath,
} = require('../quotes/service');
const { buildAutomationPrompt } = require('../ai/prompt');
const { parseJsonBlock } = require('../ai/parser');
const { runProviderCompletion, resolveProviderConfig } = require('../ai/providers');
const { executeAutomationFromParsed } = require('../ai/automation');

const router = express.Router();

// In-memory cache for recent cotizaciones (max 100)
const cotizacionCache = new Map();
const MAX_CACHE = 100;

function cacheCotizacion(cotizacion) {
  if (cotizacionCache.size >= MAX_CACHE) {
    const oldest = cotizacionCache.keys().next().value;
    cotizacionCache.delete(oldest);
  }
  cotizacionCache.set(cotizacion.cotizacion_id, cotizacion);
}

// GET /health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'calculadora-bmc', version: '5.0.0' });
});

// GET /api/productos
router.get('/api/productos', (_req, res) => {
  try {
    const catalogo = listFamilies();
    res.json({ ok: true, catalogo });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/autoportancia?familia=X&espesor=Y&luz=Z
router.get('/api/autoportancia', (req, res) => {
  try {
    const { familia, espesor, luz } = req.query;
    if (familia && espesor && luz) {
      const result = validarAutoportancia(familia, Number(espesor), Number(luz));
      return res.json({ ok: true, ...result });
    }
    const tabla = tablaAutoportancia();
    res.json({ ok: true, tabla });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/cotizar
router.post('/api/cotizar', (req, res) => {
  try {
    const {
      escenario, familia, espesor_mm,
      ancho_m, cant_paneles, largo_m,
      lista_precios, apoyos, num_aberturas, estructura,
      tiene_cumbrera, tiene_canalon, envio_usd,
    } = req.body;

    if (!escenario) return res.status(400).json({ ok: false, error: 'Campo requerido: escenario' });
    if (!familia)   return res.status(400).json({ ok: false, error: 'Campo requerido: familia' });
    if (espesor_mm === undefined || espesor_mm === null || espesor_mm === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: espesor_mm' });
    }
    if (largo_m === undefined || largo_m === null || largo_m === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: largo_m' });
    }

    // ancho_m OR cant_paneles required
    const tieneAncho = ancho_m !== undefined && ancho_m !== null && ancho_m !== '';
    const tieneCant  = cant_paneles !== undefined && cant_paneles !== null && cant_paneles !== '';
    if (!tieneAncho && !tieneCant) {
      return res.status(400).json({ ok: false, error: 'Se requiere ancho_m o cant_paneles' });
    }

    const espesorNum = Number(espesor_mm);
    const largoNum   = Number(largo_m);

    if (!Number.isFinite(espesorNum) || espesorNum <= 0) {
      return res.status(400).json({ ok: false, error: 'espesor_mm debe ser un numero finito > 0' });
    }
    if (!Number.isFinite(largoNum) || largoNum <= 0) {
      return res.status(400).json({ ok: false, error: 'largo_m debe ser un numero finito > 0' });
    }

    let anchoNum = null;
    if (tieneAncho) {
      anchoNum = Number(ancho_m);
      if (!Number.isFinite(anchoNum) || anchoNum <= 0) {
        return res.status(400).json({ ok: false, error: 'ancho_m debe ser un numero finito > 0' });
      }
    }

    let cantPanelesNum = null;
    if (tieneCant) {
      cantPanelesNum = Number(cant_paneles);
      if (!Number.isFinite(cantPanelesNum) || cantPanelesNum <= 0) {
        return res.status(400).json({ ok: false, error: 'cant_paneles debe ser un numero finito > 0' });
      }
    }

    let apoyosNum = 0;
    if (apoyos !== undefined && apoyos !== null && apoyos !== '') {
      apoyosNum = Number(apoyos);
      if (!Number.isFinite(apoyosNum) || apoyosNum < 0) {
        return res.status(400).json({ ok: false, error: 'apoyos debe ser un numero finito >= 0' });
      }
    }

    let aberturasNum = 0;
    if (num_aberturas !== undefined && num_aberturas !== null && num_aberturas !== '') {
      aberturasNum = Number(num_aberturas);
      if (!Number.isFinite(aberturasNum) || aberturasNum < 0) {
        return res.status(400).json({ ok: false, error: 'num_aberturas debe ser un numero finito >= 0' });
      }
    }

    const listaPreciosNorm = lista_precios || 'venta';
    if (!['venta', 'web'].includes(listaPreciosNorm)) {
      return res.status(400).json({ ok: false, error: 'lista_precios invalida. Valores permitidos: venta, web' });
    }

    const cotizacion = generarCotizacion({
      escenario, familia,
      espesor_mm: espesorNum,
      ancho_m: anchoNum,
      cant_paneles: cantPanelesNum,
      largo_m: largoNum,
      lista_precios: listaPreciosNorm,
      apoyos: apoyosNum,
      num_aberturas: aberturasNum,
      estructura: estructura || 'metal',
      tiene_cumbrera: !!tiene_cumbrera,
      tiene_canalon: !!tiene_canalon,
      envio_usd,
    });

    cacheCotizacion(cotizacion);
    res.json({ ok: true, cotizacion });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/pdf
// Accepts: (1) cotizacion_data, (2) cotizacion_id, (3) cotizar params
router.post('/api/pdf', async (req, res) => {
  try {
    let cotizacion = null;
    const cliente = req.body.cliente || {};

    if (req.body.cotizacion_data) {
      cotizacion = req.body.cotizacion_data;
    } else if (req.body.cotizacion_id) {
      cotizacion = cotizacionCache.get(req.body.cotizacion_id);
      if (!cotizacion) {
        return res.status(404).json({ ok: false, error: 'Cotizacion ' + req.body.cotizacion_id + ' no encontrada en cache. Regenerá con POST /api/cotizar primero.' });
      }
    } else if (req.body.escenario && req.body.familia) {
      cotizacion = generarCotizacion({
        escenario:      req.body.escenario,
        familia:        req.body.familia,
        espesor_mm:     Number(req.body.espesor_mm),
        ancho_m:        req.body.ancho_m != null ? Number(req.body.ancho_m) : null,
        cant_paneles:   req.body.cant_paneles != null ? Number(req.body.cant_paneles) : null,
        largo_m:        Number(req.body.largo_m),
        lista_precios:  req.body.lista_precios || 'venta',
        apoyos:         Number(req.body.apoyos || 0),
        num_aberturas:  Number(req.body.num_aberturas || 0),
        estructura:     req.body.estructura || 'metal',
        tiene_cumbrera: !!req.body.tiene_cumbrera,
        tiene_canalon:  !!req.body.tiene_canalon,
        envio_usd:      req.body.envio_usd,
      });
      cacheCotizacion(cotizacion);
    } else {
      return res.status(400).json({ ok: false, error: 'Envia cotizacion_id, cotizacion_data, o los parametros de cotizacion.' });
    }

    const pdfBuffer = await generarPDF(cotizacion, cliente);
    const filename = 'cotizacion-bmc-' + (cotizacion.cotizacion_id || 'draft') + '.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/quotes/calculate
router.post('/api/quotes/calculate', (req, res) => {
  try {
    const client = req.body.client || {};
    const technicalInput = req.body.technical_input || req.body;
    const calculationResult = calculateFromInput({ technical_input: technicalInput, client });
    res.json({
      ok: true,
      client,
      technical_input: technicalInput,
      calculation_result: calculationResult,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/quotes/issue
router.post('/api/quotes/issue', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.client || !body.client.nombre) {
      return res.status(400).json({ ok: false, error: 'client.nombre es requerido' });
    }
    const response = await issueQuote(body);
    res.json({ ok: true, ...response });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// PATCH /api/quotes/:id/status
router.patch('/api/quotes/:id/status', (req, res) => {
  try {
    const status = req.body?.status;
    if (!status) {
      return res.status(400).json({ ok: false, error: 'Campo requerido: status' });
    }
    const quote = patchQuoteStatus(req.params.id, status);
    res.json({
      ok: true,
      quote_id: quote.quote_id,
      quote_ref: quote.quote_ref,
      estado_cotizacion: quote.estado_cotizacion,
      updated_at: quote.updated_at,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// GET /api/clients/:id/history
router.get('/api/clients/:id/history', (req, res) => {
  try {
    const history = getClientHistory(req.params.id);
    if (!history) {
      return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
    }
    res.json({ ok: true, ...history });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/quotes/:quoteRef/versions/:version/pdf
router.get('/api/quotes/:quoteRef/versions/:version/pdf', (req, res) => {
  try {
    const filePath = getQuoteVersionFile(req.params.quoteRef, Number(req.params.version), 'pdf');
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'PDF no encontrado' });
    }
    const filename = path.basename(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/quotes/:quoteRef/versions/:version/payload
router.get('/api/quotes/:quoteRef/versions/:version/payload', (req, res) => {
  try {
    const filePath = getQuoteVersionFile(req.params.quoteRef, Number(req.params.version), 'payload');
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Payload no encontrado' });
    }
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ ok: true, payload });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/quotes/:quoteRef/folder
router.get('/api/quotes/:quoteRef/folder', (req, res) => {
  try {
    const folderPath = getQuoteFolderPath(req.params.quoteRef);
    if (!folderPath || !fs.existsSync(folderPath)) {
      return res.status(404).json({ ok: false, error: 'Carpeta no encontrada' });
    }
    res.json({ ok: true, folder_path: folderPath });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/ai/prompt?provider=openai
router.get('/api/ai/prompt', (req, res) => {
  try {
    const provider = req.query.provider || 'openai';
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const prompt = buildAutomationPrompt({ provider, apiBaseUrl });
    const providerConfig = resolveProviderConfig(provider);
    res.json({
      ok: true,
      provider: providerConfig.provider,
      model: providerConfig.model,
      prompt,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/ai/automate
router.post('/api/ai/automate', async (req, res) => {
  try {
    const provider = req.body.provider || 'openai';
    const userMessage = String(req.body.user_message || '').trim();
    const autoExecute = req.body.auto_execute !== false;
    const context = req.body.context || {};

    if (!userMessage) {
      return res.status(400).json({ ok: false, error: 'Campo requerido: user_message' });
    }

    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const systemPrompt = buildAutomationPrompt({ provider, apiBaseUrl });
    const llm = await runProviderCompletion({
      provider,
      systemPrompt,
      userMessage: `${userMessage}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
    });

    const parsed = parseJsonBlock(llm.content);
    let execution = null;
    if (autoExecute && parsed) {
      execution = await executeAutomationFromParsed(parsed, {
        ...context,
        issued_by: req.body.issued_by || 'ai-automation-endpoint',
      });
    }

    res.json({
      ok: true,
      provider: llm.provider,
      model: llm.model,
      ai_text: llm.content,
      parsed_output: parsed,
      execution,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
