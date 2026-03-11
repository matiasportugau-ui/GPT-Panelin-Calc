'use strict';

function requireApiKey(key, provider) {
  if (!key) {
    throw new Error(`Falta API key para provider=${provider}`);
  }
}

async function callOpenAICompatible(opts) {
  const {
    endpoint,
    apiKey,
    model,
    systemPrompt,
    userMessage,
  } = opts;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Provider error ${res.status}`);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Respuesta vacia del provider');
  }
  return {
    model,
    content,
    raw: data,
  };
}

async function callGemini(opts) {
  const {
    endpointBase,
    apiKey,
    model,
    systemPrompt,
    userMessage,
  } = opts;

  const endpoint = `${endpointBase}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nUser request:\n${userMessage}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini error ${res.status}`);
  }
  const contentParts = data?.candidates?.[0]?.content?.parts || [];
  const content = contentParts.map((p) => p.text || '').join('\n').trim();
  if (!content) {
    throw new Error('Respuesta vacia de Gemini');
  }
  return {
    model,
    content,
    raw: data,
  };
}

function resolveProviderConfig(provider) {
  const p = String(provider || 'openai').toLowerCase();
  if (p === 'openai') {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      endpoint: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
      type: 'openai-compatible',
    };
  }
  if (p === 'grok' || p === 'xai') {
    return {
      provider: 'grok',
      apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY || '',
      model: process.env.GROK_MODEL || 'grok-2-latest',
      endpoint: process.env.GROK_API_ENDPOINT || process.env.XAI_API_ENDPOINT || 'https://api.x.ai/v1/chat/completions',
      type: 'openai-compatible',
    };
  }
  if (p === 'gemini') {
    return {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      endpointBase: process.env.GEMINI_API_ENDPOINT_BASE || 'https://generativelanguage.googleapis.com/v1beta/models',
      type: 'gemini-native',
    };
  }
  throw new Error(`Provider no soportado: ${provider}`);
}

async function runProviderCompletion({ provider, systemPrompt, userMessage }) {
  const cfg = resolveProviderConfig(provider);
  requireApiKey(cfg.apiKey, cfg.provider);

  if (cfg.type === 'openai-compatible') {
    const result = await callOpenAICompatible({
      endpoint: cfg.endpoint,
      apiKey: cfg.apiKey,
      model: cfg.model,
      systemPrompt,
      userMessage,
    });
    return { provider: cfg.provider, ...result };
  }

  const result = await callGemini({
    endpointBase: cfg.endpointBase,
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt,
    userMessage,
  });
  return { provider: cfg.provider, ...result };
}

module.exports = {
  runProviderCompletion,
  resolveProviderConfig,
};
