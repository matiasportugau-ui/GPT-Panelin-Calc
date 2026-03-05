# Proceso de Cotización — GPT Panelin v4.0

## Arquitectura v4.0: Separación de Responsabilidades

```
Usuario (ChatGPT)
       ↓
GPT Panelin v4.0 (Cerebro Conversacional)
  ✅ Extrae parámetros del lenguaje natural
  ✅ Conversa y asesora al cliente  
  ❌ NO calcula precios ni BOM
       ↓ GPT Action (REST API)
Calculadora BMC API (Motor Programático)
  ✅ Cálculos deterministas
  ✅ BOM completo
  ✅ Precios actualizados
  ✅ PDF
```

## Flujo Paso a Paso

### Paso 1: Extracción de Parámetros
El GPT identifica en la conversación:
```json
{
  "escenario": "solo_techo",
  "familia": "ISODEC_EPS",
  "espesor_mm": 100,
  "ancho_m": 5,
  "largo_m": 11,
  "lista_precios": "venta"
}
```

### Paso 2: Validación
Antes de llamar la API, verificar que estén presentes:
- escenario ✅
- familia ✅
- espesor_mm ✅
- ancho_m ✅
- largo_m ✅

### Paso 3: Llamada a la API
```
POST https://calculadora-bmc.vercel.app/api/cotizar
Content-Type: application/json

{ "escenario": "solo_techo", "familia": "ISODEC_EPS", ... }
```

### Paso 4: Interpretación del Resultado
La API devuelve:
```json
{
  "cotizacion_id": "uuid-...",
  "secciones": [...],
  "resumen": {
    "subtotal_sin_iva": 1250.00,
    "iva_22": 275.00,
    "total_con_iva": 1525.00,
    "moneda": "USD"
  },
  "warnings": []
}
```

### Paso 5: Presentación al Cliente
Ejemplo de respuesta conversacional:
> "Para tu techo ISODEC 100mm de 5×11m, el presupuesto es:
> - Subtotal (sin IVA): USD 1.250
> - IVA 22%: USD 275
> - **Total: USD 1.525**
> ¿Querés que te mande el PDF detallado?"

### Paso 6: PDF (opcional)
Si el cliente solicita PDF:
```
POST /api/pdf
{ "cotizacion_data": {...}, "cliente": { "nombre": "...", "celular": "...", "direccion": "..." } }
```

## Escenarios Disponibles

| Escenario | Descripción |
|-----------|-------------|
| `solo_techo` | Solo cubierta de techo |
| `solo_fachada` | Solo cerramiento de paredes |
| `techo_fachada` | Techo + fachada (obra completa) |
| `camara_frigorifica` | Cámara frigorífica (techo + 4 paredes) |

## IVA — Regla Unificada
- Precios unitarios: **SIEMPRE sin IVA**
- IVA 22%: aplicado **UNA SOLA VEZ al total final**
- La API gestiona este cálculo automáticamente
- Siempre mostrar el desglose: subtotal + IVA + total
