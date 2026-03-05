'use strict';

const { calcParedCompleto } = require('../src/engines/pared');

describe('calcParedCompleto — ISOPANEL EPS 100mm 5x3m', () => {
  let result;

  beforeAll(() => {
    result = calcParedCompleto({
      familia: 'ISOPANEL_EPS',
      espesor_mm: 100,
      ancho_m: 5,
      largo_m: 3,
      num_aberturas: 0,
      estructura: 'metal',
      lista_precios: 'venta',
    });
  });

  test('devuelve tipo pared', () => {
    expect(result.tipo).toBe('pared');
  });

  test('cantidad de paneles es ceil(5 / 1.0) = 5', () => {
    expect(result.cant_paneles).toBe(5);
  });

  test('subtotal es mayor a 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('items tienen SKUs reales: perfil U, tornillos, remaches', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('ISD100EPS');   // Panel
    expect(skus).toContain('PU100MM');      // Perfil U
    expect(skus).toContain('TMOME');        // Tornillo
    expect(skus).toContain('ARATRAP');      // Arandela
    expect(skus).toContain('REMPOP');       // Remache POP
    expect(skus).toContain('C.But.');       // Cinta butilo
    expect(skus).toContain('Bromplast');    // Silicona
  });

  test('no incluye goteros ni canalon (es pared)', () => {
    const skus = result.items.map(i => i.sku);
    const goteroSkus = ['GFS30', 'GFS50', 'GL30', 'GL50', 'CD30', 'CD50', '6838', '6842'];
    for (const gs of goteroSkus) {
      expect(skus).not.toContain(gs);
    }
  });
});

describe('calcParedCompleto — estructura hormigon no incluye tornillos', () => {
  test('sin tornillos ni arandelas cuando estructura es hormigon', () => {
    const result = calcParedCompleto({
      familia: 'ISOWALL_PIR',
      espesor_mm: 50,
      ancho_m: 4,
      largo_m: 3,
      num_aberturas: 1,
      estructura: 'hormigon',
      lista_precios: 'venta',
    });
    const skus = result.items.map(i => i.sku);
    expect(skus).not.toContain('TMOME');
    expect(skus).not.toContain('ARATRAP');
  });
});

describe('calcParedCompleto — input por cant_paneles', () => {
  test('calcula ancho desde cant_paneles', () => {
    const result = calcParedCompleto({
      familia: 'ISOPANEL_EPS',
      espesor_mm: 100,
      cant_paneles: 8,
      largo_m: 3,
      estructura: 'metal',
      lista_precios: 'venta',
    });
    expect(result.cant_paneles).toBe(8);
    expect(result.ancho_m).toBe(8); // 8 * 1.0
    expect(result.subtotal).toBeGreaterThan(0);
  });
});
