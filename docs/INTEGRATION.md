# Guía de Integración — GPT Panelin v5.0

## Diagrama de Secuencia Completo

```
┌──────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│   Usuario    │         │  GPT Panelin v5.0     │         │  Calculadora BMC    │
│  (ChatGPT)   │         │  (Cerebro Conversac.) │         │  API (Programática) │
└──────┬───────┘         └──────────┬───────────┘         └──────────┬──────────┘
       │                            │                                 │
       │  "Cotización ISODEC        │                                 │
       │   100mm, techo 5x11m"      │                                 │
       │──────────────────────────→ │                                 │
       │                            │                                 │
       │                            │ Extrae parámetros (NLP):        │
       │                            │ { escenario: "solo_techo",      │
       │                            │   familia: "ISODEC_EPS",        │
       │                            │   espesor_mm: 100,              │
       │                            │   ancho_m: 5, largo_m: 11 }     │
       │                            │                                 │
       │                            │  POST /api/cotizar              │
       │                            │────────────────────────────────→│
       │                            │                                 │
       │                            │                                 │ calcTechoCompleto()
       │                            │                                 │ → BOM determinista
       │                            │                                 │ → Precios desde JSON
       │                            │                                 │ → IVA 22%
       │                            │                                 │
       │                            │  { cotizacion_id, secciones,   │
       │                            │    resumen: { subtotal,iva,     │
       │                            │    total }, warnings }          │
       │                            │ ←──────────────────────────────│
       │                            │                                 │
       │                            │ Interpreta JSON →               │
       │                            │ respuesta conversacional        │
       │                            │                                 │
       │  "Para tu techo ISODEC     │                                 │
       │   100mm 5×11m:             │                                 │
       │   Subtotal: USD 1.250      │                                 │
       │   IVA 22%:  USD 275        │                                 │
       │   Total:    USD 1.525      │                                 │
       │   ¿Querés el PDF?"         │                                 │
       │ ←──────────────────────────│                                 │
       │                            │                                 │
       │  "Sí, mandame el PDF"      │                                 │
       │──────────────────────────→ │                                 │
       │                            │  POST /api/pdf                  │
       │                            │  { cotizacion_data, cliente }   │
       │                            │────────────────────────────────→│
       │                            │                                 │
       │                            │  Buffer PDF                     │
       │                            │ ←──────────────────────────────│
       │                            │                                 │
       │  [Enlace de descarga PDF]  │                                 │
       │ ←──────────────────────────│                                 │
└──────┴───────┘         └──────────┴───────────┘         └──────────┴──────────┘
```

## Endpoints de la API

### POST /api/cotizar
Genera una cotización completa con BOM, precios e IVA.

**Request:**
```json
{
  "escenario": "solo_techo",
  "familia": "ISODEC_EPS",
  "espesor_mm": 100,
  "ancho_m": 5,
  "largo_m": 11,
  "lista_precios": "venta",
  "apoyos": 0,
  "tiene_cumbrera": false,
  "tiene_canalon": false
}
```

> Alternativamente, usar `cant_paneles` en lugar de `ancho_m` cuando el cliente especifica una cantidad de paneles. Parámetros adicionales: `num_aberturas` (aberturas en fachada), `estructura` (`metal`|`hormigon`|`mixto`), `envio_usd`.

**Response:**
```json
{
  "ok": true,
  "cotizacion": {
    "cotizacion_id": "uuid-...",
    "fecha": "2024-01-15",
    "escenario": "solo_techo",
    "secciones": [{
      "tipo": "techo",
      "cant_paneles": 5,
      "area_m2": 61.6,
      "items": [...],
      "subtotal": 1250.00
    }],
    "resumen": {
      "subtotal_sin_iva": 1250.00,
      "iva_22": 275.00,
      "total_con_iva": 1525.00,
      "moneda": "USD"
    },
    "warnings": [],
    "nota": "Precios en USD sin IVA. IVA 22% incluido en total_con_iva."
}
```

### POST /api/pdf
Genera PDF descargable de una cotización.

**Request:**
```json
{
  "cotizacion_data": { /* objeto cotización */ },
  "cliente": {
    "nombre": "Juan Pérez",
    "celular": "099123456",
    "direccion": "Ruta 9 km 105, Maldonado"
  }
}
```

**Response:** Binary PDF (application/pdf)

### GET /api/productos
Lista el catálogo de familias y espesores disponibles.

### GET /api/autoportancia
Valida la luz máxima para una combinación familia/espesor.

**Query params:** `?familia=ISODEC_EPS&espesor=100&luz=4.5`

## Escenarios Disponibles

| Escenario | Secciones calculadas |
|-----------|---------------------|
| `solo_techo` | 1 sección techo |
| `solo_fachada` | 1 sección pared |
| `techo_fachada` | 2 secciones (techo + pared) |
| `camara_frigorifica` | 3 secciones (techo + frontal/posterior + lateral) |

## Reglas de Negocio

- **Moneda**: USD
- **IVA**: 22% SIN incluir en precios unitarios — aplicar al total final
- **`Math.ceil()`** para TODAS las cantidades
- **Envío referencia**: 280 USD
- **Pendiente mínima techo**: 7%
- **Empresa**: METALOG SAS, RUT 120403630012, Maldonado, Uruguay
