'use strict';

const express = require('express');
const { generarCotizacion } = require('../engines/bom');
const { tablaAutoportancia, validarAutoportancia } = require('../engines/autoportancia');
const { catalogoFamilias } = require('../engines/precios');
const { generarPDF } = require('../pdf/generator');

const router = express.Router();

// GET /health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'calculadora-bmc', version: '4.0.0' });
});

// GET /api/productos — catálogo de familias disponibles
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
    // Sin parámetros: devolver tabla completa
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
      escenario,
      familia,
      espesor_mm,
      ancho_m,
      largo_m,
      lista_precios,
      apoyos,
      num_aberturas,
      estructura,
    } = req.body;

    // Validaciones mínimas de presencia
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

    // Normalización y validación de numéricos
    const espesorNum = Number(espesor_mm);
    const anchoNum = Number(ancho_m);
    const largoNum = Number(largo_m);

    if (!Number.isFinite(espesorNum) || espesorNum <= 0) {
      return res.status(400).json({ ok: false, error: 'espesor_mm debe ser un número finito > 0' });
    }
    if (!Number.isFinite(anchoNum) || anchoNum <= 0) {
      return res.status(400).json({ ok: false, error: 'ancho_m debe ser un número finito > 0' });
    }
    if (!Number.isFinite(largoNum) || largoNum <= 0) {
      return res.status(400).json({ ok: false, error: 'largo_m debe ser un número finito > 0' });
    }

    let apoyosNum = 0;
    if (apoyos !== undefined && apoyos !== null && apoyos !== '') {
      apoyosNum = Number(apoyos);
      if (!Number.isFinite(apoyosNum) || apoyosNum < 0) {
        return res.status(400).json({ ok: false, error: 'apoyos debe ser un número finito >= 0 cuando se especifica' });
      }
    }

    let aberturasNum = 0;
    if (num_aberturas !== undefined && num_aberturas !== null && num_aberturas !== '') {
      aberturasNum = Number(num_aberturas);
      if (!Number.isFinite(aberturasNum) || aberturasNum < 0) {
        return res.status(400).json({ ok: false, error: 'num_aberturas debe ser un número finito >= 0 cuando se especifica' });
      }
    }

    // Validación de lista de precios
    const listaPreciosNormalizada = lista_precios || 'venta';
    const listasValidas = ['venta', 'web'];
    if (!listasValidas.includes(listaPreciosNormalizada)) {
      return res.status(400).json({ ok: false, error: 'lista_precios inválida. Valores permitidos: venta, web' });
    }

    const cotizacion = generarCotizacion({
      escenario,
      familia,
      espesor_mm: espesorNum,
      ancho_m: anchoNum,
      largo_m: largoNum,
      lista_precios: listaPreciosNormalizada,
      apoyos: apoyosNum,
      num_aberturas: aberturasNum,
      estructura: estructura || 'metal',
    });

    res.json({ ok: true, cotizacion });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/pdf
router.post('/api/pdf', async (req, res) => {
  try {
    const { cotizacion_data, cliente } = req.body;
    if (!cotizacion_data) return res.status(400).json({ ok: false, error: 'Campo requerido: cotizacion_data' });

    const pdfBuffer = await generarPDF(cotizacion_data, cliente || {});
    const filename = `cotizacion-bmc-${cotizacion_data.cotizacion_id || 'draft'}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
