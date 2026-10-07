import React, { useMemo, useState } from 'react';

/**
 * BMC AI Console
 * Frontend único para automatización con OpenAI, Gemini o Grok.
 */
export default function BmcAiConsole({
  apiBaseUrl = 'http://localhost:3000',
}) {
  const [provider, setProvider] = useState('openai');
  const [userMessage, setUserMessage] = useState('Emitir cotización para Joel Lima, escenario solo_techo, ISODEC_EPS 100mm, 5x11.');
  const [autoExecute, setAutoExecute] = useState(true);
  const [context, setContext] = useState({
    client: { nombre: 'Joel Lima', telefono: '94411114', direccion: 'Ruta 9' },
    technical_input: {
      escenario: 'solo_techo',
      familia: 'ISODEC_EPS',
      espesor_mm: 100,
      ancho_m: 5,
      largo_m: 11,
    },
  });

  const [promptText, setPromptText] = useState('');
  const [response, setResponse] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = useMemo(
    () => String(apiBaseUrl || '').replace(/\/+$/, ''),
    [apiBaseUrl]
  );

  async function loadPrompt() {
    setError('');
    setLoadingPrompt(true);
    try {
      const res = await fetch(`${baseUrl}/api/ai/prompt?provider=${encodeURIComponent(provider)}`);
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setPromptText(data.prompt || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPrompt(false);
    }
  }

  async function runAutomation() {
    setError('');
    setLoadingRun(true);
    setResponse(null);
    try {
      const res = await fetch(`${baseUrl}/api/ai/automate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          user_message: userMessage,
          auto_execute: autoExecute,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRun(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', fontFamily: 'Arial, sans-serif', padding: '1rem' }}>
      <h2 style={{ marginBottom: 8 }}>BMC AI Console (OpenAI / Gemini / Grok)</h2>
      <p style={{ marginTop: 0, color: '#555' }}>
        Front único para automatizar cálculo, emisión, versionado y seguimiento.
      </p>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Configuración</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 8, alignItems: 'center' }}>
          <label>Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="openai">openai</option>
            <option value="gemini">gemini</option>
            <option value="grok">grok</option>
          </select>
          <label>API base URL</label>
          <input value={baseUrl} readOnly />
          <label>Auto execute</label>
          <input type="checkbox" checked={autoExecute} onChange={(e) => setAutoExecute(e.target.checked)} />
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Solicitud</h3>
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          rows={4}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <p style={{ marginBottom: 6, color: '#555' }}>Context JSON</p>
        <textarea
          value={JSON.stringify(context, null, 2)}
          onChange={(e) => {
            try {
              const next = JSON.parse(e.target.value);
              setContext(next);
              setError('');
            } catch (_err) {
              // keep typing
            }
          }}
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={loadPrompt} disabled={loadingPrompt || loadingRun}>
            {loadingPrompt ? 'Cargando prompt...' : 'Load Prompt'}
          </button>
          <button onClick={runAutomation} disabled={loadingRun || loadingPrompt}>
            {loadingRun ? 'Automating...' : 'Run Automation'}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <strong style={{ color: '#b91c1c' }}>Error:</strong> {error}
        </section>
      )}

      {promptText && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Prompt generado</h3>
          <textarea value={promptText} readOnly rows={16} style={{ width: '100%', fontFamily: 'monospace' }} />
        </section>
      )}

      {response && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Resultado</h3>
          <p>
            Provider: <strong>{response.provider}</strong> | Model: <strong>{response.model}</strong>
          </p>
          <h4>AI Text</h4>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>
            {response.ai_text}
          </pre>
          <h4>Parsed Output</h4>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>
            {JSON.stringify(response.parsed_output, null, 2)}
          </pre>
          <h4>Execution</h4>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>
            {JSON.stringify(response.execution, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
