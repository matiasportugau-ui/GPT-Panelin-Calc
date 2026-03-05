'use strict';

const { calcTechoCompleto } = require('../src/engines/techo');

describe('calcTechoCompleto — ISODEC EPS 100mm 5x11m', () => {
  let result;

  beforeAll(() => {
    result = calcTechoCompleto({
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 5,
      largo_m: 11,
      apoyos: 0,
      tiene_canalon: true,
      lista_precios: 'venta',
    });
  });

  test('devuelve tipo techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('cantidad de paneles es ceil(5 / 1.12) = 5', () => {
    expect(result.cant_paneles).toBe(Math.ceil(5 / 1.12));
  });

  test('subtotal es mayor a 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('items tienen SKUs reales del catalogo', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('ISDEC100EPS');
    expect(skus).toContain('6838');   // Gotero Frontal ISODEC 100mm
    expect(skus).toContain('6842');   // Gotero Lateral ISODEC 100mm
    expect(skus).toContain('GSDECAM50'); // Gotero Superior
    expect(skus).toContain('6801');   // Canalon 100mm
    expect(skus).toContain('6805');   // Soporte canalon
    expect(skus).toContain('TMOME');  // Tornillo
    expect(skus).toContain('ARATRAP'); // Arandela
    expect(skus).toContain('C.But.'); // Cinta butilo
    expect(skus).toContain('Bromplast'); // Silicona
  });

  test('area_m2 es correcto', () => {
    const cantP = Math.ceil(5 / 1.12);
    const expected = Math.round(cantP * 1.12 * 11 * 100) / 100;
    expect(result.area_m2).toBe(expected);
  });
});

describe('calcTechoCompleto — ISOROOF 3G 50mm 4x8m', () => {
  let result;

  beforeAll(() => {
    result = calcTechoCompleto({
      familia: 'ISOROOF_3G',
      espesor_mm: 50,
      ancho_m: 4,
      largo_m: 8,
      apoyos: 0,
      tiene_canalon: true,
      lista_precios: 'web',
    });
  });

  test('devuelve tipo techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('items incluye gotero frontal GFS50 para ISOROOF 50mm', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('GFS50');
  });

  test('items incluye gotero lateral GL50 para ISOROOF 50mm', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('GL50');
  });

  test('items incluye canalon CD50 para ISOROOF 50mm', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('CD50');
  });
});

describe('calcTechoCompleto — input por cant_paneles', () => {
  test('calcula ancho correctamente desde cant_paneles', () => {
    const result = calcTechoCompleto({
      familia: 'ISOROOF_3G',
      espesor_mm: 50,
      cant_paneles: 10,
      largo_m: 4.5,
      lista_precios: 'venta',
    });
    expect(result.cant_paneles).toBe(10);
    expect(result.ancho_m).toBe(11); // 10 * 1.10
    expect(result.subtotal).toBeGreaterThan(0);
  });
});

describe('calcTechoCompleto — cumbrera y canalon opcionales', () => {
  test('con cumbrera incluye SKU CUMROOF3M', () => {
    const result = calcTechoCompleto({
      familia: 'ISOROOF_3G',
      espesor_mm: 50,
      ancho_m: 5,
      largo_m: 8,
      tiene_cumbrera: true,
      tiene_canalon: false,
    });
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('CUMROOF3M');
    expect(skus).not.toContain('CD50');
  });

  test('sin canalon no incluye canalon ni soporte', () => {
    const result = calcTechoCompleto({
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 5,
      largo_m: 11,
      tiene_canalon: false,
    });
    const skus = result.items.map(i => i.sku);
    expect(skus).not.toContain('6801');
    expect(skus).not.toContain('6805');
  });
});
