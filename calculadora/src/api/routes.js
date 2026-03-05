'use strict';

const express = require('express');
const { generarCotizacion } = require('../engines/bom');
const { tablaAutoportancia, validarAutoportancia } = require('../engines/autoportancia');
const { listFamilies } = require('../data/catalog');
const { generarPDF } = require('../pdf/generator');

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
      escenario, familia, espesor_mm, ancho_m, cant_paneles, largo_m,
      lista_precios, apoyos, num_aberturas, estructura,
      tiene_cumbrera, tiene_canalon, envio_usd,
    } = req.body;

    if (!escenario) return res.status(400).json({ ok: false, error: 'Campo requerido: escenario' });
    if (!familia) return res.status(400).json({ ok: false, error: 'Campo requerido: familia' });
    if (espesor_mm === undefined || espesor_mm === null || espesor_mm === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: espesor_mm' });
    }
    if (largo_m === undefined || largo_m === null || largo_m === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: largo_m' });
    }

    const espesorNum = Number(espesor_mm);
    const largoNum = Number(largo_m);

    if (!Number.isFinite(espesorNum) || espesorNum <= 0) {
      return res.status(400).json({ ok: false, error: 'espesor_mm debe ser un numero finito > 0' });
    }
    if (!Number.isFinite(largoNum) || largoNum <= 0) {
      return res.status(400).json({ ok: false, error: 'largo_m debe ser un numero finito > 0' });
    }

    // Require either ancho_m or cant_paneles
    let anchoNum = null;
    let cantPanelesNum = null;

    if (cant_paneles !== undefined && cant_paneles !== null && cant_paneles !== '') {
      cantPanelesNum = Number(cant_paneles);
      if (!Number.isFinite(cantPanelesNum) || cantPanelesNum <= 0) {
        return res.status(400).json({ ok: false, error: 'cant_paneles debe ser un numero finito > 0' });
      }
    }

    if (ancho_m !== undefined && ancho_m !== null && ancho_m !== '') {
      anchoNum = Number(ancho_m);
      if (!Number.isFinite(anchoNum) || anchoNum <= 0) {
        return res.status(400).json({ ok: false, error: 'ancho_m debe ser un numero finito > 0' });
      }
    }

    if (anchoNum === null && cantPanelesNum === null) {
      return res.status(400).json({ ok: false, error: 'Se requiere ancho_m o cant_paneles' });
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

    const listaPreciosNormalizada = lista_precios || 'venta';
    if (!['venta', 'web'].includes(listaPreciosNormalizada)) {
      return res.status(400).json({ ok: false, error: 'lista_precios invalida. Valores permitidos: venta, web' });
    }

    let envioNum;
    if (envio_usd !== undefined && envio_usd !== null && envio_usd !== '') {
      envioNum = Number(envio_usd);
      if (!Number.isFinite(envioNum) || envioNum < 0) {
        return res.status(400).json({ ok: false, error: 'envio_usd debe ser un numero finito >= 0' });
      }
    }

    const cotizacion = generarCotizacion({
      escenario, familia,
      espesor_mm: espesorNum,
      ancho_m: anchoNum,
      cant_paneles: cantPanelesNum,
      largo_m: largoNum,
      lista_precios: listaPreciosNormalizada,
      apoyos: apoyosNum,
      num_aberturas: aberturasNum,
      estructura: estructura || 'metal',
      tiene_cumbrera: Boolean(tiene_cumbrera),
      tiene_canalon: Boolean(tiene_canalon),
      envio_usd: envioNum,
    });

    cacheCotizacion(cotizacion);
    res.json({ ok: true, cotizacion });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/pdf
// Accepts EITHER:
//   1. { cotizacion_data, cliente } - full cotizacion object
//   2. { cotizacion_id, cliente }   - looks up from cache
//   3. { escenario, familia, espesor_mm, ..., cliente } - generates then PDF
router.post('/api/pdf', async (req, res) => {
  try {
    let cotizacion = null;
    const cliente = req.body.cliente || {};

    if (req.body.cotizacion_data) {
      cotizacion = req.body.cotizacion_data;
    } else if (req.body.cotizacion_id) {
      cotizacion = cotizacionCache.get(req.body.cotizacion_id);
      if (!cotizacion) {
        return res.status(404).json({
          ok: false,
          error: 'Cotizacion ' + req.body.cotizacion_id + ' no encontrada en cache. Regenera la cotizacion con POST /api/cotizar y luego pedi el PDF.',
        });
      }
    } else if (req.body.escenario && req.body.familia) {
      const b = req.body;
      cotizacion = generarCotizacion({
        escenario: b.escenario,
        familia: b.familia,
        espesor_mm: Number(b.espesor_mm),
        ancho_m: b.ancho_m != null ? Number(b.ancho_m) : null,
        cant_paneles: b.cant_paneles != null ? Number(b.cant_paneles) : null,
        largo_m: Number(b.largo_m),
        lista_precios: b.lista_precios || 'venta',
        apoyos: Number(b.apoyos || 0),
        num_aberturas: Number(b.num_aberturas || 0),
        estructura: b.estructura || 'metal',
        tiene_cumbrera: Boolean(b.tiene_cumbrera),
        tiene_canalon: Boolean(b.tiene_canalon),
        envio_usd: b.envio_usd != null ? Number(b.envio_usd) : undefined,
      });
      cacheCotizacion(cotizacion);
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Envia cotizacion_id, cotizacion_data, o los parametros de cotizacion (escenario, familia, espesor_mm, ancho_m o cant_paneles, largo_m).',
      });
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

module.exports = router;
