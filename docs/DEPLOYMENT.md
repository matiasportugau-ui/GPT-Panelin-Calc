# Guía de Deploy — GPT Panelin v4.0

## 1. Calculadora API en Vercel

### Pre-requisitos
- Cuenta Vercel (https://vercel.com)
- Node.js 18+
- Vercel CLI: `npm i -g vercel`

### Deploy

```bash
cd calculadora/
npm install
vercel --prod
```

Vercel detectará automáticamente `vercel.json` y desplegará la API.
La URL de producción será algo como: `https://calculadora-bmc.vercel.app`

### Variables de entorno (opcional)
```
PORT=3000  # Solo para desarrollo local
```

### Verificación
```bash
curl https://calculadora-bmc.vercel.app/health
# { "status": "ok", "service": "calculadora-bmc", "version": "4.0.0" }

curl -X POST https://calculadora-bmc.vercel.app/api/cotizar \
  -H "Content-Type: application/json" \
  -d '{"escenario":"solo_techo","familia":"ISODEC_EPS","espesor_mm":100,"ancho_m":5,"largo_m":11}'
```

## 2. GPT Action en OpenAI Builder

### Pasos
1. Ir a https://platform.openai.com/gpts
2. Crear nuevo GPT o editar el existente
3. En **Instructions**: pegar contenido de `gpt/Panelin_GPT_config_v4.json`
4. En **Actions** → **Add Action**:
   - Pegar contenido de `gpt/gpt_action_schema.yaml`
   - Verificar que `servers.url` apunte a tu URL de Vercel
5. En **Knowledge**: subir archivos de `gpt/kb/`

### Actualizar URL de la API
En `gpt/gpt_action_schema.yaml`, reemplazar:
```yaml
servers:
  - url: https://calculadora-bmc.vercel.app  # ← Tu URL de Vercel
```

## 3. Desarrollo Local

### API Backend
```bash
cd calculadora/
npm install
npm run dev   # nodemon en puerto 3000
```

### Tests
```bash
cd calculadora/
npm test
```

### Frontend Standalone
```bash
# Copiar PanelinCalculadoraV3.jsx a tu proyecto React
# No requiere backend
```

## 4. Docker (opcional)

```bash
cd calculadora/
docker build -t calculadora-bmc .
docker run -p 3000:3000 calculadora-bmc
```

## 5. Health Check Endpoint

```
GET /health → { "status": "ok", "service": "calculadora-bmc", "version": "4.0.0" }
```
