'use strict';

const libre = require('libreoffice-convert');
const path = require('path');

/**
 * Converts a DOCX buffer to PDF using LibreOffice.
 * @param {Buffer} docxBuffer - The DOCX file content as a Buffer
 * @param {string} [outputFormat='.pdf'] - Target format extension
 * @returns {Promise<Buffer>} PDF file as Buffer
 */
async function convertDocxToPdf(docxBuffer, outputFormat = '.pdf') {
  if (!Buffer.isBuffer(docxBuffer) || docxBuffer.length === 0) {
    throw new Error('Se requiere un Buffer DOCX válido y no vacío.');
  }

  // Validate DOCX magic bytes (DOCX is a ZIP file starting with PK\x03\x04)
  if (docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B ||
      docxBuffer[2] !== 0x03 || docxBuffer[3] !== 0x04) {
    const err = new Error('El archivo no es un DOCX válido.');
    err.code = 'INVALID_DOCX';
    throw err;
  }

  try {
    const pdfBuffer = await libre.convert(docxBuffer, outputFormat, undefined);
    return pdfBuffer;
  } catch (err) {
    throw new Error('Error al convertir DOCX a PDF', { cause: err });
  }
}

/**
 * Sanitizes a filename base to make it safe for use in headers and file systems.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilenameBase(name) {
  if (typeof name !== 'string') return '';
  let cleaned = name.replace(/[\x00-\x1F\x7F]/g, '');
  cleaned = cleaned.replace(/[\\\/"'<>|:?*]/g, '_');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Derives a PDF filename from the original DOCX filename.
 * @param {string} originalName - e.g. "BMC-COT-2026-0001.docx"
 * @returns {string} e.g. "BMC-COT-2026-0001.pdf"
 */
function derivePdfFilename(originalName) {
  let base = '';
  if (typeof originalName === 'string' && originalName.trim() !== '') {
    const ext = path.extname(originalName);
    base = path.basename(originalName, ext);
  }
  base = sanitizeFilenameBase(base);
  if (!base) {
    base = 'converted';
  }
  return `${base}.pdf`;
}

module.exports = { convertDocxToPdf, derivePdfFilename };
