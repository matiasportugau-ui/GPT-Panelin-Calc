# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Node.js (Express) API for sandwich panel quotation calculations (BMC Uruguay). The only runnable service is the **Calculadora BMC API** in the `calculadora/` directory. No database, no secrets, no external services required.

### Running the API

- **Dev server:** `cd calculadora && npm run dev` (uses nodemon, port 3000)
- **Tests:** `cd calculadora && npm test` (Jest, 69 tests across 3 suites)
- **No linter** is configured (no ESLint/Prettier config files exist)

### Key endpoints

See `README.md` for full endpoint list. Quick test:

```
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/cotizar -H "Content-Type: application/json" \
  -d '{"escenario":"solo_techo","familia":"ISODEC_EPS","espesor_mm":100,"ancho_m":5,"largo_m":11,"lista_precios":"venta","tiene_cumbrera":false,"tiene_canalon":false}'
```

### Notes

- No environment variables or secrets are needed; the only optional env var is `PORT` (defaults to 3000).
- Data comes from `calculadora/src/data/catalog_real.csv` and `calculadora/src/data/precios.json` — no database.
- The `frontend/` directory contains a standalone React component that works independently and is not part of the dev server.
- The `gpt/` directory contains OpenAI GPT Builder configuration, not locally runnable.
