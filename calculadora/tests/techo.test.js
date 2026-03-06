'use strict';

const { calcTechoCompleto } = require('../src/engines/techo');

describe('calcTechoCompleto — ISODEC EPS 100mm 5×11m', () => {
  let result;

  beforeAll(() => {
    result = calcTechoCompleto({
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 5,
      largo_m: 11,
      lista_precios: 'venta',
    });
  });

  test('tipo es techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('cant_paneles = ceil(5 / 1.12) = 5', () => {
    expect(result.cant_paneles).toBe(Math.ceil(5 / 1.12));
  });

  test('subtotal > 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('items tienen campo sku real', () => {
    for (const item of result.items) {
      expect(item.sku).toBeDefined();
      expect(typeof item.sku).toBe('string');
    }
  });

  test('panel item usa SKU ISODEC_EPS_100MM', () => {
    const panel = result.items.find(i => i.unidad === 'panel');
    expect(panel).toBeDefined();
    expect(panel.sku).toBe('ISODEC_EPS_100MM');
  });

  test('gotero frontal usa SKU 6838', () => {
    const gf = result.items.find(i => i.sku === '6838');
    expect(gf).toBeDefined();
    expect(gf.cantidad).toBeGreaterThan(0);
  });

  test('gotero lateral usa SKU 6842', () => {
    const gl = result.items.find(i => i.sku === '6842');
    expect(gl).toBeDefined();
    expect(gl.cantidad).toBeGreaterThan(0);
  });

  test('fijaciones sistema Varilla Roscada presente (no TMOME)', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('VR1M38');
    expect(skus).not.toContain('TMOME');
    expect(skus).not.toContain('ARATRAP');
  });

  test('sin canalón por defecto', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).not.toContain('6801');
  });

  test('area_m2 correcto', () => {
    const cantP = Math.ceil(5 / 1.12);
    const expected = Math.round(cantP * 1.12 * 11 * 100) / 100;
    expect(result.area_m2).toBe(expected);
  });
});

describe('calcTechoCompleto — ISODEC EPS 100mm con canalón', () => {
  test('incluye canalón 6801 y soporte 6805 cuando tiene_canalon=true', () => {
    const result = calcTechoCompleto({
      familia: 'ISODEC_EPS', espesor_mm: 100, ancho_m: 5, largo_m: 11,
      tiene_canalon: true,
    });
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('6801');
    expect(skus).toContain('6805');
  });
});

describe('calcTechoCompleto — ISOROOF 3G 50mm 4×8m', () => {
  let result;

  beforeAll(() => {
    result = calcTechoCompleto({
      familia: 'ISOROOF_3G',
      espesor_mm: 50,
      ancho_m: 4,
      largo_m: 8,
      lista_precios: 'web',
    });
  });

  test('tipo es techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('panel SKU es IROOF50', () => {
    const panel = result.items.find(i => i.unidad === 'panel');
    expect(panel.sku).toBe('IROOF50');
  });

  test('gotero frontal GFS50 presente', () => {
    expect(result.items.find(i => i.sku === 'GFS50')).toBeDefined();
  });

  test('gotero lateral GL50 presente', () => {
    expect(result.items.find(i => i.sku === 'GL50')).toBeDefined();
  });

  test('fijaciones usan Cab. Roj (no TMOME)', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('Cab. Roj');
    expect(skus).not.toContain('TMOME');
  });

  test('sin cumbrera por defecto', () => {
    expect(result.items.find(i => i.sku === 'CUMROOF3M')).toBeUndefined();
  });
});

describe('calcTechoCompleto — ISOROOF con cumbrera', () => {
  test('incluye CUMROOF3M cuando tiene_cumbrera=true', () => {
    const result = calcTechoCompleto({
      familia: 'ISOROOF_3G', espesor_mm: 50, ancho_m: 4, largo_m: 8,
      tiene_cumbrera: true,
    });
    expect(result.items.find(i => i.sku === 'CUMROOF3M')).toBeDefined();
  });
});

describe('calcTechoCompleto — input por cant_paneles', () => {
  test('cant_paneles=10 ISOROOF_3G 50mm largo=4.5 funciona', () => {
    const result = calcTechoCompleto({
      familia: 'ISOROOF_3G', espesor_mm: 50, cant_paneles: 10, largo_m: 4.5,
    });
    expect(result.tipo).toBe('techo');
    expect(result.cant_paneles).toBe(10);
    expect(result.ancho_m).toBeCloseTo(10 * 1.00, 2);
    expect(result.subtotal).toBeGreaterThan(0);
  });
});
