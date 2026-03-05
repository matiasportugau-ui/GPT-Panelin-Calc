'use strict';

const request = require('supertest');
const app = require('../src/api/server');

describe('GET /health', () => {
  test('devuelve status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/productos', () => {
  test('devuelve catálogo de familias', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.catalogo)).toBe(true);
    expect(res.body.catalogo.length).toBeGreaterThan(0);
  });
});

describe('GET /api/autoportancia', () => {
  test('devuelve tabla completa sin parámetros', async () => {
    const res = await request(app).get('/api/autoportancia');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.tabla).toBeDefined();
  });

  test('valida luz para ISODEC_EPS 100mm', async () => {
    const res = await request(app).get('/api/autoportancia?familia=ISODEC_EPS&espesor=100&luz=4.0');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.valido).toBe(true);
    expect(res.body.luz_max).toBe(4.5);
  });

  test('alerta cuando luz supera máximo', async () => {
    const res = await request(app).get('/api/autoportancia?familia=ISODEC_EPS&espesor=100&luz=6.0');
    expect(res.status).toBe(200);
    expect(res.body.valido).toBe(false);
  });
});

describe('POST /api/cotizar', () => {
  test('cotización techo ISODEC EPS 100mm 5x11', async () => {
    const res = await request(app)
      .post('/api/cotizar')
      .send({
        escenario: 'solo_techo',
        familia: 'ISODEC_EPS',
        espesor_mm: 100,
        ancho_m: 5,
        largo_m: 11,
        lista_precios: 'venta',
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const cot = res.body.cotizacion;
    expect(cot.cotizacion_id).toBeDefined();
    expect(cot.resumen.total_con_iva).toBeGreaterThan(0);
    expect(cot.secciones).toHaveLength(1);
    expect(cot.secciones[0].tipo).toBe('techo');
  });

  test('cotización fachada ISOPANEL EPS 50mm 3x10', async () => {
    const res = await request(app)
      .post('/api/cotizar')
      .send({
        escenario: 'solo_fachada',
        familia: 'ISOPANEL_EPS',
        espesor_mm: 50,
        ancho_m: 3,
        largo_m: 10,
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.cotizacion.secciones[0].tipo).toBe('pared');
  });

  test('400 cuando falta campo requerido', async () => {
    const res = await request(app)
      .post('/api/cotizar')
      .send({ familia: 'ISODEC_EPS' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('cotización techo+fachada tiene 2 secciones', async () => {
    const res = await request(app)
      .post('/api/cotizar')
      .send({
        escenario: 'techo_fachada',
        familia: 'ISODEC_EPS',
        espesor_mm: 100,
        ancho_m: 5,
        largo_m: 11,
      });
    expect(res.status).toBe(200);
    expect(res.body.cotizacion.secciones).toHaveLength(2);
  });

  test('resumen incluye IVA 22%', async () => {
    const res = await request(app)
      .post('/api/cotizar')
      .send({
        escenario: 'solo_techo',
        familia: 'ISODEC_EPS',
        espesor_mm: 100,
        ancho_m: 5,
        largo_m: 11,
      });
    const r = res.body.cotizacion.resumen;
    expect(Math.abs(r.iva_22 - r.subtotal_sin_iva * 0.22)).toBeLessThan(0.05);
    expect(Math.abs(r.total_con_iva - (r.subtotal_sin_iva + r.iva_22))).toBeLessThan(0.05);
  });
});
