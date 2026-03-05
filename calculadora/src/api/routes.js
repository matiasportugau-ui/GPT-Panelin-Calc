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

    // Validaciones mínimas
    if (!escenario) return res.status(400).json({ ok: false, error: 'Campo requerido: escenario' });
    if (!familia) return res.status(400).json({ ok: false, error: 'Campo requerido: familia' });
    if (!espesor_mm) return res.status(400).json({ ok: false, error: 'Campo requerido: espesor_mm' });
    if (!ancho_m) return res.status(400).json({ ok: false, error: 'Campo requerido: ancho_m' });
    if (!largo_m) return res.status(400).json({ ok: false, error: 'Campo requerido: largo_m' });

    const cotizacion = generarCotizacion({
      escenario,
      familia,
      espesor_mm: Number(espesor_mm),
      ancho_m: Number(ancho_m),
      largo_m: Number(largo_m),
      lista_precios: lista_precios || 'venta',
      apoyos: apoyos ? Number(apoyos) : 0,
      num_aberturas: num_aberturas ? Number(num_aberturas) : 0,
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
