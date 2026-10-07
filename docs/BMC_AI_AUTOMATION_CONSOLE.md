# BMC AI Automation Console (OpenAI / Gemini / Grok)

## Objetivo

Disponer de un front único para automatización comercial con múltiples LLM providers, reutilizando los endpoints de emisión/versionado ya implementados.

## Componentes entregados

## Backend

- `calculadora/src/ai/prompt.js` (prompt universal dinámico)
- `calculadora/src/ai/parser.js` (parse de bloque JSON)
- `calculadora/src/ai/providers.js` (conectores OpenAI/Gemini/Grok)
- `calculadora/src/ai/automation.js` (auto-ejecución sobre quotes service)
- rutas nuevas en `calculadora/src/api/routes.js`:
  - `GET /api/ai/prompt?provider=openai|gemini|grok`
  - `POST /api/ai/automate`

## Frontend

- `frontend/BmcAiConsole.jsx`

## Flujo de uso

1. Elegir provider (`openai`, `gemini`, `grok`).
2. Escribir solicitud comercial.
3. Cargar prompt generado (`Load Prompt`).
4. Ejecutar automatización (`Run Automation`).
5. Revisar:
   - texto AI (`ai_text`)
   - JSON parseado (`parsed_output`)
   - ejecución backend (`execution`) si `auto_execute=true`

## Variables de entorno

### OpenAI

- `OPENAI_API_KEY`
- opcional `OPENAI_MODEL` (default `gpt-4.1-mini`)
- opcional `OPENAI_API_ENDPOINT`

### Gemini

- `GEMINI_API_KEY`
- opcional `GEMINI_MODEL` (default `gemini-1.5-pro`)
- opcional `GEMINI_API_ENDPOINT_BASE`

### Grok/xAI

- `GROK_API_KEY` o `XAI_API_KEY`
- opcional `GROK_MODEL` (default `grok-2-latest`)
- opcional `GROK_API_ENDPOINT` o `XAI_API_ENDPOINT`

## Ejemplo de request a /api/ai/automate

```json
{
  "provider": "openai",
  "user_message": "Emitir cotización para Joel Lima, solo_techo ISODEC_EPS 100mm 5x11.",
  "auto_execute": true,
  "context": {
    "client": {
      "nombre": "Joel Lima",
      "telefono": "94411114",
      "direccion": "Ruta 9"
    },
    "technical_input": {
      "escenario": "solo_techo",
      "familia": "ISODEC_EPS",
      "espesor_mm": 100,
      "ancho_m": 5,
      "largo_m": 11
    }
  }
}
```

## Nota operativa

Si no hay API key configurada para el provider seleccionado, `POST /api/ai/automate` responde error de configuración.  
La consola sigue siendo útil para generar/copiar prompt con `GET /api/ai/prompt`.
