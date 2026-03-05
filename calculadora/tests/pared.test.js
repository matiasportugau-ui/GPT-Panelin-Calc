'use strict';

const { calcParedCompleto } = require('../src/engines/pared');

describe('calcParedCompleto — ISOPANEL EPS 100mm 3×10m metal', () => {
  let result;

  beforeAll(() => {
    result = calcParedCompleto({
      familia: 'ISOPANEL_EPS',
      espesor_mm: 100,
      ancho_m: 3,
      largo_m: 10,
      num_aberturas: 0,
      estructura: 'metal',
      lista_precios: 'venta',
    });
  });

  test('tipo es pared', () => {
    expect(result.tipo).toBe('pared');
  });

  test('cant_paneles = ceil(3 / 1.0) = 3', () => {
    expect(result.cant_paneles).toBe(3);
  });

  test('subtotal > 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('panel SKU es ISD100EPS', () => {
    const panel = result.items.find(i => i.unidad === 'panel');
    expect(panel).toBeDefined();
    expect(panel.sku).toBe('ISD100EPS');
  });

  test('Perfil U PU100MM presente', () => {
    expect(result.items.find(i => i.sku === 'PU100MM')).toBeDefined();
  });

  test('fijaciones TMOME + ARATRAP para metal', () => {
    const skus = result.items.map(i => i.sku);
    expect(skus).toContain('TMOME');
    expect(skus).toContain('ARATRAP');
  });

  test('remaches RPOP presentes', () => {
    expect(result.items.find(i => i.sku === 'RPOP')).toBeDefined();
  });

  test('sellado: Bromplast presente', () => {
    expect(result.items.find(i => i.sku === 'Bromplast')).toBeDefined();
  });

  test('sin varilla roscada', () => {
    const desc = result.items.map(i => i.descripcion.toLowerCase());
    expect(desc.every(d => !d.includes('varilla'))).toBe(true);
  });
});

describe('calcParedCompleto — estructura hormigon sin TMOME', () => {
  test('estructura hormigon no incluye TMOME ni ARATRAP', () => {
    const result = calcParedCompleto({
      familia: 'ISOWALL_PIR',
      espesor_mm: 50,
      ancho_m: 4,
      largo_m: 3,
      estructura: 'hormigon',
    });
    const skus = result.items.map(i => i.sku);
    expect(skus).not.toContain('TMOME');
    expect(skus).not.toContain('ARATRAP');
  });
});

describe('calcParedCompleto — input por cant_paneles', () => {
  test('cant_paneles=5 ISOPANEL_EPS 100mm largo=3m funciona', () => {
    const result = calcParedCompleto({
      familia: 'ISOPANEL_EPS', espesor_mm: 100, cant_paneles: 5, largo_m: 3,
    });
    expect(result.tipo).toBe('pared');
    expect(result.cant_paneles).toBe(5);
    expect(result.subtotal).toBeGreaterThan(0);
  });
});
