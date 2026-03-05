'use strict';

const express = require('express');
const { generarCotizacion } = require('../engines/bom');
const { tablaAutoportancia, validarAutoportancia } = require('../engines/autoportancia');
const { listFamilies } = require('../data/catalog');
const { generarPDF } = require('../pdf/generator');
const { getConfig, validateConfig, reloadConfig } = require('../data/config_loader');

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
  res.json({ status: 'ok', service: 'calculadora-bmc', version: '5.1.0' });
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
      lista_precios, apoyos,
      // aberturas: nuevo formato [{ancho, alto, cant}] o legacy num_aberturas
      aberturas, num_aberturas,
      // esquineros
      num_esq_ext, num_esq_int,
      // opciones pared
      incl_k2, incl_5852,
      // opciones techo
      estructura, tiene_cumbrera, tiene_canalon,
      tipo_gotero_frontal,
      // extras
      color, envio_usd,
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

    // aberturas: acepta array [{ancho, alto, cant}] o legacy num_aberturas
    let aberturasArr = [];
    let aberturasNum = 0;
    if (Array.isArray(aberturas) && aberturas.length > 0) {
      for (const ab of aberturas) {
        const ancho = Number(ab.ancho);
        const alto  = Number(ab.alto);
        const cant  = Number(ab.cant || 1);
        if (!Number.isFinite(ancho) || ancho < 0) return res.status(400).json({ ok: false, error: 'aberturas[].ancho debe ser un número >= 0' });
        if (!Number.isFinite(alto)  || alto  < 0) return res.status(400).json({ ok: false, error: 'aberturas[].alto debe ser un número >= 0' });
        aberturasArr.push({ ancho, alto, cant });
      }
    } else if (num_aberturas !== undefined && num_aberturas !== null && num_aberturas !== '') {
      aberturasNum = Number(num_aberturas);
      if (!Number.isFinite(aberturasNum) || aberturasNum < 0) {
        return res.status(400).json({ ok: false, error: 'num_aberturas debe ser un numero finito >= 0' });
      }
    }

    // esquineros
    const esqExtNum = (num_esq_ext !== undefined && num_esq_ext !== null) ? Math.max(0, Math.floor(Number(num_esq_ext))) : 0;
    const esqIntNum = (num_esq_int !== undefined && num_esq_int !== null) ? Math.max(0, Math.floor(Number(num_esq_int))) : 0;

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
      aberturas: aberturasArr,
      num_aberturas: aberturasNum,
      num_esq_ext: esqExtNum,
      num_esq_int: esqIntNum,
      incl_k2: incl_k2 !== undefined ? parseBool(incl_k2) : true,
      incl_5852: parseBool(incl_5852),
      estructura: estructura || 'metal',
      tiene_cumbrera: parseBool(tiene_cumbrera),
      tiene_canalon: parseBool(tiene_canalon),
      tipo_gotero_frontal: tipo_gotero_frontal || 'liso',
      color: color || undefined,
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/logica        → descarga logic_config.json completo (JSON)
// GET /api/logica/md     → versión Markdown imprimible (para copiar/imprimir)
// POST /api/logica       → sube config actualizado, recarga en caliente
// ─────────────────────────────────────────────────────────────────────────────

