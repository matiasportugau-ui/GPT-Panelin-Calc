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
    throw new Error('El archivo no es un DOCX válido.');
  }

  try {
    const pdfBuffer = await libre.convert(docxBuffer, outputFormat, undefined);
    return pdfBuffer;
  } catch (err) {
    throw new Error('Error al convertir DOCX a PDF: ' + err.message);
  }
}

/**
 * Derives a PDF filename from the original DOCX filename.
 * @param {string} originalName - e.g. "BMC-COT-2026-0001.docx"
 * @returns {string} e.g. "BMC-COT-2026-0001.pdf"
 */
function derivePdfFilename(originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  return `${base}.pdf`;
}

module.exports = { convertDocxToPdf, derivePdfFilename };
