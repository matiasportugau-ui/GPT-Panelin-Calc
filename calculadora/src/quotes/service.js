'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { generarCotizacion } = require('../engines/bom');
const { generarPDF } = require('../pdf/generator');
const { loadStore, saveStore } = require('./store');

const QUOTES_STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage', 'quotes');
const STATUS_ALLOWED = new Set([
  'BORRADOR',
  'FALTA_INFORMACION',
  'CALCULADA',
  'EMITIDA',
  'ENVIADA',
  'EN_SEGUIMIENTO',
  'AJUSTANDO',
  'APROBADA',
  'RECHAZADA',
  'VENCIDA',
]);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || 'Cliente';
}

function nowIso() {
  return new Date().toISOString();
}

function toUpperStatus(status) {
  return String(status || '').trim().toUpperCase();
}

function normalizeScenario(raw) {
  const scenario = String(raw || '').trim();
  if (scenario === 'camara_frig') return 'camara_frigorifica';
  return scenario;
}

function flattenLines(cotizacion) {
  const lines = [];
  for (const section of cotizacion.secciones || []) {
    for (const item of section.items || []) {
      lines.push({
        tipo: section.tipo || 'producto',
        sku: item.sku || null,
        descripcion: item.descripcion || '',
        cantidad: item.cantidad || 0,
        unidad: item.unidad || '',
        precio_unitario: item.precio_unit || 0,
        importe: item.subtotal || 0,
      });
    }
  }
  return lines;
}

function normalizeCalculationResult(cotizacion) {
  return {
    subtotal: cotizacion.resumen.subtotal_sin_iva,
    iva_22: cotizacion.resumen.iva_22,
    total: cotizacion.resumen.total_con_iva,
    lineas: flattenLines(cotizacion),
    warnings: cotizacion.warnings || [],
    raw_cotizacion: cotizacion,
  };
}

function generateQuoteRef(store, year) {
  const current = Number(store.sequences[String(year)] || 0);
  const next = current + 1;
  store.sequences[String(year)] = next;
  return `BMC-COT-${year}-${String(next).padStart(4, '0')}`;
}

function nextVersionForQuote(quote) {
  if (!quote || !Array.isArray(quote.versions) || quote.versions.length === 0) {
    return 1;
  }
  return quote.versions.reduce((max, item) => Math.max(max, Number(item.version || 0)), 0) + 1;
}

function assertNoExistingVersion(quote, version) {
  if (!quote) return;
  const existing = (quote.versions || []).find((v) => Number(v.version) === Number(version));
  if (existing) {
    throw new Error(`La version V${version} ya existe para ${quote.quote_ref}.`);
  }
}

