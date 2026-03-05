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

  test('devuelve tipo techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('cant_paneles es ceil(5 / 1.12) = 5', () => {
    expect(result.cant_paneles).toBe(Math.ceil(5 / 1.12));
  });

  test('subtotal es mayor a 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('panel tiene SKU real ISODEC_EPS_100', () => {
    const panel = result.items.find(i => i.sku === 'ISODEC_EPS_100');
    expect(panel).toBeDefined();
    expect(panel.cantidad).toBe(Math.ceil(5 / 1.12));
  });

  test('gotero frontal tiene SKU real 6838', () => {
    const item = result.items.find(i => i.sku === '6838');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('gotero lateral tiene SKU real 6842', () => {
    const item = result.items.find(i => i.sku === '6842');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('gotero superior/babeta tiene SKU real 6828', () => {
    const item = result.items.find(i => i.sku === '6828');
    expect(item).toBeDefined();
  });

  test('varilla roscada VARILLA38 presente (sist. varilla_tuerca)', () => {
    const item = result.items.find(i => i.sku === 'VARILLA38');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('arandela carrocero ARCA38 presente (sist. varilla_tuerca)', () => {
    const item = result.items.find(i => i.sku === 'ARCA38');
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

  test('area_m2 es correcto', () => {
    const cantP = Math.ceil(5 / 1.12);
    const expected = Math.round(cantP * 1.12 * 11 * 100) / 100;
    expect(result.area_m2).toBe(expected);
  });

  test('NO incluye canalón por defecto (tiene_canalon=false)', () => {
    expect(result.items.find(i => i.sku === '6801')).toBeUndefined();
  });
});

describe('calcTechoCompleto — ISODEC EPS 100mm con canalón y cumbrera', () => {
  let result;

  beforeAll(() => {
    result = calcTechoCompleto({
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 5,
      largo_m: 11,
      tiene_canalon: true,
      tiene_cumbrera: true,
    });
  });

  test('incluye canalón SKU 6801 cuando tiene_canalon=true', () => {
    const item = result.items.find(i => i.sku === '6801');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('incluye soporte canalón SKU 6805', () => {
    const item = result.items.find(i => i.sku === '6805');
    expect(item).toBeDefined();
  });

  test('incluye cumbrera SKU 6847 cuando tiene_cumbrera=true', () => {
    const item = result.items.find(i => i.sku === '6847');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
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

  test('devuelve tipo techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('panel SKU real es IROOF50', () => {
    const panel = result.items.find(i => i.sku === 'IROOF50');
    expect(panel).toBeDefined();
  });

  test('gotero frontal SKU es GFS50', () => {
    const item = result.items.find(i => i.sku === 'GFS50');
    expect(item).toBeDefined();
  });

  test('gotero superior SKU es GFSUP50', () => {
    const item = result.items.find(i => i.sku === 'GFSUP50');
    expect(item).toBeDefined();
  });

  test('gotero lateral SKU es GL50', () => {
    const item = result.items.find(i => i.sku === 'GL50');
    expect(item).toBeDefined();
  });

  test('incluye caballete (sist. caballete_tornillo de ISOROOF)', () => {
    const item = result.items.find(i => i.sku === 'CABALLETE');
    expect(item).toBeDefined();
    expect(item.cantidad).toBeGreaterThan(0);
  });

  test('NO incluye varilla roscada inventada', () => {
    const item = result.items.find(i => i.descripcion && i.descripcion.toLowerCase().includes('varilla'));
    expect(item).toBeUndefined();
  });
});

describe('calcTechoCompleto — input por cant_paneles', () => {
  test('cant_paneles=10, largo_m=4.5, ISOROOF_3G 50mm', () => {
    const result = calcTechoCompleto({
      familia: 'ISOROOF_3G',
      espesor_mm: 50,
      cant_paneles: 10,
      largo_m: 4.5,
    });
    expect(result.cant_paneles).toBe(10);
    expect(result.ancho_m).toBeCloseTo(10 * 1.10, 5);
    expect(result.area_m2).toBeGreaterThan(0);
    const panel = result.items.find(i => i.sku === 'IROOF50');
    expect(panel).toBeDefined();
    expect(panel.cantidad).toBe(10);
  });
});

describe('addItem — NaN / invalid cantidad guard', () => {
  // Access the internal addItem by testing its effect through calcTechoCompleto
  // with inputs that would produce NaN quantities for accessories if not guarded.
  test('ningún item tiene subtotal NaN cuando los inputs son válidos', () => {
    const result = calcTechoCompleto({
      familia: 'ISOROOF_3G',
      espesor_mm: 50,
      ancho_m: 4,
      largo_m: 8,
    });
    result.items.forEach(item => {
      expect(Number.isFinite(item.subtotal)).toBe(true);
      expect(Number.isFinite(item.cantidad)).toBe(true);
    });
  });

  test('ningún item tiene subtotal NaN con canalón y cumbrera', () => {
    const result = calcTechoCompleto({
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 6,
      largo_m: 10,
      tiene_canalon: true,
      tiene_cumbrera: true,
    });
    result.items.forEach(item => {
      expect(Number.isFinite(item.subtotal)).toBe(true);
      expect(Number.isFinite(item.cantidad)).toBe(true);
    });
  });
});
