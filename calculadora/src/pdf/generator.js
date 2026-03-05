'use strict';

/**
 * Generador de PDF para cotizaciones BMC Uruguay.
 * Implementado para Node.js usando jsPDF.
 * En entorno serverless, devuelve un Buffer con el PDF en bytes.
 */

/**
 * Genera un PDF de cotización y devuelve el buffer.
 * @param {Object} cotizacion - Objeto cotización generado por bom.js
 * @param {Object} cliente    - { nombre, celular, direccion }
 * @returns {Buffer} Buffer del PDF generado
 */
async function generarPDF(cotizacion, cliente = {}) {
  // Dynamic import para compatibilidad ESM/CJS
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const margenIzq = 15;
  const margenDer = 195;
  let y = 20;

  // ─── Encabezado ───
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN - BMC URUGUAY', margenIzq, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`METALOG SAS | RUT 120403630012 | Maldonado, Uruguay`, margenIzq, y);
  y += 5;
  doc.text(`Web: https://bmcuruguay.com.uy`, margenIzq, y);
  y += 10;

  // ─── Datos cotización ───
  doc.setFont('helvetica', 'bold');
  doc.text(`Cotización N°: ${cotizacion.cotizacion_id}`, margenIzq, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${cotizacion.fecha}`, margenIzq, y);
  y += 5;
  if (cliente.nombre) doc.text(`Cliente: ${cliente.nombre}`, margenIzq, y), (y += 5);
  if (cliente.celular) doc.text(`Celular: ${cliente.celular}`, margenIzq, y), (y += 5);
  if (cliente.direccion) doc.text(`Dirección obra: ${cliente.direccion}`, margenIzq, y), (y += 5);
  y += 5;

  // ─── Detalles por sección ───
  for (const seccion of cotizacion.secciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `${seccion.tipo.toUpperCase().replace('_', ' ')} — ${seccion.familia} ${seccion.espesor_mm}mm`,
      margenIzq,
      y,
    );
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Encabezados tabla
    doc.text('Descripción', margenIzq, y);
    doc.text('Cant', 110, y, { align: 'right' });
    doc.text('Unidad', 130, y, { align: 'right' });
    doc.text('P.Unit', 158, y, { align: 'right' });
    doc.text('Subtotal', margenDer, y, { align: 'right' });
    y += 4;
    doc.line(margenIzq, y, margenDer, y);
    y += 4;

    for (const item of seccion.items) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(item.descripcion).substring(0, 45), margenIzq, y);
      doc.text(String(Math.round(item.cantidad * 100) / 100), 110, y, { align: 'right' });
      doc.text(String(item.unidad), 130, y, { align: 'right' });
      doc.text(`$${item.precio_unit.toFixed(2)}`, 158, y, { align: 'right' });
      doc.text(`$${item.subtotal.toFixed(2)}`, margenDer, y, { align: 'right' });
      y += 5;
    }

    doc.line(margenIzq, y, margenDer, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal ${seccion.tipo}: $${seccion.subtotal.toFixed(2)} USD`, margenDer, y, { align: 'right' });
    y += 10;
  }

  // ─── Resumen final ───
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.line(margenIzq, y, margenDer, y);
  y += 6;
  const r = cotizacion.resumen;
  doc.text(`Subtotal sin IVA: $${r.subtotal_sin_iva.toFixed(2)} USD`, margenDer, y, { align: 'right' });
  y += 5;
  doc.text(`IVA 22%:          $${r.iva_22.toFixed(2)} USD`, margenDer, y, { align: 'right' });
  y += 5;
  doc.text(`TOTAL:            $${r.total_con_iva.toFixed(2)} USD`, margenDer, y, { align: 'right' });
  y += 8;

  if (cotizacion.warnings && cotizacion.warnings.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('⚠ Advertencias:', margenIzq, y);
    y += 5;
    for (const w of cotizacion.warnings) {
      doc.text(`  • ${w}`, margenIzq, y);
      y += 4;
    }
    y += 3;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(cotizacion.nota, margenIzq, y);

  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = { generarPDF };
