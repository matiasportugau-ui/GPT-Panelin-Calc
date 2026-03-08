# Pasos a Seguir — GPT Panelin v5.0

Guía ordenada para poner en producción el sistema completo desde cero.

---

## Paso 1 — Clonar y preparar el repositorio

```bash
git clone https://github.com/matiasportugau-ui/GPT-Panelin-Calc.git
cd GPT-Panelin-Calc

# Instalar dependencias de la API
cd calculadora/
npm install

# Verificar que los tests pasan
npm test
```

Resultado esperado:
```
Tests:  all passed
```

---

## Paso 2 — Probar la API en local

```bash
cd calculadora/
npm run dev   # Inicia en http://localhost:3000
```

Verificar que funciona:
```bash
# Health check
curl http://localhost:3000/health
# → { "status": "ok", "service": "calculadora-bmc", "version": "5.0.0" }

# Cotización de prueba
curl -X POST http://localhost:3000/api/cotizar \
  -H "Content-Type: application/json" \
  -d '{
    "escenario": "solo_techo",
    "familia": "ISODEC_EPS",
    "espesor_mm": 100,
    "ancho_m": 5,
    "largo_m": 11
  }'
# → { "ok": true, "cotizacion": { "resumen": { "total_con_iva": ... } } }

# PDF de prueba
curl -X POST http://localhost:3000/api/pdf \
  -H "Content-Type: application/json" \
  -d '{"cotizacion_data": { ... }, "cliente": {"nombre":"Test"}}' \
  --output prueba.pdf
```

---

## Paso 3 — Deployar la API en Vercel

