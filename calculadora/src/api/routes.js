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

/**
 * Parse a boolean value correctly, handling strings "false"/"0" as false.
 */
function parseBool(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    return lower !== '' && lower !== 'false' && lower !== '0';
  }
  return Boolean(val);
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

    // Reject ambiguous requests that send both ancho_m and cant_paneles
    if (anchoNum !== null && cantPanelesNum !== null) {
      return res.status(400).json({ ok: false, error: 'No se pueden enviar simultaneamente ancho_m y cant_paneles; use solo uno de los dos' });
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
      tiene_cumbrera: parseBool(tiene_cumbrera),
      tiene_canalon: parseBool(tiene_canalon),
      envio_usd: envioNum,
    });

    cacheCotizacion(cotizacion);
    res.json({ ok: true, cotizacion });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/cotizar-bmc
// Bridge to external Calculadora-BMC API
// Transforms internal parameters to Calculadora-BMC format and vice versa
router.post('/api/cotizar-bmc', async (req, res) => {
  try {
    const {
      escenario, familia, espesor_mm, ancho_m, largo_m,
      lista_precios = 'web',
      estructura = 'metal',
      tiene_canalon = false,
      tiene_cumbrera = false,
      envio_usd = 0,
    } = req.body;

    // Validate required fields
    if (!escenario) return res.status(400).json({ ok: false, error: 'Campo requerido: escenario' });
    if (!familia) return res.status(400).json({ ok: false, error: 'Campo requerido: familia' });
    if (!espesor_mm && espesor_mm !== 0) return res.status(400).json({ ok: false, error: 'Campo requerido: espesor_mm' });
    if (!largo_m && largo_m !== 0) return res.status(400).json({ ok: false, error: 'Campo requerido: largo_m' });

    // Map escenario to Calculadora-BMC format
    const scenarioMap = {
      'solo_techo': 'solo_techo',
      'solo_fachada': 'solo_fachada',
      'techo_fachada': 'techo_fachada',
      'camara_frigorifica': 'camara_frig',
    };

    const scenario = scenarioMap[escenario] || escenario;

    // Build Calculadora-BMC API payload
    const payload = {
      scenario,
      listaPrecios: lista_precios === 'venta' ? 'venta' : 'web',
    };

    // Add techo parameters if scenario includes techo
    if (['solo_techo', 'techo_fachada', 'camara_frig'].includes(escenario)) {
      payload.techo = {
        familia,
        espesor: Number(espesor_mm),
        color: 'Blanco',
        largo: Number(largo_m),
        ancho: Number(ancho_m) || 5.0,
        tipoEst: estructura,
        ptsHorm: 0,
        borders: {
          frente: tiene_cumbrera ? 'gotero_frontal' : 'none',
          fondo: 'gotero_frontal',
          latIzq: 'gotero_lateral',
          latDer: 'gotero_lateral',
        },
        opciones: {
          inclCanalon: parseBool(tiene_canalon),
          inclGotSup: false,
          inclSell: true,
        },
      };
    }

    // Add pared parameters if scenario includes pared
    if (['solo_fachada', 'techo_fachada', 'camara_frigorifica'].includes(escenario)) {
      payload.pared = {
        familia,
        espesor: Number(espesor_mm),
        color: 'Blanco',
        alto: 3.5,
        perimetro: Number(ancho_m) * 2 || 40,
        numEsqExt: 4,
        numEsqInt: 0,
        aberturas: [],
        tipoEst: estructura,
        inclSell: true,
        incl5852: false,
      };
    }

    // Add camara parameters if needed
    if (escenario === 'camara_frigorifica') {
      payload.camara = {
        largo_int: Number(largo_m),
        ancho_int: Number(ancho_m) || 5.0,
        alto_int: 3.0,
      };
    }

    if (envio_usd > 0) {
      payload.flete = Number(envio_usd);
    }

    // Call external Calculadora-BMC API
    const response = await fetch('https://calculadora-bmc.vercel.app/api/cotizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 30000,
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Calculadora-BMC API error: ${response.status} ${response.statusText}`,
      });
    }

    const bmc_data = await response.json();

    if (!bmc_data.success) {
      return res.status(400).json({
        ok: false,
        error: bmc_data.error || 'Calculadora-BMC API returned error',
      });
    }

    // Transform Calculadora-BMC response to internal format
    const cotizacion = {
      cotizacion_id: require('uuid').v4(),
      fuente: 'calculadora-bmc',
      escenario,
      familia,
      espesor_mm: Number(espesor_mm),
      largo_m: Number(largo_m),
      ancho_m: Number(ancho_m) || null,
      lista_precios,
      resumen: {
        subtotal_sin_iva: bmc_data.totals.subtotalSinIVA || 0,
        iva_22: bmc_data.totals.iva || 0,
        total_con_iva: bmc_data.totals.totalFinal || 0,
      },
      secciones: (bmc_data.bom || []).map((group) => ({
        tipo: group.title.toLowerCase(),
        items: (group.items || []).map((item) => ({
          sku: item.sku || 'N/A',
          nombre: item.label || item.nombre || '',
          cantidad: item.cant || 0,
          unit: item.unidad || 'm²',
          precio_unitario_sin_iva: item.pu || 0,
          subtotal_sin_iva: item.total || 0,
        })),
      })),
      warnings: bmc_data.results?.warnings || [],
    };

    cacheCotizacion(cotizacion);
    res.json({ ok: true, cotizacion });
  } catch (err) {
    console.error('Error calling Calculadora-BMC API:', err);
    res.status(500).json({ ok: false, error: err.message });
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

      // Validate required numeric fields before passing to engine
      const espesorNum = Number(b.espesor_mm);
      if (!b.espesor_mm && b.espesor_mm !== 0) {
        return res.status(400).json({ ok: false, error: 'Campo requerido: espesor_mm' });
      }
      if (!Number.isFinite(espesorNum) || espesorNum <= 0) {
        return res.status(400).json({ ok: false, error: 'espesor_mm debe ser un numero finito > 0' });
      }

      if (b.largo_m === undefined || b.largo_m === null || b.largo_m === '') {
        return res.status(400).json({ ok: false, error: 'Campo requerido: largo_m' });
      }
      const largoNum = Number(b.largo_m);
      if (!Number.isFinite(largoNum) || largoNum <= 0) {
        return res.status(400).json({ ok: false, error: 'largo_m debe ser un numero finito > 0' });
      }

      const hasAncho = b.ancho_m !== undefined && b.ancho_m !== null && b.ancho_m !== '';
      const hasCantP = b.cant_paneles !== undefined && b.cant_paneles !== null && b.cant_paneles !== '';
      if (!hasAncho && !hasCantP) {
        return res.status(400).json({ ok: false, error: 'Se requiere ancho_m o cant_paneles' });
      }

      cotizacion = generarCotizacion({
        escenario: b.escenario,
        familia: b.familia,
        espesor_mm: espesorNum,
        ancho_m: hasAncho ? Number(b.ancho_m) : null,
        cant_paneles: hasCantP ? Number(b.cant_paneles) : null,
        largo_m: largoNum,
        lista_precios: b.lista_precios || 'venta',
        apoyos: Number(b.apoyos || 0),
        num_aberturas: Number(b.num_aberturas || 0),
        estructura: b.estructura || 'metal',
        tiene_cumbrera: parseBool(b.tiene_cumbrera),
        tiene_canalon: parseBool(b.tiene_canalon),
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
