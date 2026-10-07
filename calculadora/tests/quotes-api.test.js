'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/api/server');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');

function cleanStorage() {
  if (fs.existsSync(STORAGE_ROOT)) {
    fs.rmSync(STORAGE_ROOT, { recursive: true, force: true });
  }
}

describe('API Quotes (BMC-010/011/012/015)', () => {
  beforeEach(() => {
    cleanStorage();
  });

  test('POST /api/quotes/calculate devuelve cálculo estructurado', async () => {
    const res = await request(app).post('/api/quotes/calculate').send({
      client: { nombre: 'Joel Lima', telefono: '94411114' },
      technical_input: {
        escenario: 'solo_techo',
        familia: 'ISODEC_EPS',
        espesor_mm: 100,
        ancho_m: 5,
        largo_m: 11,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.calculation_result.subtotal).toBeGreaterThan(0);
    expect(Array.isArray(res.body.calculation_result.lineas)).toBe(true);
  });

  test('POST /api/quotes/issue emite versión V1 y expone links', async () => {
    const calc = await request(app).post('/api/quotes/calculate').send({
      client: { nombre: 'Joel Lima', telefono: '94411114' },
      technical_input: {
        escenario: 'solo_techo',
        familia: 'ISODEC_EPS',
        espesor_mm: 100,
        ancho_m: 5,
        largo_m: 11,
      },
    });

    const issue = await request(app).post('/api/quotes/issue').send({
      client: { nombre: 'Joel Lima', telefono: '94411114', direccion: 'Ruta 9' },
      calculation_result: calc.body.calculation_result,
      status_target: 'EMITIDA',
      issued_by: 'test-suite',
    });

    expect(issue.status).toBe(200);
    expect(issue.body.ok).toBe(true);
    expect(issue.body.quote_ref).toMatch(/^BMC-COT-20\d{2}-\d{4}$/);
    expect(issue.body.version).toBe(1);
    expect(issue.body.links.pdf_url).toContain('/api/quotes/');
    expect(issue.body.checks.pdf_immutable).toBe(true);
  });

  test('POST /api/quotes/issue crea V2 cuando se reemite quote_ref', async () => {
    const calc = await request(app).post('/api/quotes/calculate').send({
      client: { nombre: 'Pedro Gomez', telefono: '099043294' },
      technical_input: {
        escenario: 'solo_fachada',
        familia: 'ISOPANEL_EPS',
        espesor_mm: 100,
        ancho_m: 3,
        largo_m: 10,
      },
    });

    const v1 = await request(app).post('/api/quotes/issue').send({
      client: { nombre: 'Pedro Gomez', telefono: '099043294' },
      calculation_result: calc.body.calculation_result,
      status_target: 'ENVIADA',
      issued_by: 'test-suite',
    });
    expect(v1.status).toBe(200);
    expect(v1.body.version).toBe(1);

    const v2 = await request(app).post('/api/quotes/issue').send({
      quote_ref: v1.body.quote_ref,
      client: { nombre: 'Pedro Gomez', telefono: '099043294' },
      calculation_result: calc.body.calculation_result,
      status_target: 'AJUSTANDO',
      issued_by: 'test-suite',
    });

    expect(v2.status).toBe(200);
    expect(v2.body.version).toBe(2);
    expect(v2.body.quote_ref).toBe(v1.body.quote_ref);
  });

  test('PATCH /api/quotes/:id/status actualiza estado', async () => {
    const calc = await request(app).post('/api/quotes/calculate').send({
      client: { nombre: 'Carlos Delbono', telefono: '99906254' },
      technical_input: {
        escenario: 'solo_techo',
        familia: 'ISODEC_EPS',
        espesor_mm: 100,
        ancho_m: 5,
        largo_m: 11,
      },
    });

    const issue = await request(app).post('/api/quotes/issue').send({
      client: { nombre: 'Carlos Delbono', telefono: '99906254' },
      calculation_result: calc.body.calculation_result,
      status_target: 'ENVIADA',
      issued_by: 'test-suite',
    });

    const patched = await request(app)
      .patch(`/api/quotes/${issue.body.quote_id}/status`)
      .send({ status: 'EN_SEGUIMIENTO' });

    expect(patched.status).toBe(200);
    expect(patched.body.estado_cotizacion).toBe('EN_SEGUIMIENTO');
  });

  test('GET history + archivos de versión (pdf/payload)', async () => {
    const calc = await request(app).post('/api/quotes/calculate').send({
      client: { nombre: 'Thiago Felipe', telefono: '554197990617' },
      technical_input: {
        escenario: 'solo_techo',
        familia: 'ISOROOF_3G',
        espesor_mm: 50,
        ancho_m: 4,
        largo_m: 8,
      },
    });

    const issue = await request(app).post('/api/quotes/issue').send({
      client: { nombre: 'Thiago Felipe', telefono: '554197990617', direccion: 'Tacuarembo' },
      calculation_result: calc.body.calculation_result,
      status_target: 'EMITIDA',
      issued_by: 'test-suite',
    });

    const history = await request(app).get(`/api/clients/${issue.body.client_id}/history`);
    expect(history.status).toBe(200);
    expect(history.body.ok).toBe(true);
    expect(Array.isArray(history.body.quotes)).toBe(true);
    expect(history.body.quotes.length).toBeGreaterThan(0);

    const pdf = await request(app).get(
      `/api/quotes/${encodeURIComponent(issue.body.quote_ref)}/versions/1/pdf`
    );
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);

    const payload = await request(app).get(
      `/api/quotes/${encodeURIComponent(issue.body.quote_ref)}/versions/1/payload`
    );
    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    expect(payload.body.payload.quote_ref).toBe(issue.body.quote_ref);
  });
});
