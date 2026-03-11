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

  const pdfBuffer = await libre.convert(docxBuffer, outputFormat, undefined);
  return pdfBuffer;
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