### Prerequisitos
- Cuenta en [Vercel](https://vercel.com) (gratis para hobby/startup)
- Vercel CLI: `npm i -g vercel`

### Deploy

```bash
cd calculadora/
vercel --prod
```

Vercel detecta automáticamente el `vercel.json` y despliega la API.

La URL de producción tendrá el formato:
```
https://calculadora-five-sand.vercel.app
```
(o el nombre que elijas en el dashboard de Vercel)

### Verificar el deploy

```bash
curl https://TU-URL.vercel.app/health
# → { "status": "ok", "service": "calculadora-bmc", "version": "5.0.0" }
```

---

## Paso 4 — Actualizar la URL de la API en el esquema GPT

Editar `gpt/gpt_action_schema.yaml` y reemplazar la URL del servidor:

```yaml
# gpt/gpt_action_schema.yaml — línea 6
servers:
  - url: https://TU-URL.vercel.app   # ← Reemplazar con tu URL de Vercel
    description: Producción Vercel
```

También actualizar `gpt/Panelin_GPT_config_v5.json`:

```json
"calculadora_api": {
  "base_url": "https://TU-URL.vercel.app"
}
```

---

## Paso 5 — Configurar el GPT en OpenAI Builder

1. Ir a [https://platform.openai.com/gpts](https://platform.openai.com/gpts)
2. Crear nuevo GPT (o editar el existente si ya tenés uno)
3. En **Instructions**: pegar el contenido completo de `gpt/Panelin_GPT_config_v5.json`
4. En **Knowledge**: subir los dos archivos de `gpt/kb/`:
   - `PANELIN_TRAINING_GUIDE.md`
   - `PANELIN_QUOTATION_PROCESS.md`
5. En **Actions** → **Add action**:
   - Seleccionar "Import from URL" o pegar directamente el contenido de `gpt/gpt_action_schema.yaml`
   - Verificar que la URL en `servers.url` ya apunta a tu deploy de Vercel (Paso 4)
   - Guardar la acción
6. En **Capabilities**: activar "Code Interpreter" si se desea análisis adicional

---

## Paso 6 — Probar la integración completa (GPT → API)

En el preview del GPT Builder, probar estos comandos:

```
"Necesito cotizar un techo de ISODEC EPS 100mm, 5 metros de ancho por 11 de largo"
```

El GPT debe:
1. Extraer los parámetros
2. Llamar automáticamente `POST /api/cotizar` (visible en el panel de acciones)
3. Responder con el desglose: subtotal + IVA 22% + total

```
"¿Me podés mandar el PDF de esa cotización?"
```

El GPT debe llamar `POST /api/pdf` y devolver el archivo.

---

## Paso 7 — Publicar el GPT

1. En OpenAI Builder → **Save** → **Publish**
2. Opciones de visibilidad: "Only me" (privado) o "Anyone with the link"
3. Compartir el enlace del GPT con el equipo de ventas

---

## Paso 8 — Mantenimiento futuro

### Actualizar precios
Editar `calculadora/src/data/catalog_real.csv` (fuente única de precios y SKUs).
El archivo es procesado automáticamente por `catalog.js` al arrancar la API.

```csv
# Columnas relevantes en catalog_real.csv:
# sku(4), thickness_mm(6), sale_excl_vat(14), web_price_excl_vat(19)
```

Después del cambio, re-deployar la API:
```bash
cd calculadora/ && vercel --prod
```

### Agregar nuevas familias de paneles
1. Agregar filas correspondientes en `calculadora/src/data/catalog_real.csv`
2. Agregar en `calculadora/src/engines/autoportancia.js` (tabla de luces máximas)
3. Correr tests: `npm test`
4. Re-deployar en Vercel

### Agregar nuevos escenarios de cotización
1. Editar `calculadora/src/engines/bom.js` → agregar al switch de escenarios
2. Escribir un test en `calculadora/tests/`
3. Re-deployar

---

## Resumen Rápido

| Paso | Acción | Tiempo estimado |
|------|--------|-----------------|
| 1 | Instalar y testear local | 5 min |
| 2 | Probar API local | 5 min |
| 3 | Deploy en Vercel | 10 min |
| 4 | Actualizar URL en schema | 2 min |
| 5 | Configurar GPT Builder | 15 min |
| 6 | Probar integración GPT↔API | 10 min |
| 7 | Publicar GPT | 2 min |
| **Total** | | **~50 min** |

---

## Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| GPT no llama a la API | URL desactualizada en schema | Verificar `servers.url` en `gpt_action_schema.yaml` |
| `400 Bad Request` en `/api/cotizar` | Parámetros faltantes o inválidos | Verificar que `escenario`, `familia`, `espesor_mm`, `ancho_m`, `largo_m` estén presentes y sean números > 0 |
| Warning "luz supera máximo" | `largo_m` mayor que luz máxima para ese panel | Normal si hay apoyos intermedios: especificar `apoyos` en el request |
| PDF vacío o error | `cotizacion_data` mal formado | Usar el objeto `cotizacion` directamente desde la respuesta de `/api/cotizar` |
| Tests fallan localmente | `node_modules` desactualizado | `cd calculadora && npm install` |

---

## Sugerencia y plan de solución

Para evolucionar el sistema con el menor riesgo posible, la recomendación es priorizar mejoras de validación y robustez en la API antes de agregar nuevas capacidades.

### Prioridad 1 — Unificar validaciones de cotización
- Extraer la validación/coerción de `POST /api/cotizar` y `POST /api/pdf` a una única función compartida.
- Objetivo: evitar divergencias entre ambos endpoints y garantizar los mismos errores de entrada.
- Entregable sugerido:
  - helper reutilizable en `calculadora/src/api/routes.js`
  - tests de API para cubrir errores equivalentes en ambos endpoints

### Prioridad 2 — Validar compatibilidad entre ancho y modulación real
- Cuando el usuario envía `ancho_m`, validar o informar explícitamente la diferencia entre el ancho pedido y el ancho real cotizado según `au_m`.
- Objetivo: evitar cotizaciones que redondeen paneles sin dejar visible el excedente.
- Entregable sugerido:
  - warning técnico en la respuesta JSON
  - tests de integración para casos con redondeo

### Prioridad 3 — Hacer explícitos los faltantes de accesorios/SKUs
- Si una familia o accesorio no tiene SKU/precio resuelto en catálogo, devolver warning claro o error controlado en vez de omitirlo silenciosamente.
- Objetivo: asegurar BOMs completos y evitar PDFs con faltantes no visibles.
- Entregable sugerido:
  - validación en `catalog.js` o en los engines `techo.js` / `pared.js`
  - tests que cubran familias con accesorios opcionales o no disponibles

### Prioridad 4 — Mejorar resiliencia de generación de PDF
- Mantener la opción de `cotizacion_data` como camino principal y reducir la dependencia del cache en memoria para flujos críticos.
- Objetivo: evitar errores por reinicios o expiración implícita en entornos serverless.
- Entregable sugerido:
  - documentar que `cotizacion_data` es la opción recomendada
  - considerar persistencia externa solo si el negocio realmente necesita regeneración diferida por `cotizacion_id`

### Plan de implementación recomendado
1. **Fase 1: validación**
   - refactor mínimo de parsing/validación
   - tests de API dirigidos
2. **Fase 2: warnings técnicos**
   - ancho real vs ancho pedido
   - accesorios faltantes
3. **Fase 3: robustez operativa**
   - mejora de flujo de PDF/cache
   - documentación de integración

### Criterio de éxito
- Mismos inputs inválidos producen respuestas consistentes en `/api/cotizar` y `/api/pdf`
- La cotización informa cuando el ancho real difiere del solicitado
- No se omiten accesorios críticos sin aviso explícito
- El flujo recomendado de PDF queda documentado y probado