function resolveClient(store, client) {
  const normalized = {
    nombre: String(client?.nombre || '').trim(),
    telefono: String(client?.telefono || '').trim(),
    direccion: String(client?.direccion || '').trim(),
    origen_principal: String(client?.origen_principal || '').trim(),
  };
  if (!normalized.nombre) {
    throw new Error('client.nombre es requerido');
  }

  let found = null;
  if (client?.client_id) {
    found = store.clients.find((c) => c.client_id === client.client_id);
  }
  if (!found && normalized.telefono) {
    found = store.clients.find((c) => c.telefono && c.telefono === normalized.telefono);
  }
  if (!found) {
    found = store.clients.find((c) => c.nombre.toLowerCase() === normalized.nombre.toLowerCase());
  }

  if (found) {
    found.nombre = normalized.nombre;
    found.telefono = normalized.telefono || found.telefono;
    found.direccion = normalized.direccion || found.direccion;
    found.origen_principal = normalized.origen_principal || found.origen_principal;
    found.updated_at = nowIso();
    return found;
  }

  const clientRecord = {
    client_id: `cli_${uuidv4()}`,
    ...normalized,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.clients.push(clientRecord);
  return clientRecord;
}

function calculateFromInput(payload) {
  const technical = payload.technical_input || payload;
  const scenario = normalizeScenario(technical.escenario);
  const cotizacion = generarCotizacion({
    escenario: scenario,
    familia: technical.familia,
    espesor_mm: Number(technical.espesor_mm),
    ancho_m: technical.ancho_m != null ? Number(technical.ancho_m) : null,
    cant_paneles: technical.cant_paneles != null ? Number(technical.cant_paneles) : null,
    largo_m: Number(technical.largo_m),
    lista_precios: technical.lista_precios || 'venta',
    apoyos: Number(technical.apoyos || 0),
    num_aberturas: Number(technical.num_aberturas || 0),
    estructura: technical.estructura || 'metal',
    tiene_canalon: Boolean(technical.tiene_canalon),
    tiene_cumbrera: Boolean(technical.tiene_cumbrera),
    envio_usd: technical.envio_usd,
  });
  return normalizeCalculationResult(cotizacion);
}

async function issueQuote(payload) {
  const store = loadStore();
  ensureDir(QUOTES_STORAGE_ROOT);

  const client = resolveClient(store, payload.client || {});
  const requestedStatus = toUpperStatus(payload.status_target || 'EMITIDA');
  if (!STATUS_ALLOWED.has(requestedStatus)) {
    throw new Error('status_target invalido');
  }

  let calculationResult = payload.calculation_result || null;
  if (!calculationResult) {
    calculationResult = calculateFromInput(payload);
  }
  const cotizacionRaw = calculationResult.raw_cotizacion
    ? calculationResult.raw_cotizacion
    : generarCotizacion({
        escenario: normalizeScenario(payload.technical_input?.escenario || payload.escenario),
        familia: payload.technical_input?.familia || payload.familia,
        espesor_mm: Number(payload.technical_input?.espesor_mm || payload.espesor_mm),
        ancho_m: payload.technical_input?.ancho_m != null ? Number(payload.technical_input.ancho_m) : (payload.ancho_m != null ? Number(payload.ancho_m) : null),
        cant_paneles: payload.technical_input?.cant_paneles != null ? Number(payload.technical_input.cant_paneles) : (payload.cant_paneles != null ? Number(payload.cant_paneles) : null),
        largo_m: Number(payload.technical_input?.largo_m || payload.largo_m),
        lista_precios: payload.technical_input?.lista_precios || payload.lista_precios || 'venta',
      });

  const year = new Date().getFullYear();
  let quote = null;
  if (payload.quote_ref) {
    quote = store.quotes.find((q) => q.quote_ref === payload.quote_ref);
    if (!quote) {
      throw new Error(`quote_ref no encontrado: ${payload.quote_ref}`);
    }
  }

  const quoteRef = quote ? quote.quote_ref : generateQuoteRef(store, year);
  const version = Number(payload.version || nextVersionForQuote(quote));
  assertNoExistingVersion(quote, version);

  const versionTag = `${quoteRef}-V${version}`;
  const folderName = `${quoteRef}_${slugify(client.nombre)}`;
  const quoteFolder = path.join(QUOTES_STORAGE_ROOT, String(year), folderName);
  ensureDir(quoteFolder);

  const pdfFileName = `${versionTag}_${slugify(client.nombre)}.pdf`;
  const payloadFileName = `${versionTag}_payload.json`;
  const pdfPath = path.join(quoteFolder, pdfFileName);
  const payloadPath = path.join(quoteFolder, payloadFileName);

  if (fs.existsSync(pdfPath) || fs.existsSync(payloadPath)) {
    throw new Error(`Ya existen artefactos para ${versionTag}. No se permite sobreescritura.`);
  }

  const pdfBuffer = await generarPDF(cotizacionRaw, {
    nombre: client.nombre,
    celular: client.telefono,
    direccion: client.direccion,
  });
  fs.writeFileSync(pdfPath, pdfBuffer);
  fs.writeFileSync(
    payloadPath,
    JSON.stringify(
      {
        quote_ref: quoteRef,
        version,
        issued_by: payload.issued_by || 'system',
        client,
        calculation_result: {
          subtotal: calculationResult.subtotal,
          iva_22: calculationResult.iva_22,
          total: calculationResult.total,
          lineas: calculationResult.lineas || [],
          warnings: calculationResult.warnings || [],
        },
      },
      null,
      2
    ),
    'utf8'
  );

  if (!quote) {
    quote = {
      quote_id: `qte_${uuidv4()}`,
      quote_ref: quoteRef,
      client_id: client.client_id,
      estado_cotizacion: requestedStatus,
      versions: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.quotes.push(quote);
  }

  const versionRecord = {
    version,
    estado_cotizacion: requestedStatus,
    subtotal: Number(calculationResult.subtotal || 0),
    iva_22: Number(calculationResult.iva_22 || 0),
    total: Number(calculationResult.total || 0),
    pdf_path: pdfPath,
    payload_path: payloadPath,
    issued_at: nowIso(),
    sent_at: requestedStatus === 'ENVIADA' ? nowIso() : null,
    warnings: calculationResult.warnings || [],
  };

  quote.estado_cotizacion = requestedStatus;
  quote.updated_at = nowIso();
  quote.latest_version = version;
  quote.versions.push(versionRecord);
  saveStore(store);

  return {
    quote_id: quote.quote_id,
    quote_ref: quoteRef,
    client_id: client.client_id,
    version,
    estado_cotizacion: requestedStatus,
    subtotal: versionRecord.subtotal,
    iva_22: versionRecord.iva_22,
    total: versionRecord.total,
    links: {
      editable_url: payload.links?.editable_url || null,
      pdf_url: `/api/quotes/${encodeURIComponent(quoteRef)}/versions/${version}/pdf`,
      folder_url: `/api/quotes/${encodeURIComponent(quoteRef)}/folder`,
      payload_url: `/api/quotes/${encodeURIComponent(quoteRef)}/versions/${version}/payload`,
    },
    timestamps: {
      issued_at: versionRecord.issued_at,
      updated_at: quote.updated_at,
    },
    checks: { pdf_immutable: true },
  };
}

function patchQuoteStatus(quoteId, status) {
  const store = loadStore();
  const nextStatus = toUpperStatus(status);
  if (!STATUS_ALLOWED.has(nextStatus)) {
    throw new Error('status invalido');
  }
  const quote = store.quotes.find((q) => q.quote_id === quoteId);
  if (!quote) {
    throw new Error('quote_id no encontrado');
  }
  quote.estado_cotizacion = nextStatus;
  quote.updated_at = nowIso();
  if (Array.isArray(quote.versions) && quote.versions.length > 0) {
    const latest = quote.versions.reduce((acc, item) => (item.version > acc.version ? item : acc));
    latest.estado_cotizacion = nextStatus;
    if (nextStatus === 'ENVIADA' && !latest.sent_at) latest.sent_at = nowIso();
  }
  saveStore(store);
  return quote;
}

function getClientHistory(clientId) {
  const store = loadStore();
  const client = store.clients.find((c) => c.client_id === clientId);
  if (!client) return null;
  const quotes = store.quotes
    .filter((q) => q.client_id === clientId)
    .map((q) => ({
      quote_id: q.quote_id,
      quote_ref: q.quote_ref,
      estado_cotizacion: q.estado_cotizacion,
      latest_version: q.latest_version || null,
      versions: (q.versions || []).map((v) => ({
        version: v.version,
        estado_cotizacion: v.estado_cotizacion,
        subtotal: v.subtotal,
        iva_22: v.iva_22,
        total: v.total,
        issued_at: v.issued_at,
      })),
      updated_at: q.updated_at,
    }))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  return { client, quotes };
}

function getQuoteVersionFile(quoteRef, version, kind) {
  const store = loadStore();
  const quote = store.quotes.find((q) => q.quote_ref === quoteRef);
  if (!quote) return null;
  const versionRecord = (quote.versions || []).find((v) => Number(v.version) === Number(version));
  if (!versionRecord) return null;
  if (kind === 'pdf') return versionRecord.pdf_path;
  if (kind === 'payload') return versionRecord.payload_path;
  return null;
}

function getQuoteFolderPath(quoteRef) {
  const store = loadStore();
  const quote = store.quotes.find((q) => q.quote_ref === quoteRef);
  if (!quote || !Array.isArray(quote.versions) || quote.versions.length === 0) {
    return null;
  }
  const anyVersion = quote.versions[0];
  return path.dirname(anyVersion.pdf_path);
}

module.exports = {
  calculateFromInput,
  issueQuote,
  patchQuoteStatus,
  getClientHistory,
  getQuoteVersionFile,
  getQuoteFolderPath,
};
