import React, { useMemo, useState } from 'react';

/**
 * BMC API Quote Console (BMC-016)
 * Componente React para:
 * 1) calcular por API
 * 2) emitir cotización versionada por API
 */
export default function PanelinCalculadoraV4Api({ apiBaseUrl = 'http://localhost:3000' }) {
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', direccion: '' });
  const [input, setInput] = useState({
    escenario: 'solo_techo',
    familia: 'ISODEC_EPS',
    espesor_mm: 100,
    ancho_m: 5,
    largo_m: 11,
  });
  const [calculation, setCalculation] = useState(null);
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = useMemo(() => String(apiBaseUrl || '').replace(/\/+$/, ''), [apiBaseUrl]);

  async function postJson(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Error HTTP ${res.status}`);
    }
    return data;
  }

  async function calcular() {
    setError('');
    setLoading(true);
    try {
      const data = await postJson('/api/quotes/calculate', {
        client: cliente,
        technical_input: {
          ...input,
          espesor_mm: Number(input.espesor_mm),
          ancho_m: Number(input.ancho_m),
          largo_m: Number(input.largo_m),
        },
      });
      setCalculation(data.calculation_result);
      setIssue(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function emitir() {
    setError('');
    setLoading(true);
    try {
      let calc = calculation;
      if (!calc) {
        const data = await postJson('/api/quotes/calculate', {
          client: cliente,
          technical_input: {
            ...input,
            espesor_mm: Number(input.espesor_mm),
            ancho_m: Number(input.ancho_m),
            largo_m: Number(input.largo_m),
          },
        });
        calc = data.calculation_result;
        setCalculation(calc);
      }

      const data = await postJson('/api/quotes/issue', {
        client: cliente,
        calculation_result: calc,
        status_target: 'EMITIDA',
        issued_by: 'frontend-v4-api',
      });
      setIssue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: '2rem auto', padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: 8 }}>BMC Uruguay - Emision API</h2>
      <p style={{ color: '#555', marginTop: 0 }}>BMC-016: conexión frontend con /api/quotes/calculate y /api/quotes/issue</p>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Cliente</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input placeholder="Nombre" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} />
          <input placeholder="Teléfono" value={cliente.telefono} onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} />
          <input placeholder="Dirección" value={cliente.direccion} onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })} />
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Input técnico</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <select value={input.escenario} onChange={(e) => setInput({ ...input, escenario: e.target.value })}>
            <option value="solo_techo">solo_techo</option>
            <option value="solo_fachada">solo_fachada</option>
            <option value="techo_fachada">techo_fachada</option>
            <option value="camara_frigorifica">camara_frigorifica</option>
          </select>
          <input placeholder="Familia" value={input.familia} onChange={(e) => setInput({ ...input, familia: e.target.value })} />
          <input type="number" placeholder="Espesor mm" value={input.espesor_mm} onChange={(e) => setInput({ ...input, espesor_mm: e.target.value })} />
          <input type="number" placeholder="Ancho m" value={input.ancho_m} onChange={(e) => setInput({ ...input, ancho_m: e.target.value })} />
          <input type="number" placeholder="Largo m" value={input.largo_m} onChange={(e) => setInput({ ...input, largo_m: e.target.value })} />
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={calcular} disabled={loading}>Calcular API</button>
        <button onClick={emitir} disabled={loading}>Emitir API</button>
      </div>

      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}

      {calculation && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Resultado cálculo</h3>
          <p>Subtotal: <strong>USD {Number(calculation.subtotal || 0).toFixed(2)}</strong></p>
          <p>IVA 22%: <strong>USD {Number(calculation.iva_22 || 0).toFixed(2)}</strong></p>
          <p>Total: <strong>USD {Number(calculation.total || 0).toFixed(2)}</strong></p>
          <p>Líneas: <strong>{Array.isArray(calculation.lineas) ? calculation.lineas.length : 0}</strong></p>
        </section>
      )}

      {issue && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Emisión</h3>
          <p>Ref: <strong>{issue.quote_ref}</strong></p>
          <p>Versión: <strong>V{issue.version}</strong></p>
          <p>Estado: <strong>{issue.estado_cotizacion}</strong></p>
          {issue.links?.pdf_url && (
            <p>
              PDF: <a href={`${baseUrl}${issue.links.pdf_url}`} target="_blank" rel="noreferrer">{issue.links.pdf_url}</a>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
