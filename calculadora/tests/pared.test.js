'use strict';

const { calcParedCompleto } = require('../src/engines/pared');

describe('calcParedCompleto — ISOPANEL EPS 50mm 3x10m', () => {
  let result;

  beforeAll(() => {
    result = calcParedCompleto({
      familia: 'ISOPANEL_EPS',
      espesor_mm: 50,
      ancho_m: 3,
      largo_m: 10,
      num_aberturas: 0,
      estructura: 'metal',
      lista_precios: 'venta',
    });
  });

  test('devuelve tipo pared', () => {
    expect(result.tipo).toBe('pared');
  });

  test('cantidad de paneles es ceil(3 / 1.0) = 3', () => {
    expect(result.cant_paneles).toBe(3);
  });

  test('subtotal es mayor a 0', () => {
    expect(result.subtotal).toBeGreaterThan(0);
  });

  test('items incluye paneles, perfil U, kit anclaje, tornillo T2, remache', () => {
    const descripciones = result.items.map(i => i.descripcion);
    expect(descripciones.some(d => d.includes('Panel'))).toBe(true);
    expect(descripciones.some(d => d.includes('Perfil U') || d.includes('solera'))).toBe(true);
    expect(descripciones.some(d => d.includes('anclaje') || d.includes('Anclaje'))).toBe(true);
    expect(descripciones.some(d => d.includes('Tornillo') || d.includes('T2'))).toBe(true);
    expect(descripciones.some(d => d.includes('Remache') || d.includes('POP'))).toBe(true);
  });

  test('no incluye varilla roscada (solo techo)', () => {
    const descripciones = result.items.map(i => i.descripcion);
    expect(descripciones.some(d => d.toLowerCase().includes('varilla'))).toBe(false);
  });
});

describe('calcParedCompleto — estructura hormigon no incluye tornillo T2', () => {
  test('sin tornillo T2 cuando estructura es hormigon', () => {
    const result = calcParedCompleto({
      familia: 'ISOWALL_PIR',
      espesor_mm: 50,
      ancho_m: 4,
      largo_m: 3,
      num_aberturas: 1,
      estructura: 'hormigon',
      lista_precios: 'venta',
    });
    const descripciones = result.items.map(i => i.descripcion);
    expect(descripciones.some(d => d.toLowerCase().includes('tornillo') || d.includes('T2'))).toBe(false);
  });
});
