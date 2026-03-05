/**
 * PanelinCalculadoraV3 — Calculadora Panelin Standalone (v3)
 *
 * Componente React standalone con motores de cálculo programáticos para paneles Panelin.
 * Mantiene compatibilidad con la arquitectura v3.
 *
 * Para la arquitectura v4.0 con integración GPT, ver calculadora/ (API Express).
 *
 * @see /calculadora — Motor programático v4.0
 * @see /gpt — Configuración GPT Panelin v4.0
 * @see /docs/INTEGRATION.md — Flujo completo v4.0
 */

import React, { useState } from 'react';

// ─── Precios hardcoded v3 (fuente única en v4.0: calculadora/src/data/precios.json) ───
const PANELIN_PRECIOS_V3_UNIFICADO = {
  ISODEC_EPS: { 100: { venta: 25.0, web: 27.5 }, 150: { venta: 32.0, web: 35.0 }, 200: { venta: 40.0, web: 44.0 }, 250: { venta: 48.0, web: 53.0 } },
  ISOROOF_3G: { 30: { venta: 18.0, web: 20.0 }, 40: { venta: 21.0, web: 23.0 }, 50: { venta: 24.0, web: 26.5 }, 80: { venta: 30.0, web: 33.0 }, 100: { venta: 36.0, web: 39.5 } },
  ISOPANEL_EPS: { 50: { venta: 20.0, web: 22.0 }, 75: { venta: 24.0, web: 26.5 }, 100: { venta: 28.0, web: 31.0 } },
  ISOWALL_PIR: { 50: { venta: 26.0, web: 28.5 }, 80: { venta: 33.0, web: 36.0 }, 100: { venta: 40.0, web: 44.0 } },
};

const IVA_RATE = 0.22;

function PanelinCalculadoraV3() {
  const [familia, setFamilia] = useState('ISODEC_EPS');
  const [espesor, setEspesor] = useState('100');
  const [ancho, setAncho] = useState('');
  const [largo, setLargo] = useState('');
  const [lista, setLista] = useState('venta');
  const [resultado, setResultado] = useState(null);

  const familias = Object.keys(PANELIN_PRECIOS_V3_UNIFICADO);
  const espesores = familia ? Object.keys(PANELIN_PRECIOS_V3_UNIFICADO[familia]) : [];

  function calcular() {
    const anchoN = parseFloat(ancho);
    const largoN = parseFloat(largo);
    if (!anchoN || !largoN) return;
    const au_m = familia.startsWith('ISOROOF') || familia.startsWith('ISOPANEL') || familia.startsWith('ISOWALL') ? 1.0 : 1.12;
    const cantP = Math.ceil(anchoN / au_m);
    const area = cantP * au_m * largoN;
    const precioM2 = PANELIN_PRECIOS_V3_UNIFICADO[familia][espesor][lista];
    const subtotal = area * precioM2;
    const iva = subtotal * IVA_RATE;
    setResultado({ cantP, area: Math.round(area * 100) / 100, subtotal: Math.round(subtotal * 100) / 100, iva: Math.round(iva * 100) / 100, total: Math.round((subtotal + iva) * 100) / 100 });
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 480, margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2 style={{ color: '#1a3c5e' }}>Calculadora Panelin — BMC Uruguay</h2>
      <p style={{ fontSize: 12, color: '#666' }}>v3 Standalone — Para integración GPT ver <a href="https://bmcuruguay.com.uy">bmcuruguay.com.uy</a></p>

      <label>Familia:</label>
      <select value={familia} onChange={e => { setFamilia(e.target.value); setEspesor(Object.keys(PANELIN_PRECIOS_V3_UNIFICADO[e.target.value])[0]); }} style={{ display: 'block', width: '100%', marginBottom: 8 }}>
        {familias.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <label>Espesor (mm):</label>
      <select value={espesor} onChange={e => setEspesor(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8 }}>
        {espesores.map(e => <option key={e} value={e}>{e} mm</option>)}
      </select>

      <label>Ancho (m):</label>
      <input type="number" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="e.g. 5" style={{ display: 'block', width: '100%', marginBottom: 8 }} />

      <label>Largo (m):</label>
      <input type="number" value={largo} onChange={e => setLargo(e.target.value)} placeholder="e.g. 11" style={{ display: 'block', width: '100%', marginBottom: 8 }} />

      <label>Lista de precios:</label>
      <select value={lista} onChange={e => setLista(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 12 }}>
        <option value="venta">Venta</option>
        <option value="web">Web</option>
      </select>

      <button onClick={calcular} style={{ background: '#1a3c5e', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 4, cursor: 'pointer', width: '100%' }}>Calcular</button>

      {resultado && (
        <div style={{ marginTop: 16, background: '#f0f4f8', padding: '1rem', borderRadius: 6 }}>
          <h3>Resultado</h3>
          <p>Paneles: <strong>{resultado.cantP}</strong></p>
          <p>Área: <strong>{resultado.area} m²</strong></p>
          <p>Subtotal s/IVA: <strong>USD {resultado.subtotal}</strong></p>
          <p>IVA 22%: <strong>USD {resultado.iva}</strong></p>
          <p>Total c/IVA: <strong>USD {resultado.total}</strong></p>
          <p style={{ fontSize: 11, color: '#888' }}>* Solo paneles, no incluye accesorios. Usar API v4.0 para BOM completo.</p>
        </div>
      )}
    </div>
  );
}

export default PanelinCalculadoraV3;
