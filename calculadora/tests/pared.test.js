'use strict';

const { calcParedCompleto } = require('../src/engines/pared');

describe('calcParedCompleto — ISOPANEL EPS 100mm 3×10m (estructura metal)', () => {
  let result;

  beforeAll(() => {
    result = calcParedCompleto({
      familia: 'ISOPANEL_EPS',
      espesor_mm: 100,
      ancho_m: 3,
      largo_m: 10,
      estructura: 'metal',
      lista_precios: 'venta',
    });
  });

  test('devuelve tipo pared', () => {
    expect(result.tipo).toBe('pared');
  });

  test('cant_paneles es ceil(3 / 1.0) = 3', () => {
    expect(result.cant_paneles).toBe(3);
  });

  test('subtotal es mayor a 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('panel tiene SKU real ISD100EPS', () => {
    const panel = result.items.find(i => i.sku === 'ISD100EPS');
    expect(panel).toBeDefined();
    expect(panel.cantidad).toBe(3);
  });

  test('perfil U tiene SKU real PU100MM', () => {
    const item = result.items.find(i => i.sku === 'PU100MM');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('tornillos TMOME presentes para estructura metal', () => {
    const item = result.items.find(i => i.sku === 'TMOME');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('arandelas ARATRAP presentes', () => {
    const item = result.items.find(i => i.sku === 'ARATRAP');
    expect(item).toBeDefined();
  });

  test('remaches RPOP presentes', () => {
    const item = result.items.find(i => i.sku === 'RPOP');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('cinta butilo C.But. presente', () => {
    const item = result.items.find(i => i.sku === 'C.But.');
    expect(item).toBeDefined();
  });

  test('silicona Bromplast presente', () => {
    const item = result.items.find(i => i.sku === 'Bromplast');
    expect(item).toBeDefined();
  });

  test('NO incluye perfiles inventados (K2, G2)', () => {
    expect(result.items.find(i => i.descripcion && i.descripcion.includes('K2'))).toBeUndefined();
    expect(result.items.find(i => i.descripcion && i.descripcion.includes('G2'))).toBeUndefined();
  });
});

describe('calcParedCompleto — ISOPANEL EPS 100mm estructura hormigon', () => {
  test('NO incluye tornillos TMOME para estructura hormigon', () => {
    const result = calcParedCompleto({
      familia: 'ISOPANEL_EPS',
      espesor_mm: 100,
      ancho_m: 3,
      largo_m: 10,
      estructura: 'hormigon',
    });
    expect(result.items.find(i => i.sku === 'TMOME')).toBeUndefined();
    expect(result.items.find(i => i.sku === 'ARATRAP')).toBeUndefined();
  });
});

describe('calcParedCompleto — ISOFRIG PIR 40mm usa PU50MM', () => {
  test('perfil U SKU es PU50MM para 40mm ISOFRIG', () => {
    const result = calcParedCompleto({
      familia: 'ISOFRIG_PIR',
      espesor_mm: 40,
      ancho_m: 4,
      largo_m: 3,
      estructura: 'metal',
    });
    const item = result.items.find(i => i.sku === 'PU50MM');
    expect(item).toBeDefined();
  });
});

describe('calcParedCompleto — ISOFRIG PIR 60mm usa PU50MM', () => {
  test('perfil U SKU es PU50MM para 60mm ISOFRIG', () => {
    const result = calcParedCompleto({
      familia: 'ISOFRIG_PIR',
      espesor_mm: 60,
      ancho_m: 4,
      largo_m: 3,
      estructura: 'metal',
    });
    const item = result.items.find(i => i.sku === 'PU50MM');
    expect(item).toBeDefined();
  });
});

describe('calcParedCompleto — input por cant_paneles', () => {
  test('cant_paneles=5, largo_m=3, ISOWALL_PIR 80mm', () => {
    const result = calcParedCompleto({
      familia: 'ISOWALL_PIR',
      espesor_mm: 80,
      cant_paneles: 5,
      largo_m: 3,
    });
    expect(result.cant_paneles).toBe(5);
    expect(result.ancho_m).toBeCloseTo(5 * 1.00, 5);
    const panel = result.items.find(i => i.sku === 'IW80');
    expect(panel).toBeDefined();
    expect(panel.cantidad).toBe(5);
  });
});
