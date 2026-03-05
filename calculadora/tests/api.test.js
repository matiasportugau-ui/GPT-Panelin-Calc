'use strict';

const request = require('supertest');
const app = require('../src/api/server');

describe('GET /health', () => {
  test('devuelve status ok v5', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('5.0.0');
  });
});

describe('GET /api/productos', () => {
  test('devuelve catálogo con familias reales', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.catalogo)).toBe(true);
    expect(res.body.catalogo.length).toBeGreaterThan(0);
    const familias = res.body.catalogo.map(f => f.familia);
    expect(familias).toContain('ISOROOF_3G');
    expect(familias).toContain('ISODEC_EPS');
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
  });

  test('alerta cuando luz supera máximo', async () => {
    const res = await request(app).get('/api/autoportancia?familia=ISODEC_EPS&espesor=100&luz=6.0');
    expect(res.status).toBe(200);
    expect(res.body.valido).toBe(false);
  });
});

describe('POST /api/cotizar — básicos', () => {
  test('cotización techo ISODEC EPS 100mm 5×11', async () => {
    const res = await request(app).post('/api/cotizar').send({
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
    // Items deben tener SKUs reales
    const skus = cot.secciones[0].items.map(i => i.sku);
    expect(skus).toContain('ISODEC_EPS_100MM');
    expect(skus).toContain('6838');
    expect(skus).toContain('6842');
  });

  test('cotización fachada ISOPANEL EPS 100mm 3×10', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_fachada',
      familia: 'ISOPANEL_EPS',
      espesor_mm: 100,
      ancho_m: 3,
      largo_m: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.cotizacion.secciones[0].tipo).toBe('pared');
    const skus = res.body.cotizacion.secciones[0].items.map(i => i.sku);
    expect(skus).toContain('ISD100EPS');
    expect(skus).toContain('PU100MM');
  });

  test('400 cuando falta escenario', async () => {
    const res = await request(app).post('/api/cotizar').send({ familia: 'ISODEC_EPS' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('400 cuando falta ancho_m y cant_paneles', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100, largo_m: 11,
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('cotización techo+fachada tiene 2 secciones', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'techo_fachada',
      familia: 'ISODEC_EPS', espesor_mm: 100, ancho_m: 5, largo_m: 11,
    });
    expect(res.status).toBe(200);
    expect(res.body.cotizacion.secciones).toHaveLength(2);
  });

  test('cámara frigorífica tiene 3 secciones', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'camara_frigorifica',
      familia: 'ISOFRIG_PIR', espesor_mm: 80, ancho_m: 4, largo_m: 6,
    });
    expect(res.status).toBe(200);
    expect(res.body.cotizacion.secciones).toHaveLength(3);
  });

  test('resumen incluye IVA 22%', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100, ancho_m: 5, largo_m: 11,
    });
    const r = res.body.cotizacion.resumen;
    expect(Math.abs(r.iva_22 - r.subtotal_sin_iva * 0.22)).toBeLessThan(0.05);
    expect(Math.abs(r.total_con_iva - (r.subtotal_sin_iva + r.iva_22))).toBeLessThan(0.05);
  });

  test('400 cuando ancho_m es no numérico', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100,
      ancho_m: 'abc', largo_m: 11,
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('400 cuando lista_precios es inválida', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100,
      ancho_m: 5, largo_m: 11, lista_precios: 'foo',
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('POST /api/cotizar — nuevos params v5', () => {
  test('input por cant_paneles funciona', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo',
      familia: 'ISOROOF_3G', espesor_mm: 50,
      cant_paneles: 10, largo_m: 4.5,
    });
    expect(res.status).toBe(200);
    expect(res.body.cotizacion.secciones[0].cant_paneles).toBe(10);
  });

  test('tiene_canalon=true agrega canalón al BOM', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo',
      familia: 'ISODEC_EPS', espesor_mm: 100, ancho_m: 5, largo_m: 11,
      tiene_canalon: true,
    });
    expect(res.status).toBe(200);
    const skus = res.body.cotizacion.secciones[0].items.map(i => i.sku);
    expect(skus).toContain('6801');
  });

  test('tiene_cumbrera=true agrega cumbrera al BOM', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo',
      familia: 'ISOROOF_3G', espesor_mm: 50, ancho_m: 4, largo_m: 8,
      tiene_cumbrera: true,
    });
    expect(res.status).toBe(200);
    const skus = res.body.cotizacion.secciones[0].items.map(i => i.sku);
    expect(skus).toContain('CUMROOF3M');
  });

  test('envio NO aparece por defecto', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100,
      ancho_m: 5, largo_m: 11,
    });
    expect(res.status).toBe(200);
    expect(res.body.cotizacion.envio_usd).toBeUndefined();
    expect(res.body.cotizacion.envio_referencia_usd).toBeUndefined();
  });

  test('envio SÍ aparece cuando se pasa envio_usd=300', async () => {
    const res = await request(app).post('/api/cotizar').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100,
      ancho_m: 5, largo_m: 11, envio_usd: 300,
    });
    expect(res.status).toBe(200);
    expect(res.body.cotizacion.envio_usd).toBe(300);
  });
});

describe('POST /api/pdf', () => {
  const cotizacionData = {
    cotizacion_id: 'test-uuid-v5',
    fecha: '2026-03-05',
    escenario: 'solo_techo',
    familia: 'ISODEC_EPS',
    espesor_mm: 100,
    lista_precios: 'venta',
    secciones: [{
      tipo: 'techo',
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 5.6,
      largo_m: 11,
      area_m2: 61.6,
      cant_paneles: 5,
      items: [
        { sku: 'ISODEC_EPS_100MM', descripcion: 'ISODEC EPS 100mm', cantidad: 5, unidad: 'panel', precio_unit: 506.77, subtotal: 2533.85 },
        { sku: '6838', descripcion: 'Perf. Ch. Gotero Frontal 100mm', cantidad: 2, unidad: 'unidad', precio_unit: 15.67, subtotal: 31.34 },
      ],
      subtotal: 2565.19,
    }],
    resumen: { subtotal_sin_iva: 2565.19, iva_22: 564.34, total_con_iva: 3129.53, moneda: 'USD' },
    warnings: [],
    nota: 'Precios sin IVA.',
  };

  test('genera PDF con status 200 y Content-Type application/pdf', async () => {
    const res = await request(app).post('/api/pdf')
      .send({ cotizacion_data: cotizacionData, cliente: { nombre: 'Test Cliente' } });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(parseInt(res.headers['content-length'])).toBeGreaterThan(0);
  });

  test('genera PDF directo con params de cotización', async () => {
    const res = await request(app).post('/api/pdf').send({
      escenario: 'solo_techo', familia: 'ISODEC_EPS', espesor_mm: 100,
      ancho_m: 5, largo_m: 11,
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test('400 cuando falta cotizacion_data y params', async () => {
    const res = await request(app).post('/api/pdf').send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
