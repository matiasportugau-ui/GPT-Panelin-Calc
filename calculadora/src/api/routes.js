'use strict';

const express = require('express');
const { generarCotizacion } = require('../engines/bom');
const { tablaAutoportancia, validarAutoportancia } = require('../engines/autoportancia');
const { catalogoFamilias } = require('../engines/precios');
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
  res.json({ status: 'ok', service: 'calculadora-bmc', version: '4.1.0' });
});

// GET /api/productos
router.get('/api/productos', (_req, res) => {
  try {
    const catalogo = catalogoFamilias();
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
      escenario, familia, espesor_mm, ancho_m, largo_m,
      lista_precios, apoyos, num_aberturas, estructura,
    } = req.body;

    if (!escenario) return res.status(400).json({ ok: false, error: 'Campo requerido: escenario' });
    if (!familia) return res.status(400).json({ ok: false, error: 'Campo requerido: familia' });
    if (espesor_mm === undefined || espesor_mm === null || espesor_mm === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: espesor_mm' });
    }
    if (ancho_m === undefined || ancho_m === null || ancho_m === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: ancho_m' });
    }
    if (largo_m === undefined || largo_m === null || largo_m === '') {
      return res.status(400).json({ ok: false, error: 'Campo requerido: largo_m' });
    }

    const espesorNum = Number(espesor_mm);
    const anchoNum = Number(ancho_m);
    const largoNum = Number(largo_m);

    if (!Number.isFinite(espesorNum) || espesorNum <= 0) {
      return res.status(400).json({ ok: false, error: 'espesor_mm debe ser un numero finito > 0' });
    }
    if (!Number.isFinite(anchoNum) || anchoNum <= 0) {
      return res.status(400).json({ ok: false, error: 'ancho_m debe ser un numero finito > 0' });
    }
    if (!Number.isFinite(largoNum) || largoNum <= 0) {
      return res.status(400).json({ ok: false, error: 'largo_m debe ser un numero finito > 0' });
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
    const listasValidas = ['venta', 'web'];
    if (!listasValidas.includes(listaPreciosNormalizada)) {
      return res.status(400).json({ ok: false, error: 'lista_precios invalida. Valores permitidos: venta, web' });
    }

    const cotizacion = generarCotizacion({
      escenario, familia,
      espesor_mm: espesorNum, ancho_m: anchoNum, largo_m: largoNum,
      lista_precios: listaPreciosNormalizada,
      apoyos: apoyosNum, num_aberturas: aberturasNum,
      estructura: estructura || 'metal',
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
//   2. { cotizacion_id, cliente } - looks up from cache
//   3. { escenario, familia, espesor_mm, ancho_m, largo_m, ..., cliente } - generates then PDF
router.post('/api/pdf', async (req, res) => {
  try {
    let cotizacion = null;
    const cliente = req.body.cliente || {};

    if (req.body.cotizacion_data) {
      cotizacion = req.body.cotizacion_data;
    }
    else if (req.body.cotizacion_id) {
      cotizacion = cotizacionCache.get(req.body.cotizacion_id);
      if (!cotizacion) {
        return res.status(404).json({ ok: false, error: 'Cotizacion ' + req.body.cotizacion_id + ' no encontrada en cache. Regenera la cotizacion con POST /api/cotizar y luego pedi el PDF.' });
      }
    }
    else if (req.body.escenario && req.body.familia) {
      cotizacion = generarCotizacion({
        escenario: req.body.escenario,
        familia: req.body.familia,
        espesor_mm: Number(req.body.espesor_mm),
        ancho_m: Number(req.body.ancho_m),
        largo_m: Number(req.body.largo_m),
        lista_precios: req.body.lista_precios || 'venta',
        apoyos: Number(req.body.apoyos || 0),
        num_aberturas: Number(req.body.num_aberturas || 0),
        estructura: req.body.estructura || 'metal',
      });
      cacheCotizacion(cotizacion);
    }
    else {
      return res.status(400).json({ ok: false, error: 'Envia cotizacion_id, cotizacion_data, o los parametros de cotizacion (escenario, familia, espesor_mm, ancho_m, largo_m).' });
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