router.get('/api/logica', (_req, res) => {
  try {
    res.json({ ok: true, config: getConfig() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/api/logica/md', (_req, res) => {
  try {
    const cfg = getConfig();
    const fp  = cfg.formula_params;
    const lines = [];

    lines.push(`# Lógica de Cálculo — Calculadora BMC Panelin`);
    lines.push(`**Versión:** ${cfg._version}   **Actualizado:** ${cfg._actualizado}`);
    lines.push(`**IVA:** ${(cfg.iva_rate * 100).toFixed(0)}%`);
    lines.push('');

    // ── Parámetros de Fórmulas ────────────────────────────────────────────
    lines.push('---');
    lines.push('## Parámetros de Fórmulas');
    lines.push('');
    lines.push('### Techo');
    lines.push(`| Parámetro | Valor |`);
    lines.push(`|---|---|`);
    lines.push(`| Tornillos TMOME por m² | ${fp.techo.tornillos_por_m2_tmome} |`);
    lines.push(`| Silicona (cartuchos por panel) | ${fp.techo.silicona_cartuchos_por_panel} |`);
    lines.push(`| Cinta butilo — largo por rollo (m) | ${fp.techo.butilo_ml_por_rollo_m} |`);
    lines.push(`| Cumbrera — largo por pieza (m) | ${fp.techo.cumbrera_largo_pieza_m} |`);
    lines.push(`| Soporte canalón — intervalo (m) | ${fp.techo.soporte_canalon_intervalo_m} |`);
    lines.push('');
    lines.push('**Sistema caballete-tornillo (ISOROOF_*)**');
    lines.push(`\`caballetes = ceil(paneles × ${fp.techo.caballete.tramos_por_panel} × (largo / ${fp.techo.caballete.paso_apoyo_m} + 1) + (largo × 2 / ${fp.techo.caballete.intervalo_perimetro_m}))\``);
    lines.push('');
    lines.push('**Sistema varilla-tuerca (ISODEC_EPS / ISODEC_PIR)**');
    lines.push(`\`ptos_fijacion = ceil(paneles × apoyos × ${fp.techo.varilla_tuerca.laterales_por_punto} + largo × 2 / ${fp.techo.varilla_tuerca.intervalo_largo_m})\``);
    lines.push(`\`varillas = ceil(ptos × ${fp.techo.varilla_tuerca.varillas_por_punto})  |  apoyos mínimos default: ${fp.techo.varilla_tuerca.apoyos_minimos_default}\``);
    lines.push('');
    lines.push('### Pared / Fachada');
    lines.push(`| Parámetro | Valor |`);
    lines.push(`|---|---|`);
    lines.push(`| Tornillos TMOME por m² | ${fp.pared.tornillos_por_m2_tmome} |`);
    lines.push(`| Silicona — cobertura por cartucho (ml de junta) | ${fp.pared.silicona_ml_por_cartucho} |`);
    lines.push(`| Cinta butilo — largo por rollo (m) | ${fp.pared.butilo_ml_por_rollo_m} |`);
    lines.push(`| Anclaje H° — intervalo (m) | ${fp.pared.anclaje_intervalo_m} |`);
    lines.push(`| Perfil U — largo por pieza (m) | ${fp.pared.perfil_u_largo_pieza_m} |`);
    lines.push(`| K2 — largo por pieza (m) | ${fp.pared.k2_largo_pieza_m} |`);
    lines.push(`| Esquinero — largo por pieza (m) | ${fp.pared.esq_largo_pieza_m} |`);
    lines.push(`| Ángulo 5852 — largo por pieza (m) | ${fp.pared.angulo_5852_largo_pieza_m} |`);
    lines.push(`| Remaches POP por panel | ${fp.pared.remaches_por_panel} |`);
    lines.push(`| Remaches por caja | ${fp.pared.remaches_por_caja} |`);
    lines.push('');
    lines.push('**Fórmula silicona pared:**');
    lines.push(`\`ml_juntas = (paneles - 1) × alto + ancho × 2  →  cartuchos = ceil(ml_juntas / ${fp.pared.silicona_ml_por_cartucho})\``);
    lines.push('');

    // ── Largos mínimos y máximos ──────────────────────────────────────────
    lines.push('---');
    lines.push('## Largos Mínimos y Máximos por Familia (m)');
    lines.push('');
    lines.push('| Familia | Mínimo (m) | Máximo (m) |');
    lines.push('|---|---|---|');
    for (const [fam, lim] of Object.entries(cfg.panel_largos)) {
      if (fam.startsWith('_')) continue;
      lines.push(`| ${fam} | ${lim.lmin} | ${lim.lmax} |`);
    }
    lines.push('');

    // ── Restricciones de color ────────────────────────────────────────────
    lines.push('---');
    lines.push('## Restricciones de Color por Familia');
    lines.push('');
    for (const [fam, colores] of Object.entries(cfg.colores)) {
      if (fam.startsWith('_')) continue;
      const disponibles = Object.keys(colores).filter(c => !c.startsWith('_'));
      lines.push(`**${fam}:** ${disponibles.join(', ')}`);
      for (const [color, restr] of Object.entries(colores)) {
        if (restr.nota) lines.push(`  - *${color}*: ${restr.nota}`);
        if (restr.colMax_mm) lines.push(`  - *${color}*: máx. ${restr.colMax_mm}mm`);
        if (restr.minArea_m2) lines.push(`  - *${color}*: mínimo ${restr.minArea_m2} m²`);
      }
    }
    lines.push('');

    // ── Precios de Accesorios ─────────────────────────────────────────────
    lines.push('---');
    lines.push('## Precios de Accesorios (USD excl. IVA)');
    lines.push('*(Solo los hardcodeados en logic_config.json — los que vienen del catálogo CSV tienen sus propios precios)*');
    lines.push('');
    lines.push('| SKU | Descripción | Precio Venta | Precio Web | Unidad | Largo (m) |');
    lines.push('|---|---|---|---|---|---|');
    for (const [sku, acc] of Object.entries(cfg.accesorios)) {
      if (sku.startsWith('_')) continue;
      lines.push(`| \`${sku}\` | ${acc.nombre} | $${acc.precio_venta.toFixed(2)} | $${(acc.precio_web ?? acc.precio_venta).toFixed(2)} | ${acc.unidad} | ${acc.largo_m ?? '—'} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('*Para actualizar: editar este archivo o hacer POST /api/logica con el JSON modificado.*');

    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/api/logica', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'Body debe ser el JSON de logic_config completo' });
    }
    validateConfig(data);
    reloadConfig(data);
    res.json({
      ok: true,
      mensaje: 'Configuración actualizada y recargada en caliente.',
      version: data._version || '—',
      actualizado: data._actualizado,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
