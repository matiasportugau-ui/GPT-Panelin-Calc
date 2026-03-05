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

  test('items incluye paneles, varillas, tuercas, perfil borde, sellador', () => {
    const descripciones = result.items.map(i => i.descripcion);
    expect(descripciones.some(d => d.includes('Panel'))).toBe(true);
    expect(descripciones.some(d => d.includes('varilla') || d.includes('Varilla'))).toBe(true);
    expect(descripciones.some(d => d.includes('tuerca') || d.includes('Tuerca') || d.includes('set') || d.includes('Set'))).toBe(true);
    expect(descripciones.some(d => d.includes('borde') || d.includes('Borde') || d.includes('perímetro') || d.includes('Perfil'))).toBe(true);
    expect(descripciones.some(d => d.includes('ellador'))).toBe(true);
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
      lista_precios: 'web',
    });
  });

  test('devuelve tipo techo', () => {
    expect(result.tipo).toBe('techo');
  });

  test('items incluye caballete para ISOROOF', () => {
    const descripciones = result.items.map(i => i.descripcion);
    expect(descripciones.some(d => d.toLowerCase().includes('caballete'))).toBe(true);
  });

  test('items NO incluye varilla para ISOROOF', () => {
    const descripciones = result.items.map(i => i.descripcion);
    expect(descripciones.some(d => d.toLowerCase().includes('varilla'))).toBe(false);
  });
});
